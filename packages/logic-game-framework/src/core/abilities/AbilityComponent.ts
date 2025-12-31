/**
 * AbilityComponent 接口
 *
 * 能力的功能模块，采用 EC 模式，不同 Component 组合实现不同类型的能力。
 *
 * ## 双层触发机制
 *
 * ### 内部 Hook（框架级，标准组件使用）
 * - `onTick(dt)` - 时间驱动，用于 DurationComponent 计时
 * - `onActivate(ctx)` / `onDeactivate(ctx)` - 生命周期，用于 StatModifierComponent 管理 Modifier
 *
 * ### 事件响应（业务级，ActionComponent 使用）
 * - `onEvent(event, ctx)` - 响应 GameEvent，执行链式 Action
 */

import type { ActorRef } from '../types/common.js';
import type { IAttributeModifierTarget } from '../attributes/defineAttributes.js';
import type { GameEventBase } from '../events/GameEvent.js';

// 前向声明
export interface IAbilityForComponent {
  readonly id: string;
  readonly configId: string;
}

/**
 * Component 生命周期上下文
 * 在 onActivate/onDeactivate/onEvent 时传递
 */
export type ComponentLifecycleContext = {
  /** Ability 所有者的引用 */
  readonly owner: ActorRef;
  /** Modifier 写入接口（仅 Component 内部可用） */
  readonly attributes: IAttributeModifierTarget;
  /** 所属 Ability */
  readonly ability: IAbilityForComponent;
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
   * Ability 激活时调用
   * 这是应用 Modifier 的正确时机
   */
  onActivate?(context: ComponentLifecycleContext): void;

  /**
   * Ability 失效时调用
   * 这是移除 Modifier 的正确时机
   */
  onDeactivate?(context: ComponentLifecycleContext): void;

  /**
   * 每帧/每回合更新
   * @param dt 时间增量（毫秒）
   */
  onTick?(dt: number): void;

  // ═══════ 事件响应（业务级，ActionComponent 使用）═══════

  /**
   * 接收游戏事件
   * 根据事件类型决定如何响应，执行链式 Action
   */
  onEvent?(event: GameEventBase, context: ComponentLifecycleContext): void;

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

/**
 * Component 类型常量
 */
export const ComponentTypes = {
  /** 主动技能标记，UI/快捷键配置 */
  INPUT: 'input',
  /** 被动触发器，事件监听 */
  TRIGGER: 'trigger',
  /** 持续时间/回合 */
  DURATION: 'duration',
  /** 层数管理 */
  STACK: 'stack',
  /** 冷却时间 */
  COOLDOWN: 'cooldown',
  /** 消耗（法力等） */
  COST: 'cost',
  /** 属性修改 */
  STAT_MODIFIER: 'statModifier',
  /** 执行效果（调用 Action） */
  EFFECT: 'effect',
} as const;

export type ComponentType = (typeof ComponentTypes)[keyof typeof ComponentTypes];
