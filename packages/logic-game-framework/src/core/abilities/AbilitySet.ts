/**
 * AbilitySet - 能力集合
 *
 * 取代 Actor.abilities: Ability[]，统一管理 Actor 的所有能力。
 * 持有 AttributeSet 和 OwnerActor 引用，提供事件分发和 Ability 生命周期管理。
 *
 * ## 核心职责
 * - 管理 Ability 的获得 (grant) 和移除 (revoke)
 * - 分发事件到所有 Ability 的 Component
 * - 驱动内部 Hook (tick)
 * - 提供回调机制
 */

import type { ActorRef } from '../types/common.js';
import type { AttributeSet, AttributesConfig, IAttributeModifierTarget } from '../attributes/defineAttributes.js';
import type { GameEvent } from '../events/GameEvent.js';
import type { Ability } from './Ability.js';
import type { ComponentLifecycleContext } from './AbilityComponent.js';
import { getLogger } from '../utils/Logger.js';

// ========== 类型定义 ==========

/**
 * Ability 移除原因
 */
export type AbilityRevokeReason = 'expired' | 'dispelled' | 'replaced' | 'manual';

/**
 * Ability 获得回调
 */
export type AbilityGrantedCallback = (ability: Ability, abilitySet: AbilitySet<AttributesConfig>) => void;

/**
 * Ability 移除回调
 */
export type AbilityRevokedCallback = (
  ability: Ability,
  reason: AbilityRevokeReason,
  abilitySet: AbilitySet<AttributesConfig>
) => void;

/**
 * AbilitySet 配置
 */
export type AbilitySetConfig<T extends AttributesConfig> = {
  /** 所有者引用 */
  owner: ActorRef;
  /** 属性集 */
  attributes: AttributeSet<T>;
};

// ========== AbilitySet 类 ==========

/**
 * AbilitySet - 能力集合
 */
export class AbilitySet<T extends AttributesConfig> {
  /** 所有者引用 */
  readonly owner: ActorRef;

  /** 属性集 */
  readonly attributes: AttributeSet<T>;

  /** Modifier 写入接口 */
  private readonly modifierTarget: IAttributeModifierTarget;

  /** 能力列表 */
  private abilities: Ability[] = [];

  /** Ability 获得回调 */
  private onGrantedCallbacks: AbilityGrantedCallback[] = [];

  /** Ability 移除回调 */
  private onRevokedCallbacks: AbilityRevokedCallback[] = [];

  constructor(config: AbilitySetConfig<T>) {
    this.owner = config.owner;
    this.attributes = config.attributes;
    this.modifierTarget = config.attributes._modifierTarget;
  }

  // ========== Ability 管理 ==========

  /**
   * 获得 Ability
   *
   * @param ability 要添加的 Ability（Component 已在构造时注入）
   */
  grantAbility(ability: Ability): void {
    // 检查重复
    if (this.abilities.some((a) => a.id === ability.id)) {
      getLogger().warn(`Ability already granted: ${ability.id}`);
      return;
    }

    // 添加到列表
    this.abilities.push(ability);

    // 激活 Ability（传入 lifecycle context）
    const lifecycleContext = this.createLifecycleContext(ability);
    ability.activate(lifecycleContext);

    // 触发回调
    this.notifyGranted(ability);
  }

  /**
   * 移除 Ability
   *
   * @param abilityId 要移除的 Ability ID
   * @param reason 移除原因
   */
  revokeAbility(abilityId: string, reason: AbilityRevokeReason = 'manual'): boolean {
    const index = this.abilities.findIndex((a) => a.id === abilityId);
    if (index === -1) {
      return false;
    }

    const ability = this.abilities[index];

    // 失效 Ability（移除 Modifier）
    ability.expire();

    // 从列表移除
    this.abilities.splice(index, 1);

    // 触发回调
    this.notifyRevoked(ability, reason);

    return true;
  }

  /**
   * 根据 configId 移除 Ability
   */
  revokeAbilitiesByConfigId(configId: string, reason: AbilityRevokeReason = 'manual'): number {
    const toRevoke = this.abilities.filter((a) => a.configId === configId);
    for (const ability of toRevoke) {
      this.revokeAbility(ability.id, reason);
    }
    return toRevoke.length;
  }

  /**
   * 根据标签移除 Ability
   */
  revokeAbilitiesByTag(tag: string, reason: AbilityRevokeReason = 'manual'): number {
    const toRevoke = this.abilities.filter((a) => a.hasTag(tag));
    for (const ability of toRevoke) {
      this.revokeAbility(ability.id, reason);
    }
    return toRevoke.length;
  }

  // ========== 内部 Hook ==========

  /**
   * Tick 更新
   * 分发到所有 Ability，驱动 DurationComponent 等
   */
  tick(dt: number): void {
    // 收集过期的 Ability
    const expiredAbilities: Ability[] = [];

    for (const ability of this.abilities) {
      if (ability.isExpired) {
        expiredAbilities.push(ability);
        continue;
      }

      try {
        ability.tick(dt);
      } catch (error) {
        getLogger().error(`Ability tick error: ${ability.id}`, { error });
      }

      // 检查是否因 tick 而过期
      if (ability.isExpired) {
        expiredAbilities.push(ability);
      }
    }

    // 清理过期的 Ability
    for (const expired of expiredAbilities) {
      this.revokeAbility(expired.id, 'expired');
    }
  }

  // ========== 事件接收 ==========

  /**
   * 接收游戏事件
   *
   * 将事件分发到所有 Ability 的 Component（ActionComponent 响应）
   */
  receiveEvent(event: GameEvent): void {
    // 收集过期的 Ability
    const expiredAbilities: Ability[] = [];

    for (const ability of this.abilities) {
      if (ability.isExpired) {
        expiredAbilities.push(ability);
        continue;
      }

      try {
        const context = this.createLifecycleContext(ability);
        ability.receiveEvent(event, context);
      } catch (error) {
        getLogger().error(`Ability event handling error: ${ability.id}`, { error, event: event.kind });
      }

      // 检查是否因事件处理而过期
      if (ability.isExpired) {
        expiredAbilities.push(ability);
      }
    }

    // 清理过期的 Ability
    for (const expired of expiredAbilities) {
      this.revokeAbility(expired.id, 'expired');
    }
  }

  // ========== 查询方法 ==========

  /**
   * 获取所有 Ability（只读）
   */
  getAbilities(): readonly Ability[] {
    return this.abilities;
  }

  /**
   * 根据 ID 查找 Ability
   */
  findAbilityById(id: string): Ability | undefined {
    return this.abilities.find((a) => a.id === id);
  }

  /**
   * 根据 configId 查找 Ability
   */
  findAbilityByConfigId(configId: string): Ability | undefined {
    return this.abilities.find((a) => a.configId === configId);
  }

  /**
   * 根据 configId 查找所有 Ability
   */
  findAbilitiesByConfigId(configId: string): Ability[] {
    return this.abilities.filter((a) => a.configId === configId);
  }

  /**
   * 根据标签查找 Ability
   */
  findAbilitiesByTag(tag: string): Ability[] {
    return this.abilities.filter((a) => a.hasTag(tag));
  }

  /**
   * 检查是否有指定 configId 的 Ability
   */
  hasAbility(configId: string): boolean {
    return this.abilities.some((a) => a.configId === configId);
  }

  /**
   * 获取 Ability 数量
   */
  get abilityCount(): number {
    return this.abilities.length;
  }

  // ========== 回调管理 ==========

  /**
   * 注册 Ability 获得回调
   * @returns 取消订阅函数
   */
  onAbilityGranted(callback: AbilityGrantedCallback): () => void {
    this.onGrantedCallbacks.push(callback);
    return () => {
      const index = this.onGrantedCallbacks.indexOf(callback);
      if (index !== -1) {
        this.onGrantedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 注册 Ability 移除回调
   * @returns 取消订阅函数
   */
  onAbilityRevoked(callback: AbilityRevokedCallback): () => void {
    this.onRevokedCallbacks.push(callback);
    return () => {
      const index = this.onRevokedCallbacks.indexOf(callback);
      if (index !== -1) {
        this.onRevokedCallbacks.splice(index, 1);
      }
    };
  }

  // ========== 内部方法 ==========

  /**
   * 创建 Component 生命周期上下文
   */
  private createLifecycleContext(ability: Ability): ComponentLifecycleContext {
    return {
      owner: this.owner,
      attributes: this.modifierTarget,
      ability: ability,
    };
  }

  /**
   * 通知 Ability 获得
   */
  private notifyGranted(ability: Ability): void {
    for (const callback of this.onGrantedCallbacks) {
      try {
        callback(ability, this);
      } catch (error) {
        getLogger().error('Error in ability granted callback', { error });
      }
    }
  }

  /**
   * 通知 Ability 移除
   */
  private notifyRevoked(ability: Ability, reason: AbilityRevokeReason): void {
    for (const callback of this.onRevokedCallbacks) {
      try {
        callback(ability, reason, this);
      } catch (error) {
        getLogger().error('Error in ability revoked callback', { error });
      }
    }
  }

  // ========== 序列化 ==========

  /**
   * 序列化
   */
  serialize(): object {
    return {
      owner: this.owner,
      abilities: this.abilities.map((a) => a.serialize()),
    };
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 AbilitySet
 */
export function createAbilitySet<T extends AttributesConfig>(
  owner: ActorRef,
  attributes: AttributeSet<T>
): AbilitySet<T> {
  return new AbilitySet({ owner, attributes });
}

// ========== 类型守卫 ==========

/**
 * 检查对象是否有 AbilitySet
 */
export function hasAbilitySet<T extends AttributesConfig>(
  obj: unknown
): obj is { abilitySet: AbilitySet<T> } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'abilitySet' in obj &&
    obj.abilitySet instanceof AbilitySet
  );
}
