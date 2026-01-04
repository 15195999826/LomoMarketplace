/**
 * EventProcessor - 事件处理器
 *
 * 统一处理 Pre/Post 双阶段事件，支持深度优先递归和追踪。
 *
 * ## 核心职责
 *
 * 1. **Pre 阶段处理**：收集所有处理器的意图，应用修改，判断是否取消
 * 2. **Post 阶段处理**：广播事件到所有监听者，深度优先处理被动产生的新事件
 * 3. **追踪记录**：根据 traceLevel 记录处理过程
 * 4. **递归保护**：限制最大递归深度
 *
 * ## 使用示例
 *
 * ```typescript
 * const processor = new EventProcessor({ maxDepth: 10, traceLevel: 2 });
 *
 * // 处理 Pre 阶段
 * const mutable = processor.processPreEvent(preDamageEvent, actors, gameplayState);
 *
 * if (!mutable.cancelled) {
 *   // 执行实际效果
 *   target.hp -= mutable.getCurrentValue('damage') as number;
 *
 *   // 处理 Post 阶段
 *   processor.processPostEvent(postDamageEvent, actors, gameplayState);
 * }
 *
 * // 查看追踪日志
 * console.log(processor.exportTraceLog());
 * ```
 */

import type { Actor } from '../entity/Actor.js';
import type { GameEventBase } from './GameEvent.js';
import type { AbilitySet } from '../abilities/AbilitySet.js';
import { hasAbilitySet } from '../abilities/AbilitySet.js';
import { MutableEventImpl, createMutableEvent } from './MutableEvent.js';
import {
  type MutableEvent,
  type PreEventIntent,
  type EventProcessingTrace,
  type IntentRecord,
  type TraceLevel,
  type PreEventHandler,
  type PreEventHandlerContext,
  createTraceId,
} from './EventPhase.js';
import { getLogger } from '../utils/Logger.js';

// ========== 配置类型 ==========

/**
 * EventProcessor 配置
 */
export type EventProcessorConfig = {
  /** 最大递归深度（默认 10） */
  maxDepth?: number;
  /**
   * 追踪级别（默认 1）
   * - 0: 关闭追踪
   * - 1: 只记录取消和最终结果
   * - 2: 记录每个处理器的意图
   * - 3: 记录字段修改详情
   */
  traceLevel?: TraceLevel;
};

/**
 * Pre 阶段处理器注册信息
 */
export type PreHandlerRegistration = {
  /** 处理器 ID */
  id: string;
  /** 处理器名称（用于日志） */
  name?: string;
  /** 监听的事件类型 */
  eventKind: string;
  /** 所属 Actor ID */
  ownerId: string;
  /** 所属 Ability ID */
  abilityId: string;
  /** Ability 配置 ID */
  configId: string;
  /** 条件过滤器 */
  filter?: (event: GameEventBase) => boolean;
  /** 处理函数 */
  handler: PreEventHandler;
};

// ========== EventProcessor 类 ==========

/**
 * EventProcessor - 事件处理器
 */
export class EventProcessor {
  private readonly maxDepth: number;
  private readonly traceLevel: TraceLevel;

  /** 当前递归深度 */
  private currentDepth = 0;

  /** 追踪记录 */
  private traces: EventProcessingTrace[] = [];

  /** 当前追踪 ID（用于建立父子关系） */
  private currentTraceId?: string;

  /** Pre 阶段处理器注册表（eventKind -> handlers） */
  private preHandlers: Map<string, PreHandlerRegistration[]> = new Map();

  constructor(config: EventProcessorConfig = {}) {
    this.maxDepth = config.maxDepth ?? 10;
    this.traceLevel = config.traceLevel ?? 1;
  }

  // ========== 处理器注册 ==========

  /**
   * 注册 Pre 阶段处理器
   *
   * @param registration 处理器注册信息
   * @returns 取消注册函数
   */
  registerPreHandler(registration: PreHandlerRegistration): () => void {
    const handlers = this.preHandlers.get(registration.eventKind) ?? [];
    handlers.push(registration);
    this.preHandlers.set(registration.eventKind, handlers);

    // 返回取消注册函数
    return () => {
      const list = this.preHandlers.get(registration.eventKind);
      if (list) {
        const index = list.findIndex((h) => h.id === registration.id);
        if (index !== -1) {
          list.splice(index, 1);
        }
      }
    };
  }

  /**
   * 移除指定 Ability 的所有处理器
   */
  removeHandlersByAbilityId(abilityId: string): void {
    for (const [eventKind, handlers] of this.preHandlers) {
      const filtered = handlers.filter((h) => h.abilityId !== abilityId);
      if (filtered.length !== handlers.length) {
        this.preHandlers.set(eventKind, filtered);
      }
    }
  }

  /**
   * 移除指定 Actor 的所有处理器
   */
  removeHandlersByOwnerId(ownerId: string): void {
    for (const [eventKind, handlers] of this.preHandlers) {
      const filtered = handlers.filter((h) => h.ownerId !== ownerId);
      if (filtered.length !== handlers.length) {
        this.preHandlers.set(eventKind, filtered);
      }
    }
  }

  // ========== Pre 阶段处理 ==========

  /**
   * 处理 Pre 阶段事件
   *
   * 遍历所有注册的处理器，收集意图并应用修改。
   * 如果任何处理器返回 cancel，事件将被取消。
   *
   * @param event 原始事件
   * @param gameplayState 游戏状态
   * @returns 可变事件（可能被修改或取消）
   */
  processPreEvent<T extends GameEventBase>(
    event: T,
    gameplayState: unknown
  ): MutableEvent<T> {
    const mutable = createMutableEvent(event, 'pre') as MutableEventImpl<T>;

    // 深度检查
    if (this.currentDepth >= this.maxDepth) {
      getLogger().error(`Event recursion depth exceeded: ${this.currentDepth}`, {
        eventKind: event.kind,
      });
      return mutable;
    }

    // 创建追踪记录
    const trace = this.createTrace(event, 'pre');
    const parentTraceId = this.currentTraceId;

    this.currentDepth++;
    this.currentTraceId = trace.traceId;

    try {
      // 获取该事件类型的所有处理器
      const handlers = this.preHandlers.get(event.kind) ?? [];

      for (const registration of handlers) {
        // 条件过滤
        if (registration.filter && !registration.filter(event)) {
          continue;
        }

        // 创建处理器上下文
        const handlerContext: PreEventHandlerContext = {
          ownerId: registration.ownerId,
          abilityId: registration.abilityId,
          configId: registration.configId,
          gameplayState,
        };

        // 调用处理器
        const startTime = Date.now();
        let intent: PreEventIntent;
        let handlerError: { message: string; stack?: string } | undefined;

        try {
          intent = registration.handler(mutable, handlerContext);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          handlerError = { message: errorMessage, stack: errorStack };

          getLogger().error(`PreEventHandler error: ${registration.id}`, {
            error: errorMessage,
            stack: errorStack,
            eventKind: event.kind,
            ownerId: registration.ownerId,
          });
          intent = { type: 'pass' };
        }

        const executionTime = Date.now() - startTime;

        // 记录意图（包含错误信息）
        if (this.traceLevel >= 2) {
          (trace.intents as IntentRecord[]).push({
            handlerId: registration.id,
            handlerName: registration.name ?? registration.configId,
            intent,
            executionTime,
            error: handlerError,
          });
        } else if (this.traceLevel >= 1 && handlerError) {
          // traceLevel 1 时也记录错误
          (trace.intents as IntentRecord[]).push({
            handlerId: registration.id,
            handlerName: registration.name ?? registration.configId,
            intent,
            error: handlerError,
          });
        }

        // 应用意图
        if (intent.type === 'cancel') {
          mutable.cancel(intent.handlerId, intent.reason);
          (trace as { cancelled: boolean }).cancelled = true;
          (trace as { cancelReason?: string }).cancelReason = intent.reason;
          (trace as { cancelledBy?: string }).cancelledBy = intent.handlerId;
          break;
        } else if (intent.type === 'modify') {
          // 为每个修改添加来源信息
          const modificationsWithSource = intent.modifications.map((mod) => ({
            ...mod,
            sourceId: mod.sourceId ?? intent.handlerId,
            sourceName: mod.sourceName ?? registration.name ?? registration.configId,
          }));
          mutable.addModifications(modificationsWithSource);
        }
      }

      // 记录最终值
      if (this.traceLevel >= 1) {
        (trace as { originalValues: Record<string, unknown> }).originalValues =
          mutable.getOriginalValues();
        (trace as { finalValues: Record<string, unknown> }).finalValues =
          mutable.getFinalValues();
      }
    } finally {
      this.currentDepth--;
      this.currentTraceId = parentTraceId;
      this.finalizeTrace(trace);
    }

    return mutable;
  }

  // ========== Post 阶段处理 ==========

  /**
   * 处理 Post 阶段事件
   *
   * 广播事件到所有 Actor 的 AbilitySet，触发响应型被动。
   * 被动产生的新事件会通过 Action 递归处理。
   *
   * @param event 事件
   * @param actors Actor 列表
   * @param gameplayState 游戏状态
   */
  processPostEvent(
    event: GameEventBase,
    actors: Actor[],
    gameplayState: unknown
  ): void {
    // 深度检查
    if (this.currentDepth >= this.maxDepth) {
      getLogger().error(`Event recursion depth exceeded: ${this.currentDepth}`, {
        eventKind: event.kind,
      });
      return;
    }

    // 创建追踪记录
    const trace = this.createTrace(event, 'post');
    const parentTraceId = this.currentTraceId;

    this.currentDepth++;
    this.currentTraceId = trace.traceId;

    try {
      // 广播到所有 Actor
      for (const actor of actors) {
        if (!actor.isActive) continue;

        if (hasAbilitySet(actor)) {
          try {
            actor.abilitySet.receiveEvent(event, gameplayState);
          } catch (error) {
            getLogger().error(`AbilitySet event error: ${actor.id}`, {
              error,
              eventKind: event.kind,
            });
          }
        }
      }
    } finally {
      this.currentDepth--;
      this.currentTraceId = parentTraceId;
      this.finalizeTrace(trace);
    }
  }

  /**
   * 处理 Post 阶段事件（仅相关 Actor）
   */
  processPostEventToRelated(
    event: GameEventBase,
    actors: Actor[],
    relatedActorIds: Set<string>,
    gameplayState: unknown
  ): void {
    // 深度检查
    if (this.currentDepth >= this.maxDepth) {
      getLogger().error(`Event recursion depth exceeded: ${this.currentDepth}`, {
        eventKind: event.kind,
      });
      return;
    }

    // 创建追踪记录
    const trace = this.createTrace(event, 'post');
    const parentTraceId = this.currentTraceId;

    this.currentDepth++;
    this.currentTraceId = trace.traceId;

    try {
      // 广播到相关 Actor
      for (const actor of actors) {
        if (!actor.isActive || !relatedActorIds.has(actor.id)) continue;

        if (hasAbilitySet(actor)) {
          try {
            actor.abilitySet.receiveEvent(event, gameplayState);
          } catch (error) {
            getLogger().error(`AbilitySet event error: ${actor.id}`, {
              error,
              eventKind: event.kind,
            });
          }
        }
      }
    } finally {
      this.currentDepth--;
      this.currentTraceId = parentTraceId;
      this.finalizeTrace(trace);
    }
  }

  // ========== 追踪系统 ==========

  /**
   * 获取所有追踪记录
   */
  getTraces(): readonly EventProcessingTrace[] {
    return this.traces;
  }

  /**
   * 清空追踪记录
   */
  clearTraces(): void {
    this.traces = [];
  }

  /**
   * 获取当前递归深度
   */
  getCurrentDepth(): number {
    return this.currentDepth;
  }

  /**
   * 获取当前追踪 ID
   */
  getCurrentTraceId(): string | undefined {
    return this.currentTraceId;
  }

  /**
   * 导出追踪日志
   */
  exportTraceLog(): string {
    if (this.traces.length === 0) {
      return '(No traces recorded)';
    }

    const lines: string[] = [];

    for (const trace of this.traces) {
      lines.push('');
      lines.push(`[Trace ${trace.traceId}] ${trace.eventKind} (${trace.phase}, depth: ${trace.depth})`);

      if (trace.parentTraceId) {
        lines.push(`  Parent: ${trace.parentTraceId}`);
      }

      // Pre 阶段详情
      if (trace.phase === 'pre') {
        if (Object.keys(trace.originalValues).length > 0) {
          lines.push(`  Original: ${JSON.stringify(trace.originalValues)}`);
        }

        if (trace.intents.length > 0) {
          for (const record of trace.intents) {
            const intentType = record.intent.type;
            const errorSuffix = record.error ? ' ⚠️ ERROR' : '';
            lines.push(`  [${record.handlerName ?? record.handlerId}] → ${intentType}${errorSuffix}`);

            if (record.error) {
              lines.push(`    Error: ${record.error.message}`);
            } else if (record.intent.type === 'cancel') {
              lines.push(`    Reason: ${record.intent.reason}`);
            } else if (record.intent.type === 'modify') {
              for (const mod of record.intent.modifications) {
                lines.push(`    ${mod.field}: ${mod.operation} ${mod.value}`);
              }
            }
          }
        }

        if (trace.cancelled) {
          lines.push(`  CANCELLED by ${trace.cancelledBy}: ${trace.cancelReason}`);
        } else if (Object.keys(trace.finalValues).length > 0) {
          lines.push(`  Final: ${JSON.stringify(trace.finalValues)}`);
        }
      }

      const duration = trace.endTime ? trace.endTime - trace.startTime : 0;
      lines.push(`  Duration: ${duration}ms`);
    }

    return lines.join('\n');
  }

  // ========== 内部方法 ==========

  /**
   * 创建追踪记录
   */
  private createTrace(event: GameEventBase, phase: 'pre' | 'post'): EventProcessingTrace {
    const trace: EventProcessingTrace = {
      traceId: createTraceId(),
      eventKind: event.kind,
      phase,
      depth: this.currentDepth,
      parentTraceId: this.currentTraceId,
      intents: [],
      originalValues: {},
      finalValues: {},
      cancelled: false,
      startTime: Date.now(),
    };

    if (this.traceLevel > 0) {
      this.traces.push(trace);
    }

    return trace;
  }

  /**
   * 完成追踪记录
   */
  private finalizeTrace(trace: EventProcessingTrace): void {
    (trace as { endTime?: number }).endTime = Date.now();
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 EventProcessor
 */
export function createEventProcessor(config?: EventProcessorConfig): EventProcessor {
  return new EventProcessor(config);
}
