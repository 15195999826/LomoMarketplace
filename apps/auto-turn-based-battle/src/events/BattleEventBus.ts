/**
 * 战斗事件总线 - 连接 EventCollector 与监听器
 *
 * 提供事件分发机制，支持：
 * - 按事件类型注册监听器
 * - 从 EventCollector 消费事件并分发
 * - 一次性监听器
 * - 取消订阅
 *
 * ## 使用示例
 *
 * ```typescript
 * const bus = new BattleEventBus();
 *
 * // 注册监听器
 * bus.on('battle.damage', (event) => {
 *   console.log(`${event.sourceId} 对 ${event.targetId} 造成 ${event.damage} 伤害`);
 * });
 *
 * // 消费 EventCollector 中的事件
 * const events = eventCollector.flush();
 * bus.dispatch(events);
 * ```
 */

import type { GameEventBase } from "@lomo/logic-game-framework";
import type { BattleEvent, BattleEventKind } from "./BattleEvents.js";

/**
 * 事件监听器类型
 */
export type BattleEventListener<T extends BattleEvent = BattleEvent> = (
  event: T,
) => void;

/**
 * 监听器配置
 */
interface ListenerEntry {
  /** 监听器函数 */
  listener: BattleEventListener<BattleEvent>;
  /** 是否只触发一次 */
  once: boolean;
}

/**
 * 战斗事件总线
 *
 * 将 EventCollector 收集的事件分发给各个监听器。
 * 支持按事件类型订阅，实现松耦合的事件驱动架构。
 */
export class BattleEventBus {
  /** 按事件类型存储的监听器映射 */
  private _listeners: Map<string, ListenerEntry[]> = new Map();

  /** 全局监听器（监听所有事件） */
  private _globalListeners: ListenerEntry[] = [];

  // ========== 订阅管理 ==========

  /**
   * 注册事件监听器
   *
   * @param kind 事件类型
   * @param listener 监听器函数
   * @returns 取消订阅的函数
   *
   * @example
   * ```typescript
   * const unsubscribe = bus.on('battle.damage', (event) => {
   *   console.log(event.damage);
   * });
   *
   * // 取消订阅
   * unsubscribe();
   * ```
   */
  on<K extends BattleEventKind>(
    kind: K,
    listener: BattleEventListener<Extract<BattleEvent, { kind: K }>>,
  ): () => void {
    return this.addListener(kind, listener as BattleEventListener, false);
  }

  /**
   * 注册一次性事件监听器
   *
   * 触发一次后自动取消订阅。
   *
   * @param kind 事件类型
   * @param listener 监听器函数
   * @returns 取消订阅的函数
   */
  once<K extends BattleEventKind>(
    kind: K,
    listener: BattleEventListener<Extract<BattleEvent, { kind: K }>>,
  ): () => void {
    return this.addListener(kind, listener as BattleEventListener, true);
  }

  /**
   * 注册全局监听器（监听所有事件）
   *
   * @param listener 监听器函数
   * @returns 取消订阅的函数
   *
   * @example
   * ```typescript
   * bus.onAll((event) => {
   *   console.log(`[${event.kind}]`, event);
   * });
   * ```
   */
  onAll(listener: BattleEventListener<BattleEvent>): () => void {
    const entry: ListenerEntry = { listener, once: false };
    this._globalListeners.push(entry);
    return () => this.removeGlobalListener(entry);
  }

  /**
   * 取消指定类型的所有监听器
   *
   * @param kind 事件类型
   */
  off(kind: BattleEventKind): void {
    this._listeners.delete(kind);
  }

  /**
   * 取消所有监听器
   */
  offAll(): void {
    this._listeners.clear();
    this._globalListeners = [];
  }

  /**
   * 添加监听器（内部方法）
   */
  private addListener(
    kind: string,
    listener: BattleEventListener,
    once: boolean,
  ): () => void {
    if (!this._listeners.has(kind)) {
      this._listeners.set(kind, []);
    }

    const entry: ListenerEntry = { listener, once };
    this._listeners.get(kind)!.push(entry);

    return () => this.removeListener(kind, entry);
  }

  /**
   * 移除监听器（内部方法）
   */
  private removeListener(kind: string, entry: ListenerEntry): void {
    const listeners = this._listeners.get(kind);
    if (listeners) {
      const index = listeners.indexOf(entry);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 移除全局监听器（内部方法）
   */
  private removeGlobalListener(entry: ListenerEntry): void {
    const index = this._globalListeners.indexOf(entry);
    if (index !== -1) {
      this._globalListeners.splice(index, 1);
    }
  }

  // ========== 事件分发 ==========

  /**
   * 分发单个事件
   *
   * @param event 要分发的事件
   */
  emit(event: BattleEvent): void {
    // 分发给全局监听器
    this.dispatchToListeners(this._globalListeners, event);

    // 分发给类型监听器
    const listeners = this._listeners.get(event.kind);
    if (listeners) {
      this.dispatchToListeners(listeners, event);
    }
  }

  /**
   * 分发多个事件
   *
   * 通常用于消费 EventCollector.flush() 的结果。
   *
   * @param events 事件数组
   *
   * @example
   * ```typescript
   * // 每帧消费事件
   * const events = battle.eventCollector.flush();
   * eventBus.dispatch(events as BattleEvent[]);
   * ```
   */
  dispatch(events: readonly GameEventBase[]): void {
    for (const event of events) {
      this.emit(event as BattleEvent);
    }
  }

  /**
   * 分发给监听器列表（内部方法）
   */
  private dispatchToListeners(entries: ListenerEntry[], event: BattleEvent): void {
    // 复制数组以防止迭代时修改
    const copy = [...entries];
    const toRemove: ListenerEntry[] = [];

    for (const entry of copy) {
      try {
        entry.listener(event);
      } catch (error) {
        console.error(`[BattleEventBus] Listener error for ${event.kind}:`, error);
      }

      if (entry.once) {
        toRemove.push(entry);
      }
    }

    // 移除一次性监听器
    for (const entry of toRemove) {
      const index = entries.indexOf(entry);
      if (index !== -1) {
        entries.splice(index, 1);
      }
    }
  }

  // ========== 调试 ==========

  /**
   * 获取监听器数量统计
   */
  getListenerStats(): Record<string, number> {
    const stats: Record<string, number> = {
      _global: this._globalListeners.length,
    };

    for (const [kind, listeners] of this._listeners) {
      stats[kind] = listeners.length;
    }

    return stats;
  }

  /**
   * 检查是否有指定类型的监听器
   */
  hasListeners(kind: BattleEventKind): boolean {
    const listeners = this._listeners.get(kind);
    return (listeners && listeners.length > 0) || this._globalListeners.length > 0;
  }
}

/**
 * 创建战斗事件总线实例
 */
export function createBattleEventBus(): BattleEventBus {
  return new BattleEventBus();
}
