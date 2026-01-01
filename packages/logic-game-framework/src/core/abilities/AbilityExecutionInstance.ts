/**
 * AbilityExecutionInstance - 能力执行实例
 *
 * 管理单次技能释放的执行状态和 Timeline 推进。
 * 一个 Ability 可以同时拥有多个 ExecutionInstance（如脱手技能）。
 *
 * ## 核心职责
 * - 持有 Timeline 执行进度
 * - 在 tick(dt) 中推进时间，检测 Tag 到达
 * - Tag 到达时执行对应的 Action 列表
 * - 管理执行状态（executing/completed/cancelled）
 *
 * ## 使用场景
 * - 主动技能：释放后按 Timeline 执行
 * - DoT：周期触发的持续效果
 * - 脱手技能：多个实例并行执行
 */

import { generateId } from '../utils/IdGenerator.js';
import { getLogger } from '../utils/Logger.js';
import type { IAction } from '../actions/Action.js';
import type { ExecutionContext } from '../actions/ExecutionContext.js';
import { createExecutionContext } from '../actions/ExecutionContext.js';
import type { GameEventBase } from '../events/GameEvent.js';
import { EventCollector } from '../events/EventCollector.js';
import type { TimelineAsset } from '../timeline/Timeline.js';
import { getTimelineRegistry } from '../timeline/Timeline.js';

// ========== 类型定义 ==========

/**
 * 执行实例状态
 */
export type ExecutionState = 'executing' | 'completed' | 'cancelled';

/**
 * Tag Action 映射
 * key: Tag 名称（支持通配符 '*'）
 * value: Action 列表
 */
export type TagActionsMap = Record<string, IAction[]>;

/**
 * 执行实例配置
 */
export type ExecutionInstanceConfig = {
  /** Timeline ID */
  readonly timelineId: string;

  /** Tag -> Actions 映射 */
  readonly tagActions: TagActionsMap;

  /** 触发事件链（用于 Action 的目标解析） */
  readonly eventChain: GameEventBase[];

  /** 游戏状态引用 */
  readonly gameplayState: unknown;

  /** 所属 Ability 信息 */
  readonly abilityInfo: {
    readonly id: string;
    readonly configId: string;
    readonly owner: { readonly id: string };
    readonly source: { readonly id: string };
  };
};

/**
 * Tag 触发事件（内部使用）
 */
type TagTriggeredEvent = {
  readonly tagName: string;
  readonly tagTime: number;
  readonly elapsed: number;
};

// ========== AbilityExecutionInstance ==========

/**
 * 能力执行实例
 */
export class AbilityExecutionInstance {
  /** 实例唯一标识 */
  readonly id: string;

  /** Timeline ID */
  readonly timelineId: string;

  /** Timeline 资产引用 */
  private readonly timeline: TimelineAsset | undefined;

  /** Tag -> Actions 映射 */
  private readonly tagActions: TagActionsMap;

  /** 触发事件链 */
  private readonly eventChain: GameEventBase[];

  /** 游戏状态引用 */
  private readonly gameplayState: unknown;

  /** Ability 信息 */
  private readonly abilityInfo: ExecutionInstanceConfig['abilityInfo'];

  /** 已执行时间（毫秒） */
  private _elapsed = 0;

  /** 当前状态 */
  private _state: ExecutionState = 'executing';

  /** 已触发的 Tag 集合 */
  private readonly triggeredTags = new Set<string>();

  /** 事件收集器 */
  private readonly eventCollector = new EventCollector();

  constructor(config: ExecutionInstanceConfig) {
    this.id = generateId('execution');
    this.timelineId = config.timelineId;
    this.timeline = getTimelineRegistry().get(config.timelineId);
    this.tagActions = config.tagActions;
    this.eventChain = [...config.eventChain];
    this.gameplayState = config.gameplayState;
    this.abilityInfo = config.abilityInfo;

    if (!this.timeline) {
      getLogger().warn(`Timeline not found: ${config.timelineId}`);
    }
  }

  // ========== 状态访问器 ==========

  get elapsed(): number {
    return this._elapsed;
  }

  get state(): ExecutionState {
    return this._state;
  }

  get isExecuting(): boolean {
    return this._state === 'executing';
  }

  get isCompleted(): boolean {
    return this._state === 'completed';
  }

  get isCancelled(): boolean {
    return this._state === 'cancelled';
  }

  // ========== 核心方法 ==========

  /**
   * 推进时间
   *
   * @param dt 时间增量（毫秒）
   * @returns 本次 tick 触发的 Tag 列表
   */
  tick(dt: number): string[] {
    if (this._state !== 'executing') {
      return [];
    }

    if (!this.timeline) {
      // 无 Timeline，立即完成
      this._state = 'completed';
      return [];
    }

    const previousElapsed = this._elapsed;
    this._elapsed += dt;

    // 收集本次 tick 触发的 Tag
    const triggeredThisTick: TagTriggeredEvent[] = [];

    for (const [tagName, tagTime] of Object.entries(this.timeline.tags)) {
      // 检查是否在本次 tick 中越过了 Tag 时间点
      if (
        previousElapsed < tagTime &&
        this._elapsed >= tagTime &&
        !this.triggeredTags.has(tagName)
      ) {
        this.triggeredTags.add(tagName);
        triggeredThisTick.push({
          tagName,
          tagTime,
          elapsed: this._elapsed,
        });
      }
    }

    // 按时间顺序排序
    triggeredThisTick.sort((a, b) => a.tagTime - b.tagTime);

    // 执行 Action
    for (const event of triggeredThisTick) {
      this.executeActionsForTag(event.tagName);
    }

    // 检查是否结束
    if (this._elapsed >= this.timeline.totalDuration) {
      this._state = 'completed';
    }

    return triggeredThisTick.map((e) => e.tagName);
  }

  /**
   * 取消执行
   */
  cancel(): void {
    if (this._state === 'executing') {
      this._state = 'cancelled';
    }
  }

  /**
   * 获取收集的事件（不清空）
   *
   * 返回事件数组的副本，不会清空内部缓冲区。
   * 适用于调试、日志或只读查询。
   *
   * @returns 事件数组副本
   *
   * @example
   * ```typescript
   * // 调试时查看事件
   * console.log('Events:', instance.getCollectedEvents());
   * ```
   */
  getCollectedEvents(): GameEventBase[] {
    return this.eventCollector.collect();
  }

  /**
   * 清空并获取收集的事件
   *
   * 返回事件数组并清空内部缓冲区。
   * 适用于表演层消费事件，每帧调用一次。
   *
   * @returns 事件数组（非副本，注意不要修改）
   *
   * @example
   * ```typescript
   * // 每帧消费事件（推荐）
   * const events = instance.flushEvents();
   * performanceLayer.play(events);
   * ```
   */
  flushEvents(): GameEventBase[] {
    return this.eventCollector.flush();
  }

  // ========== 内部方法 ==========

  /**
   * 执行指定 Tag 的 Action 列表
   */
  private executeActionsForTag(tagName: string): void {
    const actions = this.resolveActionsForTag(tagName);

    if (actions.length === 0) {
      return;
    }

    const execContext = this.buildExecutionContext(tagName);

    for (const action of actions) {
      try {
        const result = action.execute(execContext);
        // 收集事件
        for (const event of result.events) {
          this.eventCollector.emit(event);
        }
      } catch (error) {
        getLogger().error(`ExecutionInstance action error: ${action.type}`, {
          error,
          tagName,
          executionId: this.id,
        });
      }
    }
  }

  /**
   * 解析 Tag 对应的 Action 列表
   * 支持通配符匹配
   */
  private resolveActionsForTag(tagName: string): IAction[] {
    // 精确匹配
    if (this.tagActions[tagName]) {
      return this.tagActions[tagName];
    }

    // 通配符匹配
    for (const [pattern, actions] of Object.entries(this.tagActions)) {
      if (this.matchPattern(pattern, tagName)) {
        return actions;
      }
    }

    return [];
  }

  /**
   * 简单通配符匹配
   * 支持 'prefix*' 格式
   */
  private matchPattern(pattern: string, tagName: string): boolean {
    if (!pattern.includes('*')) {
      return pattern === tagName;
    }

    // 只支持结尾通配符
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return tagName.startsWith(prefix);
    }

    return false;
  }

  /**
   * 构建执行上下文
   */
  private buildExecutionContext(currentTag: string): ExecutionContext {
    return createExecutionContext({
      eventChain: this.eventChain,
      gameplayState: this.gameplayState,
      eventCollector: this.eventCollector,
      ability: {
        id: this.abilityInfo.id,
        configId: this.abilityInfo.configId,
        owner: this.abilityInfo.owner,
        source: this.abilityInfo.source,
      },
      // 扩展：执行实例信息
      execution: {
        id: this.id,
        timelineId: this.timelineId,
        elapsed: this._elapsed,
        currentTag,
      },
    });
  }

  // ========== 序列化 ==========

  serialize(): object {
    return {
      id: this.id,
      timelineId: this.timelineId,
      elapsed: this._elapsed,
      state: this._state,
      triggeredTags: Array.from(this.triggeredTags),
    };
  }
}
