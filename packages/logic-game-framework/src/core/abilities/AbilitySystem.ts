/**
 * AbilitySystem
 *
 * 全局能力系统，负责：
 * 1. 驱动所有 Actor 的 AbilitySet.tick()
 * 2. 广播 GameEvent 到所有 Actor 的 AbilitySet
 *
 * 注意：具体的 Ability 管理已委托给各 Actor 的 AbilitySet
 */

import { System, SystemPriority } from '../entity/System.js';
import type { Actor } from '../entity/Actor.js';
import type { GameEvent } from '../events/GameEvent.js';
import { hasAbilitySet } from './AbilitySet.js';
import { getLogger } from '../utils/Logger.js';

/**
 * AbilitySystem
 */
export class AbilitySystem extends System {
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
   * 用于触发被动技能等事件响应
   */
  broadcastEvent(event: GameEvent, actors: Actor[]): void {
    for (const actor of actors) {
      if (!actor.isActive) {
        continue;
      }

      if (hasAbilitySet(actor)) {
        try {
          actor.abilitySet.receiveEvent(event);
        } catch (error) {
          getLogger().error(`AbilitySet event error: ${actor.id}`, { error, event: event.kind });
        }
      }
    }
  }

  /**
   * 广播事件到指定 Actor 列表
   * 仅分发到与事件相关的 Actor
   */
  broadcastEventToRelated(event: GameEvent, actors: Actor[], relatedActorIds: Set<string>): void {
    for (const actor of actors) {
      if (!actor.isActive || !relatedActorIds.has(actor.id)) {
        continue;
      }

      if (hasAbilitySet(actor)) {
        try {
          actor.abilitySet.receiveEvent(event);
        } catch (error) {
          getLogger().error(`AbilitySet event error: ${actor.id}`, { error, event: event.kind });
        }
      }
    }
  }
}

// Re-export for backwards compatibility
export { hasAbilitySet } from './AbilitySet.js';
