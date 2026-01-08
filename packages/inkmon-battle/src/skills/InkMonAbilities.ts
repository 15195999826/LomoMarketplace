/**
 * InkMon Ability Definitions
 *
 * 使用框架 Ability 系统实现的技能和行动配置。
 * 包括移动、普通攻击、技能攻击等。
 *
 * ## 设计说明
 *
 * - **移动**：使用 ActivateInstanceComponent（无条件/消耗）
 * - **技能**：使用 ActiveUseComponent（带冷却条件和消耗）
 *
 * ## 事件类型
 *
 * 使用框架标准的 AbilityActivateEvent，扩展 InkMon 特定字段
 */

import {
  type AbilityConfig,
  type ActorRef,
  type ExecutionContext,
  type AbilityActivateEvent,
  ABILITY_ACTIVATE_EVENT,
  ActivateInstanceComponent,
  ActiveUseComponent,
  getCurrentEvent,
  defaultTargetSelector,
} from '@lomo/logic-game-framework';

import type { AxialCoord } from '@lomo/hex-grid';
import type { Element } from '@inkmon/core';

import { DamageAction } from '../actions/DamageAction.js';
import { HealAction } from '../actions/HealAction.js';
import { MoveAction } from '../actions/MoveAction.js';
import { CooldownReadyCondition, CooldownCost } from './CooldownSystem.js';
import { TIMELINE_ID } from './InkMonTimelines.js';

// ============================================================
// 目标选择器
// ============================================================

/**
 * 从 ability 获取 owner
 */
const abilityOwnerSelector = (ctx: ExecutionContext): ActorRef[] => {
  return ctx.ability ? [ctx.ability.owner] : [];
};

// ============================================================
// 行动事件定义（扩展标准 AbilityActivateEvent）
// ============================================================

/**
 * 行动使用事件
 *
 * 扩展框架标准的 AbilityActivateEvent，添加 InkMon 特定字段。
 *
 * ## 目标选择
 *
 * 支持两种目标选择方式：
 * 1. **直接目标** (`target`) - 选择具体的 Actor，用于单体技能
 * 2. **坐标目标** (`targetCoord`) - 选择格子坐标，用于移动、范围技能等
 */
export type ActionUseEvent = AbilityActivateEvent & {
  /** 目标 Actor（单体技能用） */
  readonly target?: ActorRef;
  /** 目标坐标（移动/范围技能用） */
  readonly targetCoord?: AxialCoord;
  /** 技能属性（攻击技能用） */
  readonly element?: Element;
  /** 技能威力（攻击技能用） */
  readonly power?: number;
  /** 伤害类型 */
  readonly damageCategory?: 'physical' | 'special';
};

/**
 * 创建行动使用事件
 */
export function createActionUseEvent(
  abilityInstanceId: string,
  sourceId: string,
  options?: {
    target?: ActorRef;
    targetCoord?: AxialCoord;
    element?: Element;
    power?: number;
    damageCategory?: 'physical' | 'special';
  }
): ActionUseEvent {
  return {
    kind: ABILITY_ACTIVATE_EVENT,
    abilityInstanceId,
    sourceId,
    target: options?.target,
    targetCoord: options?.targetCoord,
    element: options?.element,
    power: options?.power,
    damageCategory: options?.damageCategory,
  };
}

// ============================================================
// 技能冷却配置（毫秒）
// ============================================================

/** 默认普通攻击冷却时间 */
const BASIC_ATTACK_COOLDOWN = 1000;

/** 默认技能冷却时间 */
const DEFAULT_SKILL_COOLDOWN = 3000;

// ============================================================
// 移动 Ability（无冷却）
// ============================================================

/**
 * 移动 - 移动到相邻格子
 *
 * 使用 ActivateInstanceComponent，需要显式指定 triggers。
 */
export const MOVE_ABILITY: AbilityConfig = {
  configId: 'action_move',
  displayName: '移动',
  description: '移动到相邻格子',
  tags: ['action', 'move'],
  components: [
    () =>
      new ActivateInstanceComponent({
        triggers: [
          {
            eventKind: ABILITY_ACTIVATE_EVENT,
            filter: (event, ctx) =>
              (event as ActionUseEvent).abilityInstanceId === ctx.ability.id,
          },
        ],
        timelineId: TIMELINE_ID.MOVE,
        tagActions: {
          execute: [
            new MoveAction({
              targetSelector: abilityOwnerSelector,
              targetCoord: (ctx) =>
                (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
            }),
          ],
        },
      }),
  ],
};

// ============================================================
// 普通攻击 Ability（短冷却）
// ============================================================

/**
 * 普通攻击 - 基础近战攻击
 *
 * 冷却: 1秒
 * 使用攻击者的主属性
 */
export const BASIC_ATTACK_ABILITY: AbilityConfig = {
  configId: 'skill_basic_attack',
  displayName: '普通攻击',
  description: '对目标造成基础伤害',
  tags: ['skill', 'active', 'melee', 'enemy'],
  activeUseComponents: [
    () =>
      new ActiveUseComponent({
        conditions: [new CooldownReadyCondition()],
        costs: [new CooldownCost(BASIC_ATTACK_COOLDOWN)],
        timelineId: TIMELINE_ID.BASIC_ATTACK,
        tagActions: {
          hit: [
            new DamageAction({
              targetSelector: defaultTargetSelector,
              damage: (ctx) =>
                (getCurrentEvent(ctx) as ActionUseEvent).power ?? 40,
              element: (ctx) => {
                const event = getCurrentEvent(ctx) as ActionUseEvent;
                // 默认使用 fire，实际使用时应通过事件传递正确的元素
                return event.element ?? 'fire';
              },
              damageCategory: (ctx) =>
                (getCurrentEvent(ctx) as ActionUseEvent).damageCategory ??
                'physical',
            }),
          ],
        },
      }),
  ],
};

// ============================================================
// 技能 Ability（带冷却）
// ============================================================

/**
 * 物理技能模板
 *
 * 使用物理攻击/物理防御计算伤害
 */
export const PHYSICAL_SKILL_ABILITY: AbilityConfig = {
  configId: 'skill_physical',
  displayName: '物理技能',
  description: '近战物理攻击技能',
  tags: ['skill', 'active', 'melee', 'enemy', 'physical'],
  activeUseComponents: [
    () =>
      new ActiveUseComponent({
        conditions: [new CooldownReadyCondition()],
        costs: [new CooldownCost(DEFAULT_SKILL_COOLDOWN)],
        timelineId: TIMELINE_ID.PHYSICAL,
        tagActions: {
          hit: [
            new DamageAction({
              targetSelector: defaultTargetSelector,
              damage: (ctx) =>
                (getCurrentEvent(ctx) as ActionUseEvent).power ?? 60,
              element: (ctx) => {
                const event = getCurrentEvent(ctx) as ActionUseEvent;
                return event.element ?? 'fire';
              },
              damageCategory: 'physical',
            }),
          ],
        },
      }),
  ],
};

/**
 * 特殊技能模板
 *
 * 使用特殊攻击/特殊防御计算伤害
 */
export const SPECIAL_SKILL_ABILITY: AbilityConfig = {
  configId: 'skill_special',
  displayName: '特殊技能',
  description: '远程特殊攻击技能',
  tags: ['skill', 'active', 'ranged', 'enemy', 'special'],
  activeUseComponents: [
    () =>
      new ActiveUseComponent({
        conditions: [new CooldownReadyCondition()],
        costs: [new CooldownCost(DEFAULT_SKILL_COOLDOWN)],
        timelineId: TIMELINE_ID.SPECIAL,
        tagActions: {
          hit: [
            new DamageAction({
              targetSelector: defaultTargetSelector,
              damage: (ctx) =>
                (getCurrentEvent(ctx) as ActionUseEvent).power ?? 70,
              element: (ctx) => {
                const event = getCurrentEvent(ctx) as ActionUseEvent;
                return event.element ?? 'fire';
              },
              damageCategory: 'special',
            }),
          ],
        },
      }),
  ],
};

/**
 * 治疗技能
 */
export const HEAL_SKILL_ABILITY: AbilityConfig = {
  configId: 'skill_heal',
  displayName: '治疗',
  description: '恢复友方单位生命值',
  tags: ['skill', 'active', 'heal', 'ally'],
  activeUseComponents: [
    () =>
      new ActiveUseComponent({
        conditions: [new CooldownReadyCondition()],
        costs: [new CooldownCost(DEFAULT_SKILL_COOLDOWN)],
        timelineId: TIMELINE_ID.HEAL,
        tagActions: {
          heal: [
            new HealAction({
              targetSelector: defaultTargetSelector,
              healAmount: 40,
            }),
          ],
        },
      }),
  ],
};

// ============================================================
// Ability ID 常量
// ============================================================

/** Ability configId 常量 */
export const ABILITY_CONFIG_ID = {
  MOVE: 'action_move',
  BASIC_ATTACK: 'skill_basic_attack',
  PHYSICAL_SKILL: 'skill_physical',
  SPECIAL_SKILL: 'skill_special',
  HEAL: 'skill_heal',
} as const;

// ============================================================
// 导出
// ============================================================

/**
 * 所有基础 Ability 配置
 */
export const INKMON_BASE_ABILITIES: AbilityConfig[] = [
  MOVE_ABILITY,
  BASIC_ATTACK_ABILITY,
  PHYSICAL_SKILL_ABILITY,
  SPECIAL_SKILL_ABILITY,
  HEAL_SKILL_ABILITY,
];

/**
 * 获取默认战斗 Ability 列表
 *
 * 每个 InkMon 战斗单位默认拥有的 Ability：
 * - 移动
 * - 普通攻击
 */
export function getDefaultBattleAbilities(): AbilityConfig[] {
  return [MOVE_ABILITY, BASIC_ATTACK_ABILITY];
}
