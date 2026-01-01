/**
 * 时间轴数据结构
 *
 * 时间轴描述了 Ability 执行过程中的时间节点（Tag）。
 * 数据来源于渲染端资产（如 UE 动画蒙太奇），通过转换脚本生成 JSON。
 *
 * ## 使用场景
 *
 * - Ability 可配置一个时间轴（可选）
 * - 无时间轴 = 瞬时触发，所有 Action 立即执行
 * - 有时间轴 = Action 绑定到特定 Tag 时间点执行
 *
 * ## 数据来源
 *
 * 时间轴数据从渲染端资产转换而来，概念接近表格，通过 id（RowName）获取。
 * 框架不关心转换脚本如何实现，只定义数据结构。
 *
 * @example
 * ```typescript
 * // 时间轴数据示例（从 JSON 加载）
 * const fireballTimeline: TimelineAsset = {
 *   id: 'anim_fireball',
 *   totalDuration: 1200,
 *   tags: {
 *     'ActionPoint0': 300,    // 300ms 处触发伤害
 *     'ActionPoint1': 600,    // 600ms 处触发第二段
 *     'end': 1200,            // 动画结束
 *   },
 * };
 * ```
 */

/**
 * 时间轴资产
 *
 * 描述一个完整的时间轴，包含所有 Tag 及其时间点。
 */
export interface TimelineAsset {
  /** 时间轴唯一标识（对应资产的 RowName） */
  readonly id: string;

  /** 总时长（毫秒） */
  readonly totalDuration: number;

  /**
   * Tag 映射表
   *
   * key: Tag 名称（如 "ActionPoint0", "hit_frame", "end"）
   * value: 时间点（毫秒）
   */
  readonly tags: Readonly<Record<string, number>>;
}

/**
 * 时间轴注册表
 *
 * 存储所有已注册的时间轴资产，通过 id 查找。
 */
export interface ITimelineRegistry {
  /**
   * 注册时间轴
   */
  register(timeline: TimelineAsset): void;

  /**
   * 批量注册（从 JSON 加载后）
   */
  registerAll(timelines: TimelineAsset[]): void;

  /**
   * 获取时间轴
   * @param id 时间轴 ID
   * @returns 时间轴资产，不存在则返回 undefined
   */
  get(id: string): TimelineAsset | undefined;

  /**
   * 检查是否存在
   */
  has(id: string): boolean;

  /**
   * 获取所有时间轴 ID
   */
  getAllIds(): string[];
}

/**
 * 默认时间轴注册表实现
 */
export class TimelineRegistry implements ITimelineRegistry {
  private timelines: Map<string, TimelineAsset> = new Map();

  register(timeline: TimelineAsset): void {
    this.timelines.set(timeline.id, timeline);
  }

  registerAll(timelines: TimelineAsset[]): void {
    for (const timeline of timelines) {
      this.register(timeline);
    }
  }

  get(id: string): TimelineAsset | undefined {
    return this.timelines.get(id);
  }

  has(id: string): boolean {
    return this.timelines.has(id);
  }

  getAllIds(): string[] {
    return Array.from(this.timelines.keys());
  }
}

// ========== 全局注册表 ==========

let globalTimelineRegistry: ITimelineRegistry = new TimelineRegistry();

/**
 * 获取全局时间轴注册表
 */
export function getTimelineRegistry(): ITimelineRegistry {
  return globalTimelineRegistry;
}

/**
 * 设置全局时间轴注册表
 */
export function setTimelineRegistry(registry: ITimelineRegistry): void {
  globalTimelineRegistry = registry;
}

// ========== 辅助函数 ==========

/**
 * 获取 Tag 时间点
 *
 * @param timeline 时间轴资产
 * @param tagName Tag 名称
 * @returns 时间点（毫秒），Tag 不存在则返回 undefined
 */
export function getTagTime(timeline: TimelineAsset, tagName: string): number | undefined {
  return timeline.tags[tagName];
}

/**
 * 获取所有 Tag 名称
 */
export function getTagNames(timeline: TimelineAsset): string[] {
  return Object.keys(timeline.tags);
}

/**
 * 按时间排序的 Tag 列表
 */
export function getSortedTags(timeline: TimelineAsset): Array<{ name: string; time: number }> {
  return Object.entries(timeline.tags)
    .map(([name, time]) => ({ name, time }))
    .sort((a, b) => a.time - b.time);
}

/**
 * 验证时间轴数据有效性
 *
 * @returns 错误信息数组，空数组表示有效
 */
export function validateTimeline(timeline: TimelineAsset): string[] {
  const errors: string[] = [];

  if (!timeline.id) {
    errors.push('Timeline id is required');
  }

  if (timeline.totalDuration <= 0) {
    errors.push('Timeline totalDuration must be positive');
  }

  for (const [tagName, time] of Object.entries(timeline.tags)) {
    if (time < 0) {
      errors.push(`Tag "${tagName}" has negative time: ${time}`);
    }
    if (time > timeline.totalDuration) {
      errors.push(`Tag "${tagName}" time (${time}) exceeds totalDuration (${timeline.totalDuration})`);
    }
  }

  return errors;
}
