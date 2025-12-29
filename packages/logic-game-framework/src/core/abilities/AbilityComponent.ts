/**
 * AbilityComponent 接口
 *
 * 能力的功能模块
 * 采用 EC 模式，不同 Component 组合实现不同类型的能力
 */

import type { HookContext, ActivationContext, ActivationError, ActorRef } from '../types/common.js';
import type { IAttributeModifierTarget } from '../attributes/defineAttributes.js';

// 前向声明
export interface IAbilityForComponent {
  readonly id: string;
  readonly configId: string;
}

/**
 * Component 激活/失效上下文
 * 在 onActivate/onDeactivate 时传递，包含 Modifier 写入接口
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
export type ComponentState = 'active' | 'inactive' | 'expired';

/**
 * AbilityComponent 接口
 */
export interface IAbilityComponent {
  /** Component 类型标识 */
  readonly type: string;

  /** 当前状态 */
  readonly state: ComponentState;

  /**
   * 当 Component 被添加到 Ability 时调用
   * 用于初始化配置，不应在此处应用 Modifier
   */
  onAttach(ability: IAbilityForComponent): void;

  /**
   * 当 Component 从 Ability 移除时调用
   */
  onDetach(): void;

  /**
   * Ability 激活时调用（可选）
   * 这是应用 Modifier 的正确时机
   */
  onActivate?(context: ComponentLifecycleContext): void;

  /**
   * Ability 失效时调用（可选）
   * 这是移除 Modifier 的正确时机
   */
  onDeactivate?(context: ComponentLifecycleContext): void;

  /**
   * 每帧/每回合更新（可选）
   * @param dt 时间增量
   */
  onTick?(dt: number): void;

  /**
   * 钩子处理（可选）
   * 用于响应游戏事件（如 onDamaged, onKill 等）
   */
  onHook?(hookName: string, context: Readonly<HookContext>): void;

  /**
   * 激活检查（可选）
   * 用于检查是否满足激活条件（如冷却、消耗等）
   */
  canActivate?(ctx: Readonly<ActivationContext>): boolean | ActivationError;

  /**
   * 序列化（可选）
   */
  serialize?(): object;

  /**
   * 反序列化（可选）
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

  onAttach(ability: IAbilityForComponent): void {
    this.ability = ability;
    this._state = 'active';
  }

  onDetach(): void {
    this.ability = undefined;
    this._state = 'inactive';
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
