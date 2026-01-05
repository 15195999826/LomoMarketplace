/**
 * StandardAbilitySystem - 标准能力系统
 *
 * 这是框架提供的标准实现，负责：
 * 1. 驱动所有 Actor 的 AbilitySet.tick()
 * 2. 广播 GameEvent 到所有 Actor 的 AbilitySet
 * 3. 处理 Pre/Post 双阶段事件（通过 GameWorld.eventProcessor）
 *
 * ## 标准实现说明
 *
 * 这是一个可选的标准实现，项目可以：
 * - 直接使用此实现
 * - 继承此类进行扩展
 * - 基于 core 的 System 基类完全自行实现
 *
 * 如果项目需要自定义的广播策略、事件过滤、或其他高级功能，
 * 建议基于 core 自行实现 System。
 *
 * ## Pre/Post 双阶段事件处理
 *
 * ```typescript
 * // 处理 Pre 阶段（可被修改或取消）
 * const mutable = abilitySystem.processPreEvent(preDamageEvent, gameplayState);
 * if (!mutable.cancelled) {
 *   const finalDamage = mutable.getCurrentValue('damage') as number;
 *   target.hp -= finalDamage;
 *
 *   // 处理 Post 阶段（触发响应型被动）
 *   abilitySystem.processPostEvent(postDamageEvent, actors, gameplayState);
 * }
 * ```
 */

import { System, SystemPriority } from '../../core/entity/System.js';
import type { Actor } from '../../core/entity/Actor.js';
import type { GameEventBase } from '../../core/events/GameEvent.js';
import { hasAbilitySet } from '../../core/abilities/AbilitySet.js';
import { getLogger } from '../../core/utils/Logger.js';
import type { EventProcessor } from '../../core/events/EventProcessor.js';
import type { MutableEvent } from '../../core/events/EventPhase.js';
import { GameWorld } from '../../core/world/GameWorld.js';

/**
 * StandardAbilitySystem - 标准能力系统
 *
 * EventProcessor 从 GameWorld 全局单例获取，不再由 System 内部创建。
 */
export class StandardAbilitySystem extends System {
  readonly type = 'AbilitySystem';

  constructor() {
    super(SystemPriority.NORMAL);
  }

  /**
   * 获取事件处理器（从 GameWorld 全局单例获取）
   *
   * 可用于注册 Pre 阶段处理器或查看追踪日志。
   */
  getEventProcessor(): EventProcessor {
    return GameWorld.getInstance().eventProcessor;
  }

  /**
   * 每帧更新
   * 遍历所有 Actor，调用其 AbilitySet.tick()
   */
  tick(actors: Actor[], dt: number): void {
    for (const actor of actors) {
      if (!actor.isActive) {
        continue;
      }

      if (hasAbilitySet(actor)) {
        try {
          actor.abilitySet.tick(dt);
        } catch (error) {
          getLogger().error(`AbilitySet tick error: ${actor.id}`, { error });
        }
      }
    }
  }

  /**
   * 广播事件到所有 Actor 的 AbilitySet
   *
   * @param event 游戏事件
   * @param actors Actor 列表
   * @param gameplayState 游戏状态（快照或实例引用）
   */
  broadcastEvent(event: GameEventBase, actors: Actor[], gameplayState: unknown): void {
    for (const actor of actors) {
      if (!actor.isActive) {
        continue;
      }

      if (hasAbilitySet(actor)) {
        try {
          actor.abilitySet.receiveEvent(event, gameplayState);
        } catch (error) {
          getLogger().error(`AbilitySet event error: ${actor.id}`, { error, event: event.kind });
        }
      }
    }
  }

  /**
   * 广播事件到指定 Actor 列表
   * 仅分发到与事件相关的 Actor
   *
   * @param event 游戏事件
   * @param actors Actor 列表
   * @param relatedActorIds 相关 Actor ID 集合
   * @param gameplayState 游戏状态（快照或实例引用）
   */
  broadcastEventToRelated(
    event: GameEventBase,
    actors: Actor[],
    relatedActorIds: Set<string>,
    gameplayState: unknown
  ): void {
    for (const actor of actors) {
      if (!actor.isActive || !relatedActorIds.has(actor.id)) {
        continue;
      }

      if (hasAbilitySet(actor)) {
        try {
          actor.abilitySet.receiveEvent(event, gameplayState);
        } catch (error) {
          getLogger().error(`AbilitySet event error: ${actor.id}`, { error, event: event.kind });
        }
      }
    }
  }

  // ========== Pre/Post 双阶段事件处理 ==========

  /**
   * 处理 Pre 阶段事件
   *
   * 执行两步操作：
   * 1. 广播事件到所有 Actor（触发 NoInstanceComponent 等响应）
   * 2. 收集 PreEventComponent 的 Intent，应用修改或取消
   *
   * 这样设计允许：
   * - Pre 阶段触发的被动（如叠盾）可以影响本次事件
   * - PreEventComponent 可以基于最新状态返回 Intent
   *
   * @param event 原始事件（如 pre_damage）
   * @param actors Actor 列表
   * @param gameplayState 游戏状态
   * @returns 可变事件（可能被修改或取消）
   *
   * @example
   * ```typescript
   * const mutable = abilitySystem.processPreEvent(preDamageEvent, actors, gameplayState);
   * if (!mutable.cancelled) {
   *   const finalDamage = mutable.getCurrentValue('damage') as number;
   *   target.hp -= finalDamage;
   *
   *   // Post 阶段
   *   abilitySystem.processPostEvent(postDamageEvent, actors, gameplayState);
   * }
   * ```
   */
  processPreEvent<T extends GameEventBase>(
    event: T,
    actors: Actor[],
    gameplayState: unknown
  ): MutableEvent<T> {
    // 1. 广播事件到所有 Actor（触发 NoInstanceComponent 等响应）
    this.broadcastEvent(event, actors, gameplayState);

    // 2. 收集 PreEventComponent 的 Intent，应用修改或取消
    return this.getEventProcessor().processPreEvent(event, gameplayState);
  }

  /**
   * 处理 Post 阶段事件
   *
   * 广播事件到所有 Actor 的 AbilitySet，触发响应型被动。
   * 被动产生的新事件会深度优先递归处理。
   *
   * @param event 事件（如 post_damage）
   * @param actors Actor 列表
   * @param gameplayState 游戏状态
   *
   * @example
   * ```typescript
   * // 伤害生效后，触发反伤等被动
   * abilitySystem.processPostEvent(postDamageEvent, actors, gameplayState);
   * ```
   */
  processPostEvent(
    event: GameEventBase,
    actors: Actor[],
    gameplayState: unknown
  ): void {
    this.getEventProcessor().processPostEvent(event, actors, gameplayState);
  }

  /**
   * 处理 Post 阶段事件（仅相关 Actor）
   *
   * @param event 事件
   * @param actors Actor 列表
   * @param relatedActorIds 相关 Actor ID 集合
   * @param gameplayState 游戏状态
   */
  processPostEventToRelated(
    event: GameEventBase,
    actors: Actor[],
    relatedActorIds: Set<string>,
    gameplayState: unknown
  ): void {
    this.getEventProcessor().processPostEventToRelated(event, actors, relatedActorIds, gameplayState);
  }

  /**
   * 获取追踪日志
   *
   * 用于调试，查看事件处理过程。
   */
  getTraceLog(): string {
    return this.getEventProcessor().exportTraceLog();
  }

  /**
   * 清空追踪记录
   */
  clearTraces(): void {
    this.getEventProcessor().clearTraces();
  }
}
