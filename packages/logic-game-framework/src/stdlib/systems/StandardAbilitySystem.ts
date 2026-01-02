/**
 * StandardAbilitySystem - 标准能力系统
 *
 * 这是框架提供的标准实现，负责：
 * 1. 驱动所有 Actor 的 AbilitySet.tick()
 * 2. 广播 GameEvent 到所有 Actor 的 AbilitySet
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
 */

import { System, SystemPriority } from '../../core/entity/System.js';
import type { Actor } from '../../core/entity/Actor.js';
import type { GameEventBase } from '../../core/events/GameEvent.js';
import { hasAbilitySet } from '../../core/abilities/AbilitySet.js';
import { getLogger } from '../../core/utils/Logger.js';

/**
 * StandardAbilitySystem - 标准能力系统
 */
export class StandardAbilitySystem extends System {
  readonly type = 'AbilitySystem';

  constructor() {
    super(SystemPriority.NORMAL);
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
}
