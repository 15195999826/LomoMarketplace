/**
 * AbilitySystem
 *
 * 能力系统，负责管理所有 Actor 的 Ability
 * 采用主动分发钩子模式，而非事件订阅
 */

import { System, SystemPriority } from '../entity/System.js';
import type { Actor } from '../entity/Actor.js';
import type { HookContext, ActorRef } from '../types/common.js';
import type { Ability } from './Ability.js';
import { getLogger } from '../utils/Logger.js';

/**
 * 具有能力的 Actor 接口
 */
export interface IAbilityActor extends Actor {
  /** 能力列表 */
  abilities: Ability[];
}

/**
 * 检查 Actor 是否具有能力系统
 */
export function hasAbilities(actor: Actor): actor is IAbilityActor {
  return 'abilities' in actor && Array.isArray((actor as IAbilityActor).abilities);
}

/**
 * 钩子名称常量
 */
export const HookNames = {
  // 战斗事件
  ON_BATTLE_START: 'onBattleStart',
  ON_BATTLE_END: 'onBattleEnd',
  ON_TURN_START: 'onTurnStart',
  ON_TURN_END: 'onTurnEnd',

  // 伤害事件
  ON_DEAL_DAMAGE: 'onDealDamage',
  ON_TAKE_DAMAGE: 'onTakeDamage',
  ON_BEFORE_DAMAGE: 'onBeforeDamage',
  ON_AFTER_DAMAGE: 'onAfterDamage',

  // 治疗事件
  ON_HEAL: 'onHeal',
  ON_BE_HEALED: 'onBeHealed',

  // 击杀事件
  ON_KILL: 'onKill',
  ON_DEATH: 'onDeath',

  // 技能事件
  ON_ABILITY_USED: 'onAbilityUsed',
  ON_ABILITY_HIT: 'onAbilityHit',

  // Buff 事件
  ON_BUFF_APPLIED: 'onBuffApplied',
  ON_BUFF_REMOVED: 'onBuffRemoved',
  ON_BUFF_EXPIRED: 'onBuffExpired',

  // 移动事件
  ON_MOVE: 'onMove',
  ON_ENTER_TILE: 'onEnterTile',
  ON_LEAVE_TILE: 'onLeaveTile',
} as const;

export type HookName = (typeof HookNames)[keyof typeof HookNames];

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
   * 遍历所有 Actor 的 Ability，调用 onTick
   */
  tick(actors: Actor[], dt: number): void {
    for (const actor of actors) {
      if (!actor.isActive || !hasAbilities(actor)) {
        continue;
      }

      const abilityActor = actor as IAbilityActor;
      const expiredAbilities: Ability[] = [];

      for (const ability of abilityActor.abilities) {
        if (ability.isExpired) {
          expiredAbilities.push(ability);
          continue;
        }

        try {
          ability.tick(dt);
        } catch (error) {
          getLogger().error(`Ability tick error: ${ability.id}`, { error });
        }
      }

      // 移除过期的 Ability
      for (const expired of expiredAbilities) {
        this.removeAbilityFromActor(abilityActor, expired);
      }
    }
  }

  /**
   * 分发钩子到相关 Actor 的 Ability
   * 使用主动分发模式，而非事件订阅
   */
  dispatchHook(hookName: string, context: HookContext, actors: Actor[]): void {
    // 根据上下文确定相关的 Actor
    const relatedActorIds = new Set(context.relatedActors.map((r) => r.id));

    for (const actor of actors) {
      if (!actor.isActive || !hasAbilities(actor)) {
        continue;
      }

      // 只处理相关的 Actor
      if (!relatedActorIds.has(actor.id)) {
        continue;
      }

      const abilityActor = actor as IAbilityActor;
      for (const ability of abilityActor.abilities) {
        if (ability.isExpired) {
          continue;
        }

        try {
          ability.dispatchHook(hookName, context);
        } catch (error) {
          getLogger().error(`Ability hook error: ${ability.id}`, { error, hookName });
        }
      }
    }
  }

  /**
   * 向 Actor 添加 Ability
   */
  addAbilityToActor(actor: IAbilityActor, ability: Ability): void {
    actor.abilities.push(ability);
    ability.activate();
  }

  /**
   * 从 Actor 移除 Ability
   */
  removeAbilityFromActor(actor: IAbilityActor, ability: Ability): boolean {
    const index = actor.abilities.indexOf(ability);
    if (index === -1) {
      return false;
    }

    ability.expire();
    actor.abilities.splice(index, 1);
    return true;
  }

  /**
   * 根据 ID 移除 Ability
   */
  removeAbilityById(actor: IAbilityActor, abilityId: string): boolean {
    const ability = actor.abilities.find((a) => a.id === abilityId);
    if (!ability) {
      return false;
    }
    return this.removeAbilityFromActor(actor, ability);
  }

  /**
   * 根据 configId 移除 Ability
   */
  removeAbilitiesByConfigId(actor: IAbilityActor, configId: string): number {
    const toRemove = actor.abilities.filter((a) => a.configId === configId);
    for (const ability of toRemove) {
      this.removeAbilityFromActor(actor, ability);
    }
    return toRemove.length;
  }

  /**
   * 根据标签移除 Ability
   */
  removeAbilitiesByTag(actor: IAbilityActor, tag: string): number {
    const toRemove = actor.abilities.filter((a) => a.hasTag(tag));
    for (const ability of toRemove) {
      this.removeAbilityFromActor(actor, ability);
    }
    return toRemove.length;
  }

  /**
   * 获取 Actor 的所有 Ability
   */
  getAbilities(actor: IAbilityActor): readonly Ability[] {
    return actor.abilities;
  }

  /**
   * 根据 configId 查找 Ability
   */
  findAbilityByConfigId(actor: IAbilityActor, configId: string): Ability | undefined {
    return actor.abilities.find((a) => a.configId === configId);
  }

  /**
   * 根据标签查找 Ability
   */
  findAbilitiesByTag(actor: IAbilityActor, tag: string): Ability[] {
    return actor.abilities.filter((a) => a.hasTag(tag));
  }
}

/**
 * 创建钩子上下文的辅助函数
 */
export function createHookContext(
  hookName: string,
  relatedActors: ActorRef[],
  data: Record<string, unknown> = {}
): HookContext {
  return {
    hookName,
    relatedActors,
    data,
  };
}
