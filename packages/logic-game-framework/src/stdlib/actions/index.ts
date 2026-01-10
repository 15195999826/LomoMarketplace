/**
 * Standard Library - Actions
 *
 * 标准 Action 导出。
 *
 * 注意：具体的 Action 实现（如 DamageAction, HealAction）
 * 已移至 examples/actions/，因为这些实现通常需要根据
 * 项目需求进行定制，不适合作为通用标准库。
 *
 * 如需参考实现，请查看 examples/actions/ 目录。
 */

// 投射物 Action
export {
  LaunchProjectileAction,
  type LaunchProjectileActionParams,
  type PositionResolver,
  createActorPositionResolver,
  createFixedPositionResolver,
  sourcePositionResolver,
  targetPositionResolver,
} from './LaunchProjectileAction.js';

// 舞台提示 Action（表演层数据传递）
export {
  StageCueAction,
  type StageCueActionParams,
  createStageCueAction,
} from './StageCueAction.js';
