/**
 * EventPhase - 事件阶段与追踪类型定义
 *
 * 提供 Pre/Post 双阶段事件处理的核心类型。
 *
 * ## 设计说明
 *
 * - **Pre 阶段**：事件生效前，可被修改或取消（用于免疫、闪避、减伤）
 * - **Post 阶段**：事件生效后，只读响应（用于反伤、吸血、触发连锁）
 *
 * ## 处理流程
 *
 * ```
 * Action.execute()
 *   → 构造 PreEvent
 *   → 广播给所有监听者，收集 Intent
 *   → 应用修改 / 检查取消
 *   → 执行实际效果
 *   → 构造 PostEvent
 *   → 广播给所有监听者（深度优先）
 * ```
 */

import type { GameEventBase } from './GameEvent.js';

// ========== 事件阶段 ==========

/**
 * 事件阶段
 * - `pre`: 预处理阶段，可修改、可取消
 * - `post`: 后处理阶段，只读，用于响应
 */
export type EventPhase = 'pre' | 'post';

// ========== Pre 阶段处理器意图 ==========

/**
 * 事件修改操作
 */
export type EventModification = {
  /** 要修改的字段名 */
  readonly field: string;
  /** 修改操作类型 */
  readonly operation: 'set' | 'add' | 'multiply';
  /** 修改值 */
  readonly value: number;
};

/**
 * Pre 阶段处理器返回的意图
 *
 * 处理器不直接修改事件，而是返回"意图"，由 EventProcessor 统一应用。
 * 这样可以完整追踪所有修改过程。
 */
export type PreEventIntent =
  | { readonly type: 'pass' }
  | { readonly type: 'cancel'; readonly reason: string; readonly handlerId: string }
  | { readonly type: 'modify'; readonly modifications: readonly EventModification[]; readonly handlerId: string };

/**
 * 创建 pass 意图（不做任何操作）
 */
export function passIntent(): PreEventIntent {
  return { type: 'pass' };
}

/**
 * 创建 cancel 意图（取消事件）
 */
export function cancelIntent(handlerId: string, reason: string): PreEventIntent {
  return { type: 'cancel', reason, handlerId };
}

/**
 * 创建 modify 意图（修改事件字段）
 */
export function modifyIntent(handlerId: string, modifications: EventModification[]): PreEventIntent {
  return { type: 'modify', modifications, handlerId };
}

// ========== 追踪系统 ==========

/**
 * 追踪级别（数字，越大越详细）
 *
 * - 0: 关闭追踪
 * - 1: 只记录取消和最终结果
 * - 2: 记录每个处理器的意图
 * - 3: 记录字段修改详情
 * - 4+: 预留更详细的调试信息
 */
export type TraceLevel = number;

/**
 * 意图记录（用于追踪）
 */
export type IntentRecord = {
  /** 处理器 ID（通常是 Ability ID） */
  readonly handlerId: string;
  /** 处理器名称（用于日志显示） */
  readonly handlerName?: string;
  /** 返回的意图 */
  readonly intent: PreEventIntent;
  /** 执行时间（毫秒） */
  readonly executionTime?: number;
};

/**
 * 字段修改记录
 */
export type FieldModificationRecord = {
  /** 字段名 */
  readonly field: string;
  /** 原始值 */
  readonly originalValue: unknown;
  /** 最终值 */
  readonly finalValue: unknown;
  /** 所有修改步骤 */
  readonly steps: readonly {
    readonly handlerId: string;
    readonly operation: 'set' | 'add' | 'multiply';
    readonly value: number;
    readonly resultValue: number;
  }[];
};

/**
 * 事件处理追踪记录
 *
 * 记录一个事件从接收到处理完成的完整过程。
 */
export type EventProcessingTrace = {
  /** 追踪 ID（唯一标识） */
  readonly traceId: string;
  /** 事件类型 */
  readonly eventKind: string;
  /** 事件阶段 */
  readonly phase: EventPhase;
  /** 递归深度 */
  readonly depth: number;
  /** 父追踪 ID（用于追踪因果链） */
  readonly parentTraceId?: string;

  // Pre 阶段记录
  /** 所有处理器的意图记录 */
  readonly intents: readonly IntentRecord[];
  /** 原始字段值 */
  readonly originalValues: Record<string, unknown>;
  /** 最终字段值 */
  readonly finalValues: Record<string, unknown>;
  /** 字段修改详情（traceLevel >= 3 时记录） */
  readonly fieldModifications?: readonly FieldModificationRecord[];

  // 状态
  /** 是否被取消 */
  readonly cancelled: boolean;
  /** 取消原因 */
  readonly cancelReason?: string;
  /** 取消者 ID */
  readonly cancelledBy?: string;

  // 时间
  /** 处理开始时间 */
  readonly startTime: number;
  /** 处理结束时间 */
  readonly endTime?: number;
};

/**
 * 创建追踪 ID
 */
export function createTraceId(): string {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ========== 可变事件接口 ==========

/**
 * 可变事件包装接口
 *
 * 包装原始事件，提供修改和取消能力（仅 Pre 阶段有效）。
 */
export interface MutableEvent<T extends GameEventBase = GameEventBase> {
  /** 原始事件（不可变） */
  readonly original: T;
  /** 事件阶段 */
  readonly phase: EventPhase;
  /** 是否被取消 */
  cancelled: boolean;
  /** 取消原因 */
  cancelReason?: string;
  /** 取消者 ID */
  cancelledBy?: string;
  /** 所有修改记录 */
  readonly modifications: EventModification[];

  /**
   * 获取字段当前值（应用所有修改后）
   */
  getCurrentValue(field: string): unknown;

  /**
   * 添加修改
   */
  addModification(modification: EventModification): void;

  /**
   * 生成最终事件（应用所有修改）
   */
  toFinalEvent(): T;
}

// ========== 处理器上下文 ==========

/**
 * Pre 阶段处理器函数类型
 */
export type PreEventHandler<T extends GameEventBase = GameEventBase> = (
  event: MutableEvent<T>,
  handlerContext: PreEventHandlerContext
) => PreEventIntent;

/**
 * Pre 阶段处理器上下文
 */
export type PreEventHandlerContext = {
  /** 处理器所属的 Actor */
  readonly ownerId: string;
  /** 处理器所属的 Ability ID */
  readonly abilityId: string;
  /** Ability 配置 ID */
  readonly configId: string;
  /** 游戏状态 */
  readonly gameplayState: unknown;
};
