/**
 * 能力系统 - 项目层扩展
 */

export {
  BattleAbilitySet,
  createBattleAbilitySet,
  COOLDOWN_TAG_PREFIX,
  getCooldownTag,
} from './BattleAbilitySet.js';

export {
  CooldownReadyCondition,
  TimedCooldownCost,
  TurnCooldownCost,
  CooldownCost,
} from './CooldownSystem.js';
