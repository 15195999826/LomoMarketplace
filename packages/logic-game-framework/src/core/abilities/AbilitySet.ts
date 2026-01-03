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
 * 带持续时间的 Tag 条目（每层独立计时）
 */
export type DurationTagEntry = {
  /** Tag 名称 */
  tag: string;
  /** 过期时间（logicTime） */
  expiresAt: number;
};

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

  // ========== Tag 存储（3种来源分离）==========

  /**
   * Loose Tags - 手动管理，只能通过 removeLooseTag 移除
   * Map<tag, stacks>
   */
  private looseTags: Map<string, number> = new Map();

  /**
   * Auto Duration Tags - 每层独立计时，tick 时自动清理
   * 数组存储，每层一条
   */
  private autoDurationTags: DurationTagEntry[] = [];

  /**
   * Component Tags - 由 TagComponent 管理，随 Ability 生命周期
   * Map<abilityId, tags[]>
   */
  private componentTags: Map<string, string[]> = new Map();

  /** 当前逻辑时间（由外部 tick 时更新） */
  private currentLogicTime: number = 0;

  /** Ability 获得回调 */
  private onGrantedCallbacks: AbilityGrantedCallback[] = [];

  /** Ability 移除回调 */
  private onRevokedCallbacks: AbilityRevokedCallback[] = [];

  constructor(config: AbilitySetConfig) {
    this.owner = config.owner;
    this.modifierTarget = config.modifierTarget;
  }

  // ========== Loose Tag 管理 ==========

  /**
   * 添加 Loose Tag
   *
   * Loose Tag 只能通过 removeLooseTag 移除，不会自动过期。
   *
   * @param tag Tag 名称
   * @param stacks 层数，默认 1
   */
  addLooseTag(tag: string, stacks: number = 1): void {
    const current = this.looseTags.get(tag) ?? 0;
    this.looseTags.set(tag, current + stacks);

    debugLog('ability', `添加 LooseTag: ${tag}`, {
      actorId: this.owner.id,
      stacks: current + stacks,
    });
  }

  /**
   * 移除 Loose Tag
   *
   * @param tag Tag 名称
   * @param stacks 移除的层数，不传则全部移除
   * @returns 是否成功移除
   */
  removeLooseTag(tag: string, stacks?: number): boolean {
    const current = this.looseTags.get(tag);
    if (current === undefined || current <= 0) {
      return false;
    }

    if (stacks === undefined || stacks >= current) {
      // 全部移除
      this.looseTags.delete(tag);
      debugLog('ability', `移除 LooseTag: ${tag}`, { actorId: this.owner.id });
    } else {
      // 减少层数
      this.looseTags.set(tag, current - stacks);
      debugLog('ability', `减少 LooseTag 层数: ${tag}`, {
        actorId: this.owner.id,
        remainingStacks: current - stacks,
      });
    }

    return true;
  }

  // ========== Auto Duration Tag 管理 ==========

  /**
   * 添加 Auto Duration Tag
   *
   * 每次调用都会添加新的一层，每层独立计时。
   * tick 时自动清理过期的层。
   *
   * @param tag Tag 名称
   * @param duration 持续时间（毫秒）
   */
  addAutoDurationTag(tag: string, duration: number): void {
    const expiresAt = this.currentLogicTime + duration;
    this.autoDurationTags.push({ tag, expiresAt });

    debugLog('ability', `添加 AutoDurationTag: ${tag}`, {
      actorId: this.owner.id,
      duration,
      expiresAt,
      totalStacks: this.getAutoDurationTagStacks(tag),
    });
  }

  /**
   * 获取指定 AutoDurationTag 的层数
   */
  private getAutoDurationTagStacks(tag: string): number {
    return this.autoDurationTags.filter((e) => e.tag === tag).length;
  }

  /**
   * 清理过期的 Auto Duration Tags
   */
  private cleanupExpiredAutoDurationTags(): void {
    const beforeCount = this.autoDurationTags.length;
    const expiredTags = new Set<string>();

    // 记录哪些 tag 有过期的层
    for (const entry of this.autoDurationTags) {
      if (entry.expiresAt <= this.currentLogicTime) {
        expiredTags.add(entry.tag);
      }
    }

    // 过滤掉过期的
    this.autoDurationTags = this.autoDurationTags.filter(
      (e) => e.expiresAt > this.currentLogicTime
    );

    // 记录日志
    for (const tag of expiredTags) {
      const remaining = this.getAutoDurationTagStacks(tag);
      debugLog('ability', `AutoDurationTag 层过期: ${tag}`, {
        actorId: this.owner.id,
        removedLayers: beforeCount - this.autoDurationTags.length,
        remainingStacks: remaining,
      });
    }
  }

  // ========== Component Tag 管理（内部 API）==========

  /**
   * 添加 Component Tags（由 TagComponent 调用）
   *
   * @param abilityId Ability 实例 ID
   * @param tags 要添加的 Tag 列表
   * @internal
   */
  _addComponentTags(abilityId: string, tags: string[]): void {
    if (tags.length === 0) return;

    const existing = this.componentTags.get(abilityId) ?? [];
    this.componentTags.set(abilityId, [...existing, ...tags]);

    debugLog('ability', `添加 ComponentTags: ${tags.join(', ')}`, {
      actorId: this.owner.id,
      abilityId,
    });
  }

  /**
   * 移除 Component Tags（由 TagComponent 调用）
   *
   * @param abilityId Ability 实例 ID
   * @internal
   */
  _removeComponentTags(abilityId: string): void {
    const tags = this.componentTags.get(abilityId);
    if (!tags || tags.length === 0) return;

    this.componentTags.delete(abilityId);

    debugLog('ability', `移除 ComponentTags: ${tags.join(', ')}`, {
      actorId: this.owner.id,
      abilityId,
    });
  }

  // ========== Tag 联合查询 ==========

  /**
   * 检查是否有 Tag（联合查询所有来源）
   */
  hasTag(tag: string): boolean {
    // Loose Tags
    if (this.looseTags.has(tag)) return true;

    // Auto Duration Tags
    if (this.autoDurationTags.some((e) => e.tag === tag)) return true;

    // Component Tags
    for (const tags of this.componentTags.values()) {
      if (tags.includes(tag)) return true;
    }

    return false;
  }

  /**
   * 获取 Tag 总层数（累加所有来源）
   */
  getTagStacks(tag: string): number {
    let stacks = 0;

    // Loose Tags
    stacks += this.looseTags.get(tag) ?? 0;

    // Auto Duration Tags（每条 entry 算一层）
    stacks += this.autoDurationTags.filter((e) => e.tag === tag).length;

    // Component Tags（每个出现算一层）
    for (const tags of this.componentTags.values()) {
      stacks += tags.filter((t) => t === tag).length;
    }

    return stacks;
  }

  /**
   * 获取所有 Tag 及其层数（联合查询）
   */
  getAllTags(): Map<string, number> {
    const result = new Map<string, number>();

    // Loose Tags
    for (const [tag, stacks] of this.looseTags) {
      result.set(tag, (result.get(tag) ?? 0) + stacks);
    }

    // Auto Duration Tags
    for (const entry of this.autoDurationTags) {
      result.set(entry.tag, (result.get(entry.tag) ?? 0) + 1);
    }

    // Component Tags
    for (const tags of this.componentTags.values()) {
      for (const tag of tags) {
        result.set(tag, (result.get(tag) ?? 0) + 1);
      }
    }

    return result;
  }

  /**
   * 获取当前逻辑时间
   */
  getLogicTime(): number {
    return this.currentLogicTime;
  }

  // ========== Loose Tag 专用查询 ==========

  /**
   * 检查是否有 Loose Tag
   */
  hasLooseTag(tag: string): boolean {
    return (this.looseTags.get(tag) ?? 0) > 0;
  }

  /**
   * 获取 Loose Tag 层数
   */
  getLooseTagStacks(tag: string): number {
    return this.looseTags.get(tag) ?? 0;
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
    // 更新逻辑时间
    if (logicTime !== undefined) {
      this.currentLogicTime = logicTime;
    } else {
      this.currentLogicTime += dt;
    }

    // 清理过期的 Auto Duration Tags
    this.cleanupExpiredAutoDurationTags();

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
