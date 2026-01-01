/**
 * 事件收集器
 *
 * 在逻辑执行过程中收集所有产生的事件。
 * 收集的事件与 GameEventBase 同类型，既可用于逻辑层触发，也可输出给表演层。
 *
 * @example
 * ```typescript
 * // 在 Action 中发出事件
 * const event: DamageGameEvent = {
 *   kind: 'damage',
 *   logicTime: ctx.triggerEvent.logicTime,
 *   source: ctx.source,
 *   target,
 *   damage: 50,
 * };
 * ctx.eventCollector.emit(event);
 * ```
 */

import type { GameEventBase } from './GameEvent.js';

/**
 * 事件收集器
 *
 * 收集 GameEventBase 类型的事件，统一事件模型。
 */
export class EventCollector {
  private events: GameEventBase[] = [];

  /**
   * 发出事件
   *
   * @returns 返回传入的事件（方便链式调用）
   */
  emit<T extends GameEventBase>(event: T): T {
    this.events.push(event);
    return event;
  }

  // ========== 收集管理 ==========

  /**
   * 收集所有事件（不清空）
   */
  collect(): GameEventBase[] {
    return [...this.events];
  }

  /**
   * 收集并清空事件
   */
  flush(): GameEventBase[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  /**
   * 清空事件
   */
  clear(): void {
    this.events = [];
  }

  /**
   * 获取事件数量
   */
  get count(): number {
    return this.events.length;
  }

  /**
   * 检查是否有事件
   */
  get hasEvents(): boolean {
    return this.events.length > 0;
  }

  /**
   * 按 kind 过滤事件
   */
  filterByKind<T extends GameEventBase>(kind: string): T[] {
    return this.events.filter((e) => e.kind === kind) as T[];
  }

  /**
   * 合并另一个收集器的事件
   */
  merge(other: EventCollector): void {
    this.events.push(...other.events);
  }
}
