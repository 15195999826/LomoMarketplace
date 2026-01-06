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
 *
 * ## 项目扩展（可选继承）
 *
 * AbilitySet 可以直接使用，也可以通过继承添加项目特定的便捷方法。
 * 这类似于 UE 中继承 AbilitySystemComponent 的模式。
 *
 * ### 使用场景
 *
 * - **简单项目**：直接使用 AbilitySet，通过工具函数扩展功能
 * - **复杂项目**：继承 AbilitySet，将项目特定逻辑集中在子类中
 *
 * ### 继承示例
 *
 * ```typescript
 * // 项目层：继承 AbilitySet 添加项目特定方法
 * export class BattleAbilitySet extends AbilitySet {
 *   // 冷却 Tag 前缀（项目约定）
 *   static readonly COOLDOWN_PREFIX = 'cooldown:';
 *
 *   // 便捷方法：检查技能是否在冷却中
 *   isOnCooldown(abilityId: string): boolean {
 *     return this.hasTag(`${BattleAbilitySet.COOLDOWN_PREFIX}${abilityId}`);
 *   }
 *
 *   // 回合制：获取冷却剩余回合数
 *   getCooldownTurns(abilityId: string): number {
 *     return this.getLooseTagStacks(`${BattleAbilitySet.COOLDOWN_PREFIX}${abilityId}`);
 *   }
 *
 *   // 回合制：回合结束时减少所有冷却
 *   tickCooldowns(): void {
 *     const allTags = this.getAllTags();
 *     for (const [tag, stacks] of allTags) {
 *       if (tag.startsWith(BattleAbilitySet.COOLDOWN_PREFIX) && stacks > 0) {
 *         this.removeLooseTag(tag, 1);
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * ### 工具函数示例（不继承）
 *
 * ```typescript
 * // 项目层：使用独立工具函数
 * export const COOLDOWN_PREFIX = 'cooldown:';
 *
 * export function isOnCooldown(abilitySet: AbilitySet, abilityId: string): boolean {
 *   return abilitySet.hasTag(`${COOLDOWN_PREFIX}${abilityId}`);
 * }
 * ```
 */

import type { ActorRef } from '../types/common.js';
import type { IAttributeModifierTarget } from '../attributes/defineAttributes.js';
import type { GameEventBase } from '../events/GameEvent.js';
import type { EventProcessor } from '../events/EventProcessor.js';
import type { Ability } from './Ability.js';
import type { ComponentLifecycleContext } from './AbilityComponent.js';
import { getLogger, debugLog } from '../utils/Logger.js';
import { GameWorld } from '../world/GameWorld.js';
import { TagContainer, createTagContainer } from '../tags/TagContainer.js';

// Re-export TagContainer types for backwards compatibility
export type { DurationTagEntry, TagChangedCallback } from '../tags/TagContainer.js';

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

  /**
   * Tag 容器（组合模式）
   *
   * Tag 管理已独立到 TagContainer，AbilitySet 持有并代理其方法。
   * 这样设计允许 Tag 功能独立使用，同时保持 AbilitySet API 的向后兼容。
   */
  readonly tagContainer: TagContainer;

  /** Ability 获得回调 */
  private onGrantedCallbacks: AbilityGrantedCallback[] = [];

  /** Ability 移除回调 */
  private onRevokedCallbacks: AbilityRevokedCallback[] = [];

  constructor(config: AbilitySetConfig) {
    this.owner = config.owner;
    this.modifierTarget = config.modifierTarget;
    this.tagContainer = createTagContainer(config.owner.id);
  }

  /**
   * 获取 EventProcessor 引用（从全局 GameWorld 获取）
   */
  getEventProcessor(): EventProcessor {
    return GameWorld.getInstance().eventProcessor;
  }

  // ========== Tag 管理（代理到 TagContainer）==========

  /**
   * 添加 Loose Tag
   * @see TagContainer.addLooseTag
   */
  addLooseTag(tag: string, stacks: number = 1): void {
    this.tagContainer.addLooseTag(tag, stacks);
  }

  /**
   * 移除 Loose Tag
   * @see TagContainer.removeLooseTag
   */
  removeLooseTag(tag: string, stacks?: number): boolean {
    return this.tagContainer.removeLooseTag(tag, stacks);
  }

  /**
   * 添加 Auto Duration Tag
   * @see TagContainer.addAutoDurationTag
   */
  addAutoDurationTag(tag: string, duration: number): void {
    this.tagContainer.addAutoDurationTag(tag, duration);
  }

  /**
   * 添加 Component Tags（由 TagComponent 调用）
   * @internal
   */
  _addComponentTags(abilityId: string, tags: Record<string, number>): void {
    this.tagContainer.addComponentTags(abilityId, tags);
  }

  /**
   * 移除 Component Tags（由 TagComponent 调用）
   * @internal
   */
  _removeComponentTags(abilityId: string): void {
    this.tagContainer.removeComponentTags(abilityId);
  }

  // ========== Tag 查询（代理到 TagContainer）==========

  /**
   * 检查是否有 Tag
   * @see TagContainer.hasTag
   */
  hasTag(tag: string): boolean {
    return this.tagContainer.hasTag(tag);
  }

  /**
   * 获取 Tag 总层数
   * @see TagContainer.getTagStacks
   */
  getTagStacks(tag: string): number {
    return this.tagContainer.getTagStacks(tag);
  }

  /**
   * 获取所有 Tag 及其层数
   * @see TagContainer.getAllTags
   */
  getAllTags(): Map<string, number> {
    return this.tagContainer.getAllTags();
  }

  /**
   * 获取当前逻辑时间
   * @see TagContainer.getLogicTime
   */
  getLogicTime(): number {
    return this.tagContainer.getLogicTime();
  }

  /**
   * 检查是否有 Loose Tag
   * @see TagContainer.hasLooseTag
   */
  hasLooseTag(tag: string): boolean {
    return this.tagContainer.hasLooseTag(tag);
  }

  /**
   * 获取 Loose Tag 层数
   * @see TagContainer.getLooseTagStacks
   */
  getLooseTagStacks(tag: string): number {
    return this.tagContainer.getLooseTagStacks(tag);
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
   *
   * @param dt 时间增量（毫秒）
   * @param logicTime 当前逻辑时间（可选，用于 Tag 过期计算）
   */
  tick(dt: number, logicTime?: number): void {
    // 更新 TagContainer 的逻辑时间并清理过期 Tags
    this.tagContainer.tick(dt, logicTime);

    // 处理 Ability
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

  /**
   * 注册 Tag 变化回调
   *
   * 当任何来源（Loose/AutoDuration/Component）的 Tag 总层数发生变化时触发。
   * 主要用于录像系统记录冷却等 Tag 的变化。
   *
   * @param callback 回调函数
   * @returns 取消订阅函数
   * @see TagContainer.onTagChanged
   */
  onTagChanged(callback: (tag: string, oldCount: number, newCount: number) => void): () => void {
    return this.tagContainer.onTagChanged(callback);
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
      abilitySet: this,
      eventProcessor: this.getEventProcessor(),
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

// ========== Provider 接口 ==========

/**
 * AbilitySet Provider 接口
 *
 * 项目层应实现此接口，提供获取 AbilitySet 的方法。
 * 用于 TagAction、ActiveUseComponent 等需要访问 AbilitySet 的场景。
 *
 * @example
 * ```typescript
 * class BattleState implements IAbilitySetProvider {
 *   private units: Map<string, BattleUnit> = new Map();
 *
 *   getAbilitySetForActor(actorId: string): AbilitySet | undefined {
 *     return this.units.get(actorId)?.abilitySet;
 *   }
 * }
 * ```
 */
export interface IAbilitySetProvider {
  /**
   * 根据 Actor ID 获取其 AbilitySet
   *
   * @param actorId Actor 的唯一标识
   * @returns AbilitySet 实例，如果 Actor 不存在则返回 undefined
   */
  getAbilitySetForActor(actorId: string): AbilitySet | undefined;
}

/**
 * 检查对象是否实现了 IAbilitySetProvider 接口
 */
export function isAbilitySetProvider(obj: unknown): obj is IAbilitySetProvider {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'getAbilitySetForActor' in obj &&
    typeof (obj as IAbilitySetProvider).getAbilitySetForActor === 'function'
  );
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
