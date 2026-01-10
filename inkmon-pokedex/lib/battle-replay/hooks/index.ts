/**
 * Hooks 模块导出
 *
 * @module lib/battle-replay/hooks
 */

export {
  useAnimationFrame,
  useAnimationFrameWithSpeed,
  type FrameCallback,
} from './useAnimationFrame';

export {
  useBattleDirector,
  type DirectorControls,
  type DirectorState,
  type UseBattleDirectorResult,
  type UseBattleDirectorOptions,
} from './useBattleDirector';
