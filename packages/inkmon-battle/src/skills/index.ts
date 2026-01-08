/**
 * Skills Module - InkMon 技能系统
 *
 * 包含 Timeline、Ability 配置和冷却系统
 */

// Timeline 定义
export {
  MOVE_TIMELINE,
  SKIP_TIMELINE,
  BASIC_ATTACK_TIMELINE,
  PHYSICAL_ATTACK_TIMELINE,
  SPECIAL_ATTACK_TIMELINE,
  MULTI_HIT_TIMELINE,
  HEAL_TIMELINE,
  BUFF_TIMELINE,
  TIMELINE_ID,
  INKMON_TIMELINES,
  type TimelineId,
} from './InkMonTimelines.js';

// Ability 定义
export {
  MOVE_ABILITY,
  BASIC_ATTACK_ABILITY,
  PHYSICAL_SKILL_ABILITY,
  SPECIAL_SKILL_ABILITY,
  HEAL_SKILL_ABILITY,
  ABILITY_CONFIG_ID,
  INKMON_BASE_ABILITIES,
  getDefaultBattleAbilities,
  createActionUseEvent,
  type ActionUseEvent,
} from './InkMonAbilities.js';

// 冷却系统
export {
  COOLDOWN_TAG_PREFIX,
  getCooldownTag,
  CooldownReadyCondition,
  TimedCooldownCost,
  CooldownCost,
  isOnCooldown,
} from './CooldownSystem.js';
