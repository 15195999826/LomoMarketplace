/**
 * Ability 定义
 *
 * 使用框架 Ability 系统实现的技能和行动配置。
 * 包括移动、攻击技能、治疗技能等。
 */

import {
  type AbilityConfig,
  type GameEventBase,
  type ActorRef,
  type ExecutionContext,
  ActivateInstanceComponent,
  getCurrentEvent,
} from '@lomo/logic-game-framework';

import type { AxialCoord } from '@lomo/hex-grid';

import { DamageAction } from '../actions/DamageAction.js';
import { HealAction } from '../actions/HealAction.js';
import { MoveAction } from '../actions/MoveAction.js';

import type { SkillType } from '../config/SkillConfig.js';

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
// 行动事件定义
// ============================================================

/**
 * 行动使用事件类型常量
 */
export const ACTION_USE_EVENT = 'actionUse' as const;

/**
 * 行动使用事件
 *
 * ATB 系统决定角色行动后，创建此事件触发 Ability 执行。
 * 移动和技能都通过此事件触发。
 *
 * ## 目标选择
 *
 * 支持两种目标选择方式：
 * 1. **直接目标** (`target`) - 选择具体的 Actor，用于单体技能
 * 2. **坐标目标** (`targetCoord`) - 选择格子坐标，用于移动、范围技能等
 *
 * Action 根据技能类型决定使用哪种目标。
 */
export type ActionUseEvent = GameEventBase & {
  readonly kind: typeof ACTION_USE_EVENT;
  /** 使用的 Ability ID */
  readonly abilityId: string;
  /** 行动者 Actor ID */
  readonly sourceId: string;
  /** 目标 Actor（单体技能用）- 使用 ActorRef 以兼容框架 TargetSelector */
  readonly target?: ActorRef;
  /** 目标坐标（移动/范围技能用） */
  readonly targetCoord?: AxialCoord;
};

/**
 * 创建行动使用事件
 */
export function createActionUseEvent(
  logicTime: number,
  abilityId: string,
  sourceId: string,
  options?: { target?: ActorRef; targetCoord?: AxialCoord }
): ActionUseEvent {
  return {
    kind: ACTION_USE_EVENT,
    logicTime,
    abilityId,
    sourceId,
    target: options?.target,
    targetCoord: options?.targetCoord,
  };
}

// ============================================================
// 移动 Ability
// ============================================================

/**
 * 移动 - 移动到相邻格子
 */
export const MOVE_ABILITY: AbilityConfig = {
  configId: 'action_move',
  displayName: '移动',
  description: '移动到相邻格子',
  tags: ['action', 'move'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{
        eventKind: ACTION_USE_EVENT,
        filter: (e) => (e as ActionUseEvent).abilityId === 'action_move',
      }],
      timelineId: 'action_move',
      tagActions: {
        execute: [new MoveAction({
          targetSelector: abilityOwnerSelector,
          targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
        })],
      },
    }),
  ],
};

// ============================================================
// 技能 Ability
// ============================================================

/**
 * 横扫斩 - 近战物理攻击
 */
export const SLASH_ABILITY: AbilityConfig = {
  configId: 'skill_slash',
  displayName: '横扫斩',
  description: '近战攻击，对敌人造成物理伤害',
  tags: ['skill', 'active', 'melee', 'enemy'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{
        eventKind: ACTION_USE_EVENT,
        filter: (e) => (e as ActionUseEvent).abilityId === 'skill_slash',
      }],
      timelineId: 'skill_slash',
      tagActions: {
        hit: [new DamageAction({ damage: 50, damageType: 'physical' })],
      },
    }),
  ],
};
/**
 * 精准射击 - 远程物理攻击
 */
export const PRECISE_SHOT_ABILITY: AbilityConfig = {
  configId: 'skill_precise_shot',
  displayName: '精准射击',
  description: '远程攻击，精准命中敌人',
  tags: ['skill', 'active', 'ranged', 'enemy'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{
        eventKind: ACTION_USE_EVENT,
        filter: (e) => (e as ActionUseEvent).abilityId === 'skill_precise_shot',
      }],
      timelineId: 'skill_precise_shot',
      tagActions: {
        hit: [new DamageAction({ damage: 45, damageType: 'physical' })],
      },
    }),
  ],
};

/**
 * 火球术 - 远程魔法攻击
 */
export const FIREBALL_ABILITY: AbilityConfig = {
  configId: 'skill_fireball',
  displayName: '火球术',
  description: '远程魔法攻击，造成高额伤害',
  tags: ['skill', 'active', 'ranged', 'magic', 'enemy'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{
        eventKind: ACTION_USE_EVENT,
        filter: (e) => (e as ActionUseEvent).abilityId === 'skill_fireball',
      }],
      timelineId: 'skill_fireball',
      tagActions: {
        hit: [new DamageAction({ damage: 80, damageType: 'magical' })],
      },
    }),
  ],
};

/**
 * 毁灭重击 - 近战重击
 */
export const CRUSHING_BLOW_ABILITY: AbilityConfig = {
  configId: 'skill_crushing_blow',
  displayName: '毁灭重击',
  description: '近战重击，造成毁灭性伤害',
  tags: ['skill', 'active', 'melee', 'enemy'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{
        eventKind: ACTION_USE_EVENT,
        filter: (e) => (e as ActionUseEvent).abilityId === 'skill_crushing_blow',
      }],
      timelineId: 'skill_crushing_blow',
      tagActions: {
        hit: [new DamageAction({ damage: 90, damageType: 'physical' })],
      },
    }),
  ],
};

/**
 * 疾风连刺 - 快速多段攻击
 */
export const SWIFT_STRIKE_ABILITY: AbilityConfig = {
  configId: 'skill_swift_strike',
  displayName: '疾风连刺',
  description: '快速近战攻击，三连击',
  tags: ['skill', 'active', 'melee', 'enemy'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{
        eventKind: ACTION_USE_EVENT,
        filter: (e) => (e as ActionUseEvent).abilityId === 'skill_swift_strike',
      }],
      timelineId: 'skill_swift_strike',
      tagActions: {
        hit1: [new DamageAction({ damage: 10, damageType: 'physical' })],
        hit2: [new DamageAction({ damage: 10, damageType: 'physical' })],
        hit3: [new DamageAction({ damage: 10, damageType: 'physical' })],
      },
    }),
  ],
};

/**
 * 圣光治愈 - 治疗技能
 */
export const HOLY_HEAL_ABILITY: AbilityConfig = {
  configId: 'skill_holy_heal',
  displayName: '圣光治愈',
  description: '治疗友方单位，恢复生命值',
  tags: ['skill', 'active', 'heal', 'ally'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{
        eventKind: ACTION_USE_EVENT,
        filter: (e) => (e as ActionUseEvent).abilityId === 'skill_holy_heal',
      }],
      timelineId: 'skill_holy_heal',
      tagActions: {
        heal: [new HealAction({ healAmount: 40 })],
      },
    }),
  ],
};

// ============================================================
// 导出映射
// ============================================================

/**
 * 技能 Ability 映射
 */
export const SKILL_ABILITIES: Record<SkillType, AbilityConfig> = {
  Slash: SLASH_ABILITY,
  PreciseShot: PRECISE_SHOT_ABILITY,
  Fireball: FIREBALL_ABILITY,
  CrushingBlow: CRUSHING_BLOW_ABILITY,
  SwiftStrike: SWIFT_STRIKE_ABILITY,
  HolyHeal: HOLY_HEAL_ABILITY,
};

/**
 * 所有 Ability（包括移动）
 */
export const ALL_ABILITIES: AbilityConfig[] = [
  MOVE_ABILITY,
  ...Object.values(SKILL_ABILITIES),
];
