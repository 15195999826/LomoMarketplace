/**
 * VisualAction - 视觉动作类型定义
 *
 * 描述原子级的视觉效果，由 Visualizer 从 GameEvent 翻译而来。
 * 这些动作是声明式的，描述"做什么"而非"怎么做"。
 *
 * @module lib/battle-replay/types/VisualAction
 */

import type { AxialCoord, PixelCoord } from '@lomo/hex-grid';

// ========== 坐标类型别名 ==========
// 使用框架提供的类型，创建语义化别名

/** 六边形坐标（来自 @lomo/hex-grid） */
export type HexCoord = AxialCoord;

/** 世界坐标/像素坐标（来自 @lomo/hex-grid） */
export type WorldCoord = PixelCoord;

// ========== 缓动函数 ==========

/** 支持的缓动函数类型 */
export type EasingFunction =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic';

// ========== 动作基础接口 ==========

/**
 * 视觉动作基础接口
 *
 * 所有 VisualAction 都必须包含这些字段
 */
export interface VisualActionBase {
  /** 动作类型标识 */
  type: string;
  /** 关联的 Actor ID（可选，某些全局效果无需） */
  actorId?: string;
  /** 动画持续时间（毫秒） */
  duration: number;
  /** 延迟执行时间（毫秒），默认 0 */
  delay?: number;
}

// ========== 基础动作类型 ==========

/**
 * 移动动作
 *
 * 将角色从一个格子移动到另一个格子
 */
export interface MoveAction extends VisualActionBase {
  type: 'Move';
  actorId: string;
  /** 起始坐标 */
  from: HexCoord;
  /** 目标坐标 */
  to: HexCoord;
  /** 缓动函数 */
  easing: EasingFunction;
}

/**
 * 更新血条动作
 *
 * 平滑过渡血条显示值
 */
export interface UpdateHPAction extends VisualActionBase {
  type: 'UpdateHP';
  actorId: string;
  /** 起始 HP */
  fromHP: number;
  /** 目标 HP */
  toHP: number;
}

// ========== UI 特效（DOM 层） ==========

/** 飘字样式 */
export type FloatingTextStyle = 'normal' | 'critical' | 'heal' | 'miss';

/**
 * 飘字动作
 *
 * 在指定位置显示飘字（伤害数字、治疗数字等）
 */
export interface FloatingTextAction extends VisualActionBase {
  type: 'FloatingText';
  /** 显示文本 */
  text: string;
  /** 文字颜色 */
  color: string;
  /** 显示位置（世界坐标） */
  position: WorldCoord;
  /** 飘字样式 */
  style: FloatingTextStyle;
}

// ========== Canvas 特效 ==========

/** 近战打击样式 */
export type MeleeStrikeStyle =
  | 'slash'    // 斩击弧线
  | 'thrust'   // 突刺直线
  | 'impact';  // 冲击波纹

/**
 * 近战打击动作
 *
 * 简单的近战攻击视觉效果（斩击、冲拳等）
 * 纯程序化实现，无需资源预加载
 */
export interface MeleeStrikeAction extends VisualActionBase {
  type: 'MeleeStrike';
  /** 攻击者位置 */
  from: WorldCoord;
  /** 目标位置 */
  to: WorldCoord;
  /** 打击样式 */
  style: MeleeStrikeStyle;
  /** 颜色（可选，默认根据元素类型） */
  color?: string;
}

/**
 * Sprite 特效动作
 *
 * 播放序列帧动画（爆炸、刀光等）
 */
export interface SpriteVFXAction extends VisualActionBase {
  type: 'SpriteVFX';
  /** 特效 ID（对应预加载的 sprite） */
  vfxId: string;
  /** 显示位置 */
  position: WorldCoord;
  /** 缩放比例 */
  scale?: number;
  /** 旋转角度（弧度） */
  rotation?: number;
}

/** 程序化特效类型 */
export type ProceduralEffectType = 'hitFlash' | 'shake' | 'colorTint';

/**
 * 程序化特效动作
 *
 * 代码生成的效果（震屏、闪白、染色）
 */
export interface ProceduralVFXAction extends VisualActionBase {
  type: 'ProceduralVFX';
  /** 效果类型 */
  effect: ProceduralEffectType;
  /** 目标 Actor ID（hitFlash/colorTint 需要） */
  actorId?: string;
  /** 效果强度（shake 使用） */
  intensity?: number;
  /** 染色颜色（colorTint 使用） */
  color?: string;
}

// ========== 联合类型 ==========

/**
 * 所有视觉动作类型
 */
export type VisualAction =
  | MoveAction
  | UpdateHPAction
  | FloatingTextAction
  | MeleeStrikeAction
  | SpriteVFXAction
  | ProceduralVFXAction;

/**
 * 视觉动作类型标识
 */
export type VisualActionType = VisualAction['type'];

// ========== 运行时状态 ==========

/**
 * 活跃动作（运行时状态）
 *
 * 在 ActionScheduler 中管理的动作实例
 */
export interface ActiveAction<T extends VisualAction = VisualAction> {
  /** 唯一标识 */
  id: string;
  /** 原始动作定义 */
  action: T;
  /** 已执行时间（毫秒） */
  elapsed: number;
  /** 执行进度（0~1） */
  progress: number;
  /** 是否处于延迟等待中 */
  isDelaying: boolean;
}

// ========== 类型守卫 ==========

export function isMoveAction(action: VisualAction): action is MoveAction {
  return action.type === 'Move';
}

export function isUpdateHPAction(action: VisualAction): action is UpdateHPAction {
  return action.type === 'UpdateHP';
}

export function isFloatingTextAction(action: VisualAction): action is FloatingTextAction {
  return action.type === 'FloatingText';
}

export function isMeleeStrikeAction(action: VisualAction): action is MeleeStrikeAction {
  return action.type === 'MeleeStrike';
}

export function isSpriteVFXAction(action: VisualAction): action is SpriteVFXAction {
  return action.type === 'SpriteVFX';
}

export function isProceduralVFXAction(action: VisualAction): action is ProceduralVFXAction {
  return action.type === 'ProceduralVFX';
}
