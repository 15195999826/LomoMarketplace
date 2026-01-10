/**
 * RenderState - 渲染状态类型定义
 *
 * 定义 RenderWorld 输出的状态结构，供 React 组件消费。
 *
 * @module lib/battle-replay/types/RenderState
 */

import type { HexCoord, WorldCoord } from './VisualAction';

// ========== Actor 渲染状态 ==========

/**
 * 角色渲染状态
 *
 * 包含渲染所需的所有角色信息
 */
export interface ActorRenderState {
  /** 角色 ID */
  id: string;
  /** 显示名称 */
  displayName: string;
  /** 所属队伍 */
  team: 'A' | 'B';
  /** 当前六边形坐标 */
  position: HexCoord;
  /** 视觉 HP（用于动画插值，可能与逻辑 HP 不同） */
  visualHP: number;
  /** 最大 HP */
  maxHP: number;
  /** 是否存活 */
  isAlive: boolean;
  /** 元素类型列表 */
  elements: string[];

  // ========== 单位级特效状态 ==========

  /** 受击闪白进度（0~1，undefined 表示无效果） */
  flashProgress?: number;
  /** 染色颜色（undefined 表示无染色） */
  tintColor?: string;
}

// ========== 特效实例 ==========

/**
 * Sprite 特效实例
 */
export interface SpriteVFXInstance {
  /** 实例 ID */
  id: string;
  /** 特效 ID */
  vfxId: string;
  /** 显示位置 */
  position: WorldCoord;
  /** 开始时间戳 */
  startTime: number;
  /** 持续时间 */
  duration: number;
  /** 缩放比例 */
  scale: number;
  /** 旋转角度 */
  rotation: number;
}

/**
 * 程序化特效实例
 */
export interface ProceduralEffectInstance {
  /** 实例 ID */
  id: string;
  /** 效果类型 */
  effect: 'hitFlash' | 'shake' | 'colorTint';
  /** 目标 Actor ID（可选） */
  actorId?: string;
  /** 开始时间戳 */
  startTime: number;
  /** 持续时间 */
  duration: number;
  /** 效果强度 */
  intensity?: number;
  /** 染色颜色 */
  color?: string;
}

/**
 * 飘字实例
 */
export interface FloatingTextInstance {
  /** 实例 ID */
  id: string;
  /** 关联的 Actor ID（用于定位） */
  actorId?: string;
  /** 显示文本 */
  text: string;
  /** 文字颜色 */
  color: string;
  /** 显示位置 */
  position: WorldCoord;
  /** 开始时间戳 */
  startTime: number;
  /** 持续时间 */
  duration: number;
  /** 飘字样式 */
  style: 'normal' | 'critical' | 'heal' | 'miss';
}

// ========== 全局效果 ==========

/**
 * 震屏效果状态
 */
export interface ScreenShakeState {
  /** X 轴偏移 */
  offsetX: number;
  /** Y 轴偏移 */
  offsetY: number;
}

// ========== 完整渲染状态 ==========

/**
 * 完整渲染状态
 *
 * RenderWorld.getState() 的返回类型
 */
export interface RenderState {
  // ========== Canvas 层数据 ==========

  /** 所有角色的渲染状态 */
  actors: ActorRenderState[];

  /** 插值后的位置（用于移动动画） */
  interpolatedPositions: Map<string, HexCoord>;

  /** 活跃的 Sprite 特效 */
  activeSpriteVFX: SpriteVFXInstance[];

  /** 活跃的程序化特效 */
  proceduralEffects: ProceduralEffectInstance[];

  // ========== DOM 层数据 ==========

  /** 活跃的飘字 */
  floatingTexts: FloatingTextInstance[];

  // ========== 全局效果 ==========

  /** 震屏效果（undefined 表示无震屏） */
  screenShake?: ScreenShakeState;
}

/**
 * 创建空的渲染状态
 */
export function createEmptyRenderState(): RenderState {
  return {
    actors: [],
    interpolatedPositions: new Map(),
    activeSpriteVFX: [],
    proceduralEffects: [],
    floatingTexts: [],
    screenShake: undefined,
  };
}
