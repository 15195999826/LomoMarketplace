/**
 * Ability 定义
 *
 * 使用框架 Ability 系统实现的技能和行动配置。
 * 包括移动、攻击技能、治疗技能等。
 *
 * ## 设计说明
 *
 * - **移动**：使用 ActivateInstanceComponent（无条件/消耗）
 * - **技能**：使用 ActiveUseComponent（带冷却条件和消耗，默认监听 AbilityActivateEvent）
 *
 * ## 事件类型
 *
 * 使用框架标准的 AbilityActivateEvent，并扩展项目特定字段（target, targetCoord）
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

import { CooldownReadyCondition, TimedCooldownCost } from '../abilities/index.js';

import type { AxialCoord } from '@lomo/hex-grid';

import { DamageAction } from '../actions/DamageAction.js';
import { HealAction } from '../actions/HealAction.js';
import { StartMoveAction } from '../actions/StartMoveAction.js';
import { ApplyMoveAction } from '../actions/ApplyMoveAction.js';
import { LaunchProjectileAction } from '../actions/LaunchProjectileAction.js';

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
// 行动事件定义（扩展标准 AbilityActivateEvent）
// ============================================================

/**
 * 行动使用事件
 *
 * 扩展框架标准的 AbilityActivateEvent，添加项目特定字段。
 * ActiveUseComponent 默认监听此事件类型。
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
};

/**
 * 创建行动使用事件
 */
export function createActionUseEvent(
  abilityInstanceId: string,
  sourceId: string,
  options?: { target?: ActorRef; targetCoord?: AxialCoord }
): ActionUseEvent {
  return {
    kind: ABILITY_ACTIVATE_EVENT,
    abilityInstanceId,
    sourceId,
    target: options?.target,
    targetCoord: options?.targetCoord,
  };
}

// ============================================================
// Timeline ID 常量
// ============================================================

/** Timeline ID 常量（避免硬编码字符串） */
export const TIMELINE_ID = {
  // 行动
  MOVE: 'action_move',
  // 技能
  SLASH: 'skill_slash',
  PRECISE_SHOT: 'skill_precise_shot',
  FIREBALL: 'skill_fireball',
  CRUSHING_BLOW: 'skill_crushing_blow',
  SWIFT_STRIKE: 'skill_swift_strike',
  HOLY_HEAL: 'skill_holy_heal',
} as const;

export type TimelineId = (typeof TIMELINE_ID)[keyof typeof TIMELINE_ID];

// ============================================================
// 技能冷却配置（毫秒）
// ============================================================

/** 默认技能冷却时间 */
const DEFAULT_SKILL_COOLDOWN = 3000;

/** 各技能冷却时间 */
const SKILL_COOLDOWNS = {
  slash: 2000,
  preciseShot: 2500,
  fireball: 4000,
  crushingBlow: 5000,
  swiftStrike: 3000,
  holyHeal: 4000,
} as const;

// ============================================================
// 移动 Ability（无冷却，需要自定义 triggers）
// ============================================================

/**
 * 移动 - 移动到相邻格子（两阶段）
 *
 * 使用 ActivateInstanceComponent，需要显式指定 triggers。
 * （移动不使用 ActiveUseComponent，因为没有条件/消耗）
 *
 * ## 两阶段移动
 *
 * - **start (1ms)**: StartMoveAction - 预订目标格子，创建 MoveStartEvent
 * - **execute (100ms)**: ApplyMoveAction - 实际移动，创建 MoveCompleteEvent
 */
export const MOVE_ABILITY: AbilityConfig = {
  configId: 'action_move',
  displayName: '移动',
  description: '移动到相邻格子',
  tags: ['action', 'move'],
  components: [
    () => new ActivateInstanceComponent({
      triggers: [{
        eventKind: ABILITY_ACTIVATE_EVENT,
        filter: (event, ctx) => (event as ActionUseEvent).abilityInstanceId === ctx.ability.id,
      }],
      timelineId: TIMELINE_ID.MOVE,
      tagActions: {
        start: [new StartMoveAction({
          targetSelector: abilityOwnerSelector,
          targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
        })],
        execute: [new ApplyMoveAction({
          targetSelector: abilityOwnerSelector,
          targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
        })],
      },
    }),
  ],
};

// ============================================================
// 技能 Ability（带冷却，使用默认 triggers）
// ============================================================

/**
 * 横扫斩 - 近战物理攻击
 *
 * 冷却: 2秒
 */
export const SLASH_ABILITY: AbilityConfig = {
  configId: 'skill_slash',
  displayName: '横扫斩',
  description: '近战攻击，对敌人造成物理伤害',
  tags: ['skill', 'active', 'melee', 'enemy'],
  activeUseComponents: [
    () => new ActiveUseComponent({
      conditions: [new CooldownReadyCondition()],
      costs: [new TimedCooldownCost(SKILL_COOLDOWNS.slash)],
      timelineId: TIMELINE_ID.SLASH,
      tagActions: {
        hit: [new DamageAction({ targetSelector: defaultTargetSelector, damage: 50, damageType: 'physical' })],
      },
    }),
  ],
};

/**
 * 精准射击 - 远程物理攻击（发射箭矢）
 *
 * 冷却: 2.5秒
 * 使用投射物：箭矢飞行后命中目标
 */
export const PRECISE_SHOT_ABILITY: AbilityConfig = {
  configId: 'skill_precise_shot',
  displayName: '精准射击',
  description: '远程攻击，发射箭矢精准命中敌人',
  tags: ['skill', 'active', 'ranged', 'enemy', 'projectile'],
  activeUseComponents: [
    () => new ActiveUseComponent({
      conditions: [new CooldownReadyCondition()],
      costs: [new TimedCooldownCost(SKILL_COOLDOWNS.preciseShot)],
      timelineId: TIMELINE_ID.PRECISE_SHOT,
      tagActions: {
        // 在 launch 时发射箭矢，而不是 hit 时直接造成伤害
        launch: [new LaunchProjectileAction({
          targetSelector: defaultTargetSelector,
          projectileVariant: 'arrow',
          damage: 45,
          damageType: 'physical',
        })],
      },
    }),
  ],
};

/**
 * 火球术 - 远程魔法攻击（发射火球）
 *
 * 冷却: 4秒
 * 使用投射物：火球飞行后命中目标
 */
export const FIREBALL_ABILITY: AbilityConfig = {
  configId: 'skill_fireball',
  displayName: '火球术',
  description: '远程魔法攻击，发射火球造成高额伤害',
  tags: ['skill', 'active', 'ranged', 'magic', 'enemy', 'projectile'],
  activeUseComponents: [
    () => new ActiveUseComponent({
      conditions: [new CooldownReadyCondition()],
      costs: [new TimedCooldownCost(SKILL_COOLDOWNS.fireball)],
      timelineId: TIMELINE_ID.FIREBALL,
      tagActions: {
        // 在 cast 后发射火球
        launch: [new LaunchProjectileAction({
          targetSelector: defaultTargetSelector,
          projectileVariant: 'fireball',
          damage: 80,
          damageType: 'magical',
        })],
      },
    }),
  ],
};

/**
 * 毁灭重击 - 近战重击
 *
 * 冷却: 5秒
 */
export const CRUSHING_BLOW_ABILITY: AbilityConfig = {
  configId: 'skill_crushing_blow',
  displayName: '毁灭重击',
  description: '近战重击，造成毁灭性伤害',
  tags: ['skill', 'active', 'melee', 'enemy'],
  activeUseComponents: [
    () => new ActiveUseComponent({
      conditions: [new CooldownReadyCondition()],
      costs: [new TimedCooldownCost(SKILL_COOLDOWNS.crushingBlow)],
      timelineId: TIMELINE_ID.CRUSHING_BLOW,
      tagActions: {
        hit: [new DamageAction({ targetSelector: defaultTargetSelector, damage: 90, damageType: 'physical' })],
      },
    }),
  ],
};

/**
 * 疾风连刺 - 快速多段攻击
 *
 * 冷却: 3秒
 */
export const SWIFT_STRIKE_ABILITY: AbilityConfig = {
  configId: 'skill_swift_strike',
  displayName: '疾风连刺',
  description: '快速近战攻击，三连击',
  tags: ['skill', 'active', 'melee', 'enemy'],
  activeUseComponents: [
    () => new ActiveUseComponent({
      conditions: [new CooldownReadyCondition()],
      costs: [new TimedCooldownCost(SKILL_COOLDOWNS.swiftStrike)],
      timelineId: TIMELINE_ID.SWIFT_STRIKE,
      tagActions: {
        hit1: [new DamageAction({ targetSelector: defaultTargetSelector, damage: 10, damageType: 'physical' })],
        hit2: [new DamageAction({ targetSelector: defaultTargetSelector, damage: 10, damageType: 'physical' })],
        hit3: [new DamageAction({ targetSelector: defaultTargetSelector, damage: 10, damageType: 'physical' })],
      },
    }),
  ],
};

/**
 * 圣光治愈 - 治疗技能
 *
 * 冷却: 4秒
 */
export const HOLY_HEAL_ABILITY: AbilityConfig = {
  configId: 'skill_holy_heal',
  displayName: '圣光治愈',
  description: '治疗友方单位，恢复生命值',
  tags: ['skill', 'active', 'heal', 'ally'],
  activeUseComponents: [
    () => new ActiveUseComponent({
      conditions: [new CooldownReadyCondition()],
      costs: [new TimedCooldownCost(SKILL_COOLDOWNS.holyHeal)],
      timelineId: TIMELINE_ID.HOLY_HEAL,
      tagActions: {
        heal: [new HealAction({ targetSelector: defaultTargetSelector, healAmount: 40 })],
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
