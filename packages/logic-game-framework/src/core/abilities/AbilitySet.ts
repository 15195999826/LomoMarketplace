/**
 * AbilitySet - 能力集合
 *
 * 取代 Actor.abilities: Ability[]，统一管理 Actor 的所有能力。
 * 持有 ModifierTarget 和 OwnerActor 引用，提供事件分发和 Ability 生命周期管理。
 *
 * ## 核心职责
 * - 管理 Ability 的获得 (grant) 和移除 (revoke)
 * - 分发事件到所有 Ability 的 Component
 * - 驱动内部 Hook (tick)
 * - 提供回调机制
 */

import type { ActorRef } from '../types/common.js';
import type { IAttributeModifierTarget } from '../attributes/defineAttributes.js';
import type { GameEventBase } from '../events/GameEvent.js';
import type { Ability } from './Ability.js';
import type { ComponentLifecycleContext } from './AbilityComponent.js';
import { getLogger, debugLog } from '../utils/Logger.js';

// ========== 类型定义 ==========

/**
 * Ability 移除原因
 */
export type AbilityRevokeReason = 'expired' | 'dispelled' | 'replaced' | 'manual';

/**
 * Ability 获得回调
 */
export type AbilityGrantedCallback = (ability: Ability, abilitySet: AbilitySet) => void;

/**
 * Ability 移除回调
 *
 * @param ability 被移除的 Ability
 * @param reason 移除原因（expired/dispelled/replaced/manual）
 * @param abilitySet AbilitySet 引用
 * @param expireReason 具体的过期原因（如 'time_duration'），仅当 reason='expired' 时有值
 */
export type AbilityRevokedCallback = (
  ability: Ability,
  reason: AbilityRevokeReason,
  abilitySet: AbilitySet,
  expireReason?: string
) => void;

/**
 * AbilitySet 配置
 */
export type AbilitySetConfig = {
  /** 所有者引用 */
  owner: ActorRef;
  /** Modifier 写入接口 */
  modifierTarget: IAttributeModifierTarget;
};

// ========== AbilitySet 类 ==========

/**
 * AbilitySet - 能力集合
 */
export class AbilitySet {
  /** 所有者引用 */
  readonly owner: ActorRef;

  /** Modifier 写入接口 */
  private readonly modifierTarget: IAttributeModifierTarget;

  /** 能力列表 */
  private abilities: Ability[] = [];

  /** Ability 获得回调 */
  private onGrantedCallbacks: AbilityGrantedCallback[] = [];

  /** Ability 移除回调 */
  private onRevokedCallbacks: AbilityRevokedCallback[] = [];

  constructor(config: AbilitySetConfig) {
    this.owner = config.owner;
    this.modifierTarget = config.modifierTarget;
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

    // 应用效果（传入 lifecycle context）
    const lifecycleContext = this.createLifecycleContext(ability);
    ability.applyEffects(lifecycleContext);

    debugLog('ability', `获得能力`, {
      actorId: this.owner.id,
      abilityName: ability.displayName ?? ability.configId,
      configId: ability.configId,
    });

    // 触发回调
    this.notifyGranted(ability);
  }

  /**
   * 移除 Ability
   *
   * @param abilityId 要移除的 Ability ID
   * @param reason 移除原因
   * @param expireReason 具体的过期原因（如 'time_duration'），仅当 reason='expired' 时使用
   */
  revokeAbility(
    abilityId: string,
    reason: AbilityRevokeReason = 'manual',
    expireReason?: string
  ): boolean {
    const index = this.abilities.findIndex((a) => a.id === abilityId);
    if (index === -1) {
      return false;
    }

    const ability = this.abilities[index];

    // 如果 Ability 尚未过期，先触发过期（移除 Modifier）
    if (!ability.isExpired) {
      ability.expire(expireReason ?? reason);
    }

    // 从列表移除
    this.abilities.splice(index, 1);

    const reasonText = expireReason ?? ability.expireReason ?? reason;
    debugLog('ability', `失去能力 (${reasonText})`, {
      actorId: this.owner.id,
      abilityName: ability.displayName ?? ability.configId,
      configId: ability.configId,
    });

    // 触发回调（传入具体的过期原因）
    this.notifyRevoked(ability, reason, expireReason ?? ability.expireReason);

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
   * 分发到所有 Ability，驱动 TimeDurationComponent 等
   */
  tick(dt: number): void {
    this.processAbilities((ability) => {
      try {
        ability.tick(dt);
      } catch (error) {
        getLogger().error(`Ability tick error: ${ability.id}`, { error });
      }
    });
  }

  /**
   * 驱动所有 Ability 的执行实例
   *
   * @param dt 时间增量（毫秒）
   * @returns 本次 tick 中触发的所有 Tag 列表
   */
  tickExecutions(dt: number): string[] {
    const allTriggeredTags: string[] = [];

    this.processAbilities((ability) => {
      try {
        const triggeredTags = ability.tickExecutions(dt);
        allTriggeredTags.push(...triggeredTags);
      } catch (error) {
        getLogger().error(`Ability tickExecutions error: ${ability.id}`, { error });
      }
    });

    return allTriggeredTags;
  }

  // ========== 事件接收 ==========

  /**
   * 接收游戏事件
   *
   * 将事件分发到所有 Ability 的 Component（GameEventComponent 响应）
   *
   * @param event 游戏事件
   * @param gameplayState 游戏状态（快照或实例引用，由项目决定）
   */
  receiveEvent(event: GameEventBase, gameplayState: unknown): void {
    this.processAbilities((ability) => {
      try {
        const context = this.createLifecycleContext(ability);
        ability.receiveEvent(event, context, gameplayState);
      } catch (error) {
        getLogger().error(`Ability event handling error: ${ability.id}`, { error, event: event.kind });
      }
    });
  }

  /**
   * 处理所有 Ability 并清理过期的
   *
   * @param processor 对每个活跃 Ability 执行的操作
   */
  private processAbilities(processor: (ability: Ability) => void): void {
    const expiredAbilities: Ability[] = [];

    for (const ability of this.abilities) {
      if (ability.isExpired) {
        expiredAbilities.push(ability);
        continue;
      }

      processor(ability);

      // 检查处理后是否过期
      if (ability.isExpired) {
        expiredAbilities.push(ability);
      }
    }

    // 清理过期的 Ability（使用 Ability 自身记录的过期原因）
    for (const expired of expiredAbilities) {
      this.revokeAbility(expired.id, 'expired', expired.expireReason);
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
  private notifyRevoked(ability: Ability, reason: AbilityRevokeReason, expireReason?: string): void {
    for (const callback of this.onRevokedCallbacks) {
      try {
        callback(ability, reason, this, expireReason);
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
export function createAbilitySet(
  owner: ActorRef,
  modifierTarget: IAttributeModifierTarget
): AbilitySet {
  return new AbilitySet({ owner, modifierTarget });
}

// ========== 类型守卫 ==========

/**
 * 检查对象是否有 AbilitySet
 */
export function hasAbilitySet(
  obj: unknown
): obj is { abilitySet: AbilitySet } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'abilitySet' in obj &&
    obj.abilitySet instanceof AbilitySet
  );
}
