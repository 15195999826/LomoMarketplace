/**
 * 事件收集器
 *
 * 在战斗执行过程中收集所有产生的事件
 * 执行完成后一次性返回给表演层
 */

import { generateId } from '../utils/IdGenerator.js';
import type { ActorRef } from '../types/common.js';
import type { BattleEvent } from './BattleEvent.js';
import {
  createBattleEvent,
  EventTypes,
  type DamageEventPayload,
  type HealEventPayload,
  type BuffAppliedEventPayload,
  type BuffRemovedEventPayload,
  type DeathEventPayload,
  type ErrorEventPayload,
} from './BattleEvent.js';

/**
 * 事件收集器
 */
export class EventCollector {
  private events: BattleEvent[] = [];
  private currentLogicTime: number = 0;

  /**
   * 设置当前逻辑时间
   */
  setLogicTime(time: number): void {
    this.currentLogicTime = time;
  }

  /**
   * 获取当前逻辑时间
   */
  getLogicTime(): number {
    return this.currentLogicTime;
  }

  /**
   * 发出通用事件
   */
  emit<T>(type: string, payload: T, logicTime?: number): BattleEvent<T> {
    const event = createBattleEvent(
      type,
      logicTime ?? this.currentLogicTime,
      payload,
      generateId('evt')
    );
    this.events.push(event);
    return event;
  }

  // ========== 便捷方法 ==========

  /**
   * 发出伤害事件
   */
  emitDamage(
    source: ActorRef,
    target: ActorRef,
    damage: number,
    options: {
      damageType?: string;
      isCritical?: boolean;
      isKill?: boolean;
    } = {}
  ): BattleEvent<DamageEventPayload> {
    return this.emit<DamageEventPayload>(EventTypes.DAMAGE, {
      source,
      target,
      damage,
      damageType: options.damageType,
      isCritical: options.isCritical ?? false,
      isKill: options.isKill ?? false,
    });
  }

  /**
   * 发出治疗事件
   */
  emitHeal(
    source: ActorRef,
    target: ActorRef,
    healAmount: number,
    overheal?: number
  ): BattleEvent<HealEventPayload> {
    return this.emit<HealEventPayload>(EventTypes.HEAL, {
      source,
      target,
      healAmount,
      overheal,
    });
  }

  /**
   * 发出 Buff 应用事件
   */
  emitBuffApplied(
    source: ActorRef,
    target: ActorRef,
    buffId: string,
    options: {
      buffName?: string;
      stacks?: number;
      duration?: number;
      isRefresh?: boolean;
    } = {}
  ): BattleEvent<BuffAppliedEventPayload> {
    return this.emit<BuffAppliedEventPayload>(EventTypes.BUFF_APPLIED, {
      source,
      target,
      buffId,
      buffName: options.buffName,
      stacks: options.stacks ?? 1,
      duration: options.duration,
      isRefresh: options.isRefresh ?? false,
    });
  }

  /**
   * 发出 Buff 移除事件
   */
  emitBuffRemoved(
    target: ActorRef,
    buffId: string,
    reason: BuffRemovedEventPayload['reason']
  ): BattleEvent<BuffRemovedEventPayload> {
    return this.emit<BuffRemovedEventPayload>(EventTypes.BUFF_REMOVED, {
      target,
      buffId,
      reason,
    });
  }

  /**
   * 发出死亡事件
   */
  emitDeath(
    target: ActorRef,
    killer?: ActorRef,
    damageSource?: string
  ): BattleEvent<DeathEventPayload> {
    return this.emit<DeathEventPayload>(EventTypes.DEATH, {
      target,
      killer,
      damageSource,
    });
  }

  /**
   * 发出错误事件
   */
  emitError(
    errorType: ErrorEventPayload['errorType'],
    message: string,
    context?: Record<string, unknown>
  ): BattleEvent<ErrorEventPayload> {
    return this.emit<ErrorEventPayload>(EventTypes.ERROR, {
      errorType,
      message,
      context,
    });
  }

  // ========== 收集管理 ==========

  /**
   * 收集所有事件
   */
  collect(): BattleEvent[] {
    return [...this.events];
  }

  /**
   * 收集并清空事件
   */
  flush(): BattleEvent[] {
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
   * 按类型过滤事件
   */
  filterByType<T>(type: string): BattleEvent<T>[] {
    return this.events.filter((e) => e.type === type) as BattleEvent<T>[];
  }

  /**
   * 合并另一个收集器的事件
   */
  merge(other: EventCollector): void {
    this.events.push(...other.events);
  }
}
