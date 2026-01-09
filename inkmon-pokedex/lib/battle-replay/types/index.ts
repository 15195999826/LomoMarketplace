/**
 * Battle Replay Types - 类型导出入口
 *
 * @module lib/battle-replay/types
 */

// VisualAction 类型
export type {
  HexCoord,
  WorldCoord,
  EasingFunction,
  VisualActionBase,
  MoveAction,
  UpdateHPAction,
  FloatingTextStyle,
  FloatingTextAction,
  MeleeStrikeStyle,
  MeleeStrikeAction,
  SpriteVFXAction,
  ProceduralEffectType,
  ProceduralVFXAction,
  VisualAction,
  VisualActionType,
  ActiveAction,
} from './VisualAction';

export {
  isMoveAction,
  isUpdateHPAction,
  isFloatingTextAction,
  isMeleeStrikeAction,
  isSpriteVFXAction,
  isProceduralVFXAction,
} from './VisualAction';

// VisualizerContext 类型
export type { VisualizerContext } from './VisualizerContext';
export { createEmptyContext } from './VisualizerContext';

// AnimationConfig 类型
export type {
  MoveAnimationConfig,
  DamageAnimationConfig,
  HealAnimationConfig,
  SkillAnimationConfig,
  AnimationConfig,
} from './AnimationConfig';

export {
  DEFAULT_ANIMATION_CONFIG,
  mergeAnimationConfig,
} from './AnimationConfig';

// RenderState 类型
export type {
  ActorRenderState,
  SpriteVFXInstance,
  ProceduralEffectInstance,
  FloatingTextInstance,
  ScreenShakeState,
  RenderState,
} from './RenderState';

export { createEmptyRenderState } from './RenderState';
