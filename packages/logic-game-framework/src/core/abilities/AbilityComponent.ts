/**
 * AbilityComponent 接口
 *
 * 能力的功能模块，采用 EC 模式，不同 Component 组合实现不同类型的能力。
 *
 * ## 双层触发机制
 *
 * ### 内部 Hook（框架级，标准组件使用）
 * - `onTick(dt)` - 时间驱动，用于 DurationComponent 计时
 * - `onApply(ctx)` / `onRemove(ctx)` - grant/revoke 时调用，用于 StatModifierComponent 管理 Modifier
 *
 * ### 事件响应（业务级，ActionComponent 使用）
 * - `onEvent(event, ctx)` - 响应 GameEvent，执行链式 Action
 */

import type { ActorRef } from '../types/common.js';
import type { IAttributeModifierTarget } from '../attributes/defineAttributes.js';
import type { GameEventBase } from '../events/GameEvent.js';
import type { IAction } from '../actions/Action.js';
import type { IGameplayStateProvider } from '../world/IGameplayStateProvider.js';

// ========== 执行实例相关类型（前向声明）==========

/**
 * 执行实例配置（简化版，用于 Component 调用）
 */
export type ActivateExecutionConfig = {
  /** Timeline ID */
  readonly timelineId: string;
  /** Tag -> Actions 映射 */
  readonly tagActions: Record<string, IAction[]>;
  /** 触发事件链 */
  readonly eventChain: GameEventBase[];
  /** 游戏状态引用 */
  readonly gameplayState: IGameplayStateProvider;
};

/**
 * 执行实例引用（只读接口）
 */
export interface IAbilityExecutionInstance {
  readonly id: string;
  readonly timelineId: string;
  readonly elapsed: number;
  readonly state: 'executing' | 'completed' | 'cancelled';
  readonly isExecuting: boolean;
  cancel(): void;
  /**
   * 获取触发此执行实例的事件
   * 返回 eventChain 的最后一个元素（当前触发事件）
   * 与 ExecutionContext.getCurrentEvent() 一致
   */
  getTriggerEvent(): GameEventBase | undefined;
}

// ========== IAbilityForComponent ==========

/**
 * Ability 对 Component 暴露的接口
 */
export interface IAbilityForComponent {
  readonly id: string;
  readonly configId: string;
  readonly displayName?: string;

  /**
   * 标记 Ability 过期 - Component 可调用此方法主动触发过期
   *
   * @param reason 过期原因，只有第一次调用的 reason 会被记录
   */
  expire(reason: string): void;

  /**
   * 激活新的执行实例
   *
   * 用于 ActivateInstanceComponent 创建 Timeline 执行实例。
   * 一个 Ability 可以同时拥有多个执行实例（如脱手技能）。
   *
   * @param config 执行实例配置
   * @returns 执行实例引用
   */
  activateNewExecutionInstance(config: ActivateExecutionConfig): IAbilityExecutionInstance;

  /**
   * 获取所有正在执行的实例
   */
  getExecutingInstances(): readonly IAbilityExecutionInstance[];
}

// 前向声明 AbilitySet 类型（避免循环依赖）
import type { AbilitySet } from './AbilitySet.js';
import type { EventProcessor } from '../events/EventProcessor.js';

/**
 * Component 生命周期上下文
 * 在 onApply/onRemove/onEvent 时传递
 */
export type ComponentLifecycleContext = {
  /** Ability 所有者的引用 */
  readonly owner: ActorRef;
  /** Modifier 写入接口（仅 Component 内部可用） */
  readonly attributes: IAttributeModifierTarget;
  /** 所属 Ability */
  readonly ability: IAbilityForComponent;
  /** AbilitySet 引用（可选，用于 TagComponent 等） */
  readonly abilitySet?: AbilitySet;
  /** EventProcessor 引用（可选，用于 PreEventComponent 注册 Pre 阶段处理器） */
  readonly eventProcessor?: EventProcessor;
};

/**
 * Component 状态
 */
export type ComponentState = 'active' | 'expired';

/**
 * AbilityComponent 接口
 */
export interface IAbilityComponent {
  /** Component 类型标识 */
  readonly type: string;

  /** 当前状态 */
  readonly state: ComponentState;

  /**
   * 初始化 Component
   * 在 Ability 构造时调用，仅设置引用，不应用效果
   */
  initialize(ability: IAbilityForComponent): void;

  // ═══════ 内部 Hook（框架级，标准组件使用）═══════

  /**
   * Ability grant 时调用
   * 这是应用 Modifier 的正确时机
   */
  onApply?(context: ComponentLifecycleContext): void;

  /**
   * Ability revoke/expire 时调用
   * 这是移除 Modifier 的正确时机
   */
  onRemove?(context: ComponentLifecycleContext): void;

  /**
   * 每帧/每回合更新
   * @param dt 时间增量（毫秒）
   */
  onTick?(dt: number): void;

  // ═══════ 事件响应（业务级，ActionComponent 使用）═══════

  /**
   * 接收游戏事件
   * 根据事件类型决定如何响应，执行链式 Action
   *
   * @param event 游戏事件
   * @param context 组件生命周期上下文
   * @param gameplayState 游戏状态（快照或实例引用，由项目决定）
   * @returns 是否响应了此事件（true 表示该 Component 处理了此事件，false 表示事件与该 Component 无关）
   */
  onEvent?(event: GameEventBase, context: ComponentLifecycleContext, gameplayState: IGameplayStateProvider): boolean;

  // ═══════ 序列化 ═══════

  /**
   * 序列化
   */
  serialize?(): object;

  /**
   * 反序列化
   */
  deserialize?(data: object): void;
}

/**
 * AbilityComponent 基类
 * 提供通用功能实现
 */
export abstract class BaseAbilityComponent implements IAbilityComponent {
  abstract readonly type: string;

  protected _state: ComponentState = 'active';
  protected ability?: IAbilityForComponent;

  get state(): ComponentState {
    return this._state;
  }

  /**
   * 初始化 Component
   * 在 Ability 构造时调用，仅设置引用
   */
  initialize(ability: IAbilityForComponent): void {
    this.ability = ability;
    this._state = 'active';
  }

  /**
   * 标记为过期
   */
  markExpired(): void {
    this._state = 'expired';
  }

  /**
   * 检查是否过期
   */
  isExpired(): boolean {
    return this._state === 'expired';
  }

  /**
   * 获取所属 Ability
   */
  protected getAbility(): IAbilityForComponent | undefined {
    return this.ability;
  }
}
