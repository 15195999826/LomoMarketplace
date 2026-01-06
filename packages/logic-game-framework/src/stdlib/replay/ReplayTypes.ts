/**
 * Battle Replay Protocol v2 - 类型定义
 *
 * 定义战斗回放的标准数据结构，用于：
 * - 逻辑层输出执行数据
 * - 表现层消费并渲染
 * - 战斗回放重现
 *
 * ## 设计原则
 *
 * 1. **事件溯源**: 初始状态 + 事件流 = 任意时刻状态
 * 2. **自描述性**: 事件数据足够详细，能完整表达发生了什么
 * 3. **按帧组织**: 同一帧的事件归为一组，无需每个事件记录时间
 * 4. **继承 GameEventBase**: 所有事件带 kind + logicTime
 */

import type { GameEventBase } from '../../core/events/GameEvent.js';

// ========== 协议版本 ==========

/** 协议版本号 */
export const REPLAY_PROTOCOL_VERSION = '2.0';

// ========== 根结构 ==========

/**
 * 战斗回放完整记录
 *
 * 包含战斗的元数据、初始状态和完整时间线。
 */
export interface IBattleRecord {
  /** 协议版本 */
  version: string;

  /** 战斗元数据 */
  meta: IBattleMeta;

  /** 配置数据（v1 全量内嵌，便于离线回放） */
  configs: Record<string, unknown>;

  /** 初始 Actor 列表 */
  initialActors: IActorInitData[];

  /** 时间线（按帧组织） */
  timeline: IFrameData[];
}

/**
 * 战斗元数据
 */
export interface IBattleMeta {
  /** 战斗 ID（唯一标识） */
  battleId: string;

  /** 录制时间戳（毫秒） */
  recordedAt: number;

  /** tick 间隔（毫秒） */
  tickInterval: number;

  /** 总帧数 */
  totalFrames: number;

  /** 战斗结果（可选） */
  result?: string;
}

// ========== 帧数据 ==========

/**
 * 帧数据
 *
 * 同一帧的所有事件按产生顺序记录。
 * 空帧（无事件）不记录到 timeline 中，节省空间。
 */
export interface IFrameData {
  /** 帧号（= logicTime / tickInterval） */
  frame: number;

  /** 该帧所有事件，保持产生顺序 */
  events: GameEventBase[];
}

// ========== Actor 初始数据 ==========

/**
 * Actor 初始数据
 *
 * 捕获 Actor 在战斗开始时（或动态创建时）的完整状态。
 * 支持项目扩展（通过索引签名）。
 */
export interface IActorInitData {
  /** Actor ID */
  id: string;

  /** 配置 ID（前端用于加载模型/预制体） */
  configId: string;

  /** 显示名称 */
  displayName: string;

  /** 队伍/阵营 */
  team: number | string;

  /** 位置（支持多种坐标系） */
  position?: {
    /** 六边形坐标（如果使用） */
    hex?: { q: number; r: number };
    /** 世界坐标（如果使用） */
    world?: { x: number; y: number; z: number };
  };

  /** 属性快照（当前值） */
  attributes: Record<string, number>;

  /** 初始 Ability 列表 */
  abilities: IAbilityInitData[];

  /** 初始 Tag（Tag 名 -> 层数） */
  tags: Record<string, number>;

  /** 项目扩展字段（允许添加任意数据） */
  [key: string]: unknown;
}

/**
 * Ability 初始数据
 */
export interface IAbilityInitData {
  /** Ability 实例 ID */
  instanceId: string;

  /** 配置 ID */
  configId: string;

  /** 剩余冷却时间（可选） */
  remainingCooldown?: number;

  /** 层数（可选） */
  stackCount?: number;
}

// ========== 录像上下文 ==========

/**
 * 录像上下文
 *
 * 传递给 Actor 的 setupRecording 方法，提供录像所需的能力。
 * 通过接口隔离，避免 Actor 直接依赖 BattleRecorder。
 */
export interface IRecordingContext {
  /** 当前 Actor ID */
  readonly actorId: string;

  /** 获取当前逻辑时间（毫秒） */
  getLogicTime(): number;

  /** 推送事件到录像时间线 */
  pushEvent(event: GameEventBase): void;
}

// ========== 可录制 Actor 接口 ==========

/**
 * 可录制的 Actor 接口
 *
 * BattleRecorder 要求 Actor 提供这些访问器。
 * 具体 Actor 类型需要实现这些属性。
 */
export interface IRecordableActor {
  /** Actor ID */
  readonly id: string;

  /** 配置 ID */
  readonly configId?: string;

  /** 显示名称 */
  readonly displayName?: string;

  /** 队伍 */
  readonly team?: string | number;

  /** 位置（可选） */
  readonly position?: { x: number; y: number; z?: number };

  /**
   * 获取属性快照
   * 返回属性名到当前值的映射
   */
  getAttributeSnapshot(): Record<string, number>;

  /**
   * 获取 Ability 快照
   * 返回所有 Ability 的初始数据
   */
  getAbilitySnapshot(): IAbilityInitData[];

  /**
   * 获取 Tag 快照
   * 返回 Tag 名到层数的映射
   */
  getTagSnapshot(): Record<string, number>;

  /**
   * 设置录像订阅（可选）
   *
   * Actor 在此方法中调用框架提供的工具函数来订阅各组件的变化。
   * 返回取消订阅函数数组，BattleRecorder 会在停止录制时调用。
   *
   * @example
   * ```typescript
   * setupRecording(ctx: IRecordingContext) {
   *   return [
   *     recordAttributeChanges(this.attributeSet, ctx),
   *     ...recordAbilitySetChanges(this.abilitySet, ctx),
   *   ];
   * }
   * ```
   *
   * @param ctx 录像上下文
   * @returns 取消订阅函数数组
   */
  setupRecording?(ctx: IRecordingContext): (() => void)[];
}
