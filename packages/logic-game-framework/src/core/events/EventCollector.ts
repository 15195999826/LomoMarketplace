/**
 * 事件收集器
 *
 * 在逻辑执行过程中收集所有产生的事件。
 * 收集的事件与 GameEventBase 同类型，既可用于逻辑层触发，也可输出给表演层。
 *
 * ## 获取事件的两种方式
 *
 * | 方法 | 行为 | 适用场景 |
 * |------|------|----------|
 * | `collect()` | 返回副本，不清空 | 调试、日志、只读查询 |
 * | `flush()` | 返回原数组，清空缓冲区 | 表演层消费、帧结束处理 |
 *
 * ## 典型使用模式
 *
 * ```typescript
 * // 方式1：每帧消费事件（推荐）
 * const events = instance.flushEvents();
 * performanceLayer.play(events);
 *
 * // 方式2：调试时查看事件
 * console.log('Collected:', instance.getCollectedEvents());
 * ```
 *
 * @example
 * ```typescript
 * // 在 Action 中发出事件
 * const currentEvent = getCurrentEvent(ctx);
 * const event: DamageGameEvent = {
 *   kind: 'damage',
 *   logicTime: currentEvent.logicTime,
 *   source,
 *   target,
 *   damage: 50,
 * };
 * ctx.eventCollector.push(event);
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
   * 推入事件
   *
   * @returns 返回传入的事件（方便链式调用）
   */
  push<T extends GameEventBase>(event: T): T {
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
