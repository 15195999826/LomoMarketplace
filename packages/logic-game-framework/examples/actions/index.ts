/**
 * Example Actions
 *
 * 示例 Action 实现，仅供参考。
 * 实际项目应根据自己的需求创建类似的 Action。
 */

export {
  DamageAction,
  DamageType,
  IDamageCalculator,
  SimpleDamageCalculator,
  setDamageCalculator,
  damage,
} from './DamageAction.js';

export {
  HealAction,
  heal,
} from './HealAction.js';

export {
  AddBuffAction,
  BuffRefreshPolicy,
  addBuff,
} from './AddBuffAction.js';
