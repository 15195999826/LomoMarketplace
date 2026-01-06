/**
 * TagContainer - 标签容器
 *
 * 独立的 Tag 管理组件，可以被 AbilitySet 持有，也可以独立使用。
 * 支持三种 Tag 来源：Loose Tags、Auto Duration Tags、Component Tags。
 *
 * ## 设计原则
 *
 * - **单一职责**: 只管理 Tag，不关心 Ability
 * - **可独立使用**: 不需要 Ability 的场景也能用 Tag（如环境物体状态标记）
 * - **三层 Tag 来源分离**: 便于追踪和调试
 *
 * ## 三种 Tag 来源
 *
 * | 来源 | 特点 | 典型用途 |
 * |------|------|---------|
 * | Loose Tags | 手动添加/移除，永不自动过期 | 冷却回合数、状态标记 |
 * | Auto Duration Tags | 每层独立计时，tick 时自动清理 | 持续时间 Buff |
 * | Component Tags | 随外部生命周期管理 | Ability 附加的 Tag |
 *
 * ## 使用示例
 *
 * ```typescript
 * // 独立使用
 * const tags = new TagContainer({ ownerId: 'env_object_1' });
 * tags.addLooseTag('interactive', 1);
 *
 * // 被 AbilitySet 持有
 * class MyAbilitySet extends AbilitySet {
 *   readonly tagContainer = new TagContainer({ ownerId: this.owner.id });
 * }
 * ```
 */

import { getLogger, debugLog } from '../utils/Logger.js';

// ========== 类型定义 ==========

/**
 * 带持续时间的 Tag 条目（每层独立计时）
 */
export interface DurationTagEntry {
  /** Tag 名称 */
  tag: string;
  /** 过期时间（logicTime） */
  expiresAt: number;
}

/**
 * Tag 变化回调
 *
 * 当任何来源（Loose/AutoDuration/Component）的 Tag 总层数发生变化时触发。
 * 主要用于录像系统记录冷却等 Tag 的变化。
 *
 * @param tag Tag 名称
 * @param oldCount 变化前的总层数
 * @param newCount 变化后的总层数
 * @param container TagContainer 引用
 */
export type TagChangedCallback = (
  tag: string,
  oldCount: number,
  newCount: number,
  container: TagContainer
) => void;

/**
 * TagContainer 配置
 */
export interface TagContainerConfig {
  /** 所有者 ID（用于日志） */
  ownerId: string;
}

// ========== TagContainer 类 ==========

/**
 * TagContainer - 标签容器
 */
export class TagContainer {
  /** 所有者 ID */
  readonly ownerId: string;

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
   * Component Tags - 由外部组件管理（如 TagComponent）
   * Map<componentId, Record<tag, stacks>>
   */
  private componentTags: Map<string, Record<string, number>> = new Map();

  /** 当前逻辑时间（由外部 tick 时更新） */
  private currentLogicTime: number = 0;

  /** Tag 变化回调 */
  private onTagChangedCallbacks: TagChangedCallback[] = [];

  constructor(config: TagContainerConfig) {
    this.ownerId = config.ownerId;
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
    const oldCount = this.getTagStacks(tag);
    const current = this.looseTags.get(tag) ?? 0;
    this.looseTags.set(tag, current + stacks);
    const newCount = this.getTagStacks(tag);

    debugLog('tag', `添加 LooseTag: ${tag}`, {
      actorId: this.ownerId,
    });

    // 触发 Tag 变化回调
    if (oldCount !== newCount) {
      this.notifyTagChanged(tag, oldCount, newCount);
    }
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

    const oldCount = this.getTagStacks(tag);

    if (stacks === undefined || stacks >= current) {
      // 全部移除
      this.looseTags.delete(tag);
      debugLog('tag', `移除 LooseTag: ${tag}`, { actorId: this.ownerId });
    } else {
      // 减少层数
      this.looseTags.set(tag, current - stacks);
      debugLog('tag', `减少 LooseTag 层数: ${tag}`, {
        actorId: this.ownerId,
        remainingStacks: current - stacks,
      });
    }

    const newCount = this.getTagStacks(tag);

    // 触发 Tag 变化回调
    if (oldCount !== newCount) {
      this.notifyTagChanged(tag, oldCount, newCount);
    }

    return true;
  }

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
    const oldCount = this.getTagStacks(tag);
    const expiresAt = this.currentLogicTime + duration;
    this.autoDurationTags.push({ tag, expiresAt });
    const newCount = this.getTagStacks(tag);

    // 格式化时间显示（毫秒或秒）
    const durationStr = duration >= 1000 ? `${duration / 1000}s` : `${duration}ms`;
    debugLog('tag', `添加 AutoDurationTag: ${tag} (${durationStr})`, {
      actorId: this.ownerId,
      duration,
      expiresAt,
      totalStacks: this.getAutoDurationTagStacks(tag),
    });

    // 触发 Tag 变化回调
    if (oldCount !== newCount) {
      this.notifyTagChanged(tag, oldCount, newCount);
    }
  }

  /**
   * 获取指定 AutoDurationTag 的层数（过滤已过期）
   */
  getAutoDurationTagStacks(tag: string): number {
    return this.autoDurationTags.filter(
      (e) => e.tag === tag && e.expiresAt > this.currentLogicTime
    ).length;
  }

  /**
   * 清理过期的 Auto Duration Tags
   *
   * 由外部调用（如 AbilitySet.tick 或直接调用 TagContainer.tick）
   */
  cleanupExpiredTags(): void {
    const beforeCount = this.autoDurationTags.length;

    // 记录哪些 tag 有过期的层，以及变化前的层数
    const tagOldCounts = new Map<string, number>();
    for (const entry of this.autoDurationTags) {
      if (entry.expiresAt <= this.currentLogicTime) {
        if (!tagOldCounts.has(entry.tag)) {
          tagOldCounts.set(entry.tag, this.getTagStacks(entry.tag));
        }
      }
    }

    // 过滤掉过期的
    this.autoDurationTags = this.autoDurationTags.filter(
      (e) => e.expiresAt > this.currentLogicTime
    );

    // 记录日志并触发回调
    for (const [tag, oldCount] of tagOldCounts) {
      const newCount = this.getTagStacks(tag);
      debugLog('tag', `AutoDurationTag 层过期: ${tag}`, {
        actorId: this.ownerId,
        removedLayers: beforeCount - this.autoDurationTags.length,
        remainingStacks: newCount,
      });

      // 触发 Tag 变化回调
      if (oldCount !== newCount) {
        this.notifyTagChanged(tag, oldCount, newCount);
      }
    }
  }

  // ========== Component Tag 管理 ==========

  /**
   * 添加 Component Tags
   *
   * 由外部组件（如 TagComponent）调用，用于管理随组件生命周期的 Tag。
   *
   * @param componentId 组件/Ability 实例 ID
   * @param tags Tag 及其层数
   */
  addComponentTags(componentId: string, tags: Record<string, number>): void {
    if (Object.keys(tags).length === 0) return;

    // 记录变化前的层数
    const oldCounts = new Map<string, number>();
    for (const tag of Object.keys(tags)) {
      oldCounts.set(tag, this.getTagStacks(tag));
    }

    // 合并到已有的 tags（同一组件可能有多次添加）
    const existing = this.componentTags.get(componentId) ?? {};
    const merged = { ...existing };
    for (const [tag, stacks] of Object.entries(tags)) {
      merged[tag] = (merged[tag] ?? 0) + stacks;
    }
    this.componentTags.set(componentId, merged);

    const tagList = Object.entries(tags).map(([t, s]) => `${t}:${s}`).join(', ');
    debugLog('tag', `添加 ComponentTags: ${tagList}`, {
      actorId: this.ownerId,
      abilityId: componentId,
    });

    // 触发 Tag 变化回调
    for (const [tag, oldCount] of oldCounts) {
      const newCount = this.getTagStacks(tag);
      if (oldCount !== newCount) {
        this.notifyTagChanged(tag, oldCount, newCount);
      }
    }
  }

  /**
   * 移除 Component Tags
   *
   * 由外部组件（如 TagComponent）调用，通常在组件销毁时。
   *
   * @param componentId 组件/Ability 实例 ID
   */
  removeComponentTags(componentId: string): void {
    const tags = this.componentTags.get(componentId);
    if (!tags || Object.keys(tags).length === 0) return;

    // 记录变化前的层数
    const oldCounts = new Map<string, number>();
    for (const tag of Object.keys(tags)) {
      oldCounts.set(tag, this.getTagStacks(tag));
    }

    this.componentTags.delete(componentId);

    const tagList = Object.entries(tags).map(([t, s]) => `${t}:${s}`).join(', ');
    debugLog('tag', `移除 ComponentTags: ${tagList}`, {
      actorId: this.ownerId,
      abilityId: componentId,
    });

    // 触发 Tag 变化回调
    for (const [tag, oldCount] of oldCounts) {
      const newCount = this.getTagStacks(tag);
      if (oldCount !== newCount) {
        this.notifyTagChanged(tag, oldCount, newCount);
      }
    }
  }

  // ========== Tag 联合查询 ==========

  /**
   * 检查是否有 Tag（联合查询所有来源）
   *
   * 注意：AutoDurationTags 会实时过滤已过期的条目
   */
  hasTag(tag: string): boolean {
    // Loose Tags
    if (this.looseTags.has(tag)) return true;

    // Auto Duration Tags（过滤已过期）
    if (this.autoDurationTags.some(
      (e) => e.tag === tag && e.expiresAt > this.currentLogicTime
    )) return true;

    // Component Tags
    for (const tags of this.componentTags.values()) {
      if (tag in tags && tags[tag] > 0) return true;
    }

    return false;
  }

  /**
   * 获取 Tag 总层数（累加所有来源）
   *
   * 注意：AutoDurationTags 会实时过滤已过期的条目
   */
  getTagStacks(tag: string): number {
    let stacks = 0;

    // Loose Tags
    stacks += this.looseTags.get(tag) ?? 0;

    // Auto Duration Tags（每条未过期 entry 算一层）
    stacks += this.autoDurationTags.filter(
      (e) => e.tag === tag && e.expiresAt > this.currentLogicTime
    ).length;

    // Component Tags（累加层数）
    for (const tags of this.componentTags.values()) {
      stacks += tags[tag] ?? 0;
    }

    return stacks;
  }

  /**
   * 获取所有 Tag 及其层数（联合查询）
   *
   * 注意：AutoDurationTags 会实时过滤已过期的条目
   */
  getAllTags(): Map<string, number> {
    const result = new Map<string, number>();

    // Loose Tags
    for (const [tag, stacks] of this.looseTags) {
      result.set(tag, (result.get(tag) ?? 0) + stacks);
    }

    // Auto Duration Tags（过滤已过期）
    for (const entry of this.autoDurationTags) {
      if (entry.expiresAt > this.currentLogicTime) {
        result.set(entry.tag, (result.get(entry.tag) ?? 0) + 1);
      }
    }

    // Component Tags（累加层数）
    for (const tags of this.componentTags.values()) {
      for (const [tag, stacks] of Object.entries(tags)) {
        result.set(tag, (result.get(tag) ?? 0) + stacks);
      }
    }

    return result;
  }

  // ========== 时间管理 ==========

  /**
   * 获取当前逻辑时间
   */
  getLogicTime(): number {
    return this.currentLogicTime;
  }

  /**
   * 设置当前逻辑时间
   *
   * 通常由外部 tick 时调用。
   */
  setLogicTime(logicTime: number): void {
    this.currentLogicTime = logicTime;
  }

  /**
   * Tick 更新
   *
   * 更新逻辑时间并清理过期的 Auto Duration Tags。
   *
   * @param dt 时间增量（毫秒）
   * @param logicTime 当前逻辑时间（可选，如果提供则直接使用）
   */
  tick(dt: number, logicTime?: number): void {
    // 更新逻辑时间
    if (logicTime !== undefined) {
      this.currentLogicTime = logicTime;
    } else {
      this.currentLogicTime += dt;
    }

    // 清理过期的 Auto Duration Tags
    this.cleanupExpiredTags();
  }

  // ========== 回调管理 ==========

  /**
   * 注册 Tag 变化回调
   *
   * 当任何来源（Loose/AutoDuration/Component）的 Tag 总层数发生变化时触发。
   * 主要用于录像系统记录冷却等 Tag 的变化。
   *
   * @param callback 回调函数
   * @returns 取消订阅函数
   */
  onTagChanged(callback: TagChangedCallback): () => void {
    this.onTagChangedCallbacks.push(callback);
    return () => {
      const index = this.onTagChangedCallbacks.indexOf(callback);
      if (index !== -1) {
        this.onTagChangedCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 通知 Tag 变化
   */
  private notifyTagChanged(tag: string, oldCount: number, newCount: number): void {
    for (const callback of this.onTagChangedCallbacks) {
      try {
        callback(tag, oldCount, newCount, this);
      } catch (error) {
        getLogger().error('Error in tag changed callback', { error, tag });
      }
    }
  }

  // ========== 序列化 ==========

  /**
   * 获取 Tag 快照（用于录像初始状态）
   */
  getSnapshot(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [tag, stacks] of this.getAllTags()) {
      result[tag] = stacks;
    }
    return result;
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 TagContainer
 */
export function createTagContainer(ownerId: string): TagContainer {
  return new TagContainer({ ownerId });
}
