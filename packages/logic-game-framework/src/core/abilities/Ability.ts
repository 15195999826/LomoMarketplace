/**
 * Ability 能力实例
 *
 * 技能/Buff 的容器，采用 EC 模式，通过 Component 组合实现不同类型的能力。
 *
 * ## 关键设计
 * - Component 在构造时注入，运行时不可修改
 * - 双层触发机制：内部 Hook (tick/applyEffects/removeEffects) + 事件响应 (receiveEvent)
 *
 * ## 生命周期
 * - `pending` → 刚创建，尚未 grant
 * - `granted` → 已授予，效果已应用
 * - `expired` → 已过期/移除
 */

import { generateId } from '../utils/IdGenerator.js';
import { getLogger } from '../utils/Logger.js';
import type { ActorRef } from '../types/common.js';
import type { GameEventBase } from '../events/GameEvent.js';
import type {
  IAbilityComponent,
  IAbilityForComponent,
  IAbilityExecutionInstance,
  ActivateExecutionConfig,
  ComponentLifecycleContext,
} from './AbilityComponent.js';
import { AbilityExecutionInstance } from './AbilityExecutionInstance.js';
import type { ActiveUseComponent } from './ActiveUseComponent.js';

/**
 * Component 构造函数类型
 * 用于 Unity 风格的 getComponent<T>(ctor) 调用
 */
export type ComponentConstructor<T extends IAbilityComponent> = new (...args: any[]) => T;

/**
 * Component 工厂函数类型
 * 每次调用返回一个新的 Component 实例
 */
export type ComponentFactory<T extends IAbilityComponent> = () => T;

/**
 * Component 输入类型
 * 支持直接传入实例（兼容旧代码）或工厂函数（推荐）
 */
export type ComponentInput<T extends IAbilityComponent> = T | ComponentFactory<T>;

/**
 * Ability 状态
 * - pending: 刚创建，尚未授予
 * - granted: 已授予，效果已应用
 * - expired: 已过期/移除
 */
export type AbilityState = 'pending' | 'granted' | 'expired';

/**
 * Ability 配置
 *
 * ## 结构说明
 *
 * - `activeUseComponents`: 主动使用入口，包含条件/消耗检查
 * - `components`: 效果组件，自由组合
 *
 * ## 示例
 *
 * ```typescript
 * // 主动技能（工厂模式 - 推荐）
 * const fireball: AbilityConfig = {
 *   configId: 'skill_fireball',
 *   activeUseComponents: [() => new ActiveUseComponent({ ... })],
 * };
 *
 * // Buff（工厂模式 - 推荐）
 * const buff: AbilityConfig = {
 *   configId: 'buff_poison',
 *   components: [
 *     () => new DurationComponent({ time: 10000 }),
 *     () => new StatModifierComponent({ ... }),
 *   ],
 * };
 * ```
 */
export type AbilityConfig = {
  /** 配置表 ID */
  configId: string;
  /** 主动使用组件列表（可选） - 支持实例或工厂函数 */
  activeUseComponents?: ComponentInput<ActiveUseComponent>[];
  /** 效果组件列表（可选） - 支持实例或工厂函数 */
  components?: ComponentInput<IAbilityComponent>[];
  /** 显示名称 */
  displayName?: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 标签 */
  tags?: string[];
};

/**
 * Ability 实例
 */
export class Ability implements IAbilityForComponent {
  /** 实例唯一标识 */
  readonly id: string;

  /** 配置表引用 */
  readonly configId: string;

  /** 施加者（谁给的这个能力） */
  readonly source: ActorRef;

  /** 持有者（谁拥有这个能力） */
  readonly owner: ActorRef;

  /** 显示名称 */
  readonly displayName?: string;

  /** 描述 */
  readonly description?: string;

  /** 图标 */
  readonly icon?: string;

  /** 标签（只读） */
  readonly tags: readonly string[];

  /** 当前状态 */
  private _state: AbilityState = 'pending';

  /** 过期原因（只记录第一个触发过期的原因） */
  private _expireReason?: string;

  /** Component 列表（只读，构造时确定） */
  private readonly components: readonly IAbilityComponent[];

  /** 保存 grant 时的上下文（用于 removeEffects） */
  private lifecycleContext?: ComponentLifecycleContext;

  /** 执行实例列表 */
  private executionInstances: AbilityExecutionInstance[] = [];

  /** 事件触发回调列表 */
  private _onTriggeredCallbacks: Array<(event: GameEventBase, triggeredComponents: string[]) => void> = [];

  /**
   * 构造函数
   *
   * @param config Ability 配置，包含 Component 列表
   * @param owner 持有者引用
   * @param source 施加者引用（可选，默认为 owner）
   */
  constructor(config: AbilityConfig, owner: ActorRef, source?: ActorRef) {
    this.id = generateId('ability');
    this.configId = config.configId;
    this.owner = owner;
    this.source = source ?? owner;
    this.displayName = config.displayName;
    this.description = config.description;
    this.icon = config.icon;
    this.tags = Object.freeze(config.tags ?? []);

    // 解析 Component：工厂函数调用获取新实例，直接实例则直接使用
    const resolveComponent = <T extends IAbilityComponent>(input: ComponentInput<T>): T => {
      if (typeof input === 'function') {
        // 工厂函数：调用获取新实例
        return input();
      }
      // 直接实例：直接使用（兼容旧代码）
      return input;
    };

    // 合并 activeUseComponents 和 components
    const allComponents: IAbilityComponent[] = [
      ...(config.activeUseComponents ?? []).map(resolveComponent),
      ...(config.components ?? []).map(resolveComponent),
    ];

    // Component 在构造时注入，之后不可修改
    this.components = Object.freeze(allComponents);

    // 初始化所有 Component（仅设置引用，不应用效果）
    for (const component of this.components) {
      component.initialize(this);
    }
  }

  // ========== 状态访问器 ==========

  get state(): AbilityState {
    return this._state;
  }

  get isGranted(): boolean {
    return this._state === 'granted';
  }

  get isExpired(): boolean {
    return this._state === 'expired';
  }

  /**
   * 过期原因（只有过期后才有值）
   */
  get expireReason(): string | undefined {
    return this._expireReason;
  }

  // ========== Component 查询（只读）==========

  /**
   * 获取指定类型的 Component（Unity 风格）
   *
   * @example
   * ```typescript
   * const duration = ability.getComponent(DurationComponent);
   * //    ^? DurationComponent | undefined  ← 自动推断类型
   * ```
   */
  getComponent<T extends IAbilityComponent>(
    ctor: ComponentConstructor<T>
  ): T | undefined {
    return this.components.find((c) => c instanceof ctor) as T | undefined;
  }

  /**
   * 获取所有指定类型的 Component（Unity 风格）
   *
   * @example
   * ```typescript
   * const modifiers = ability.getComponents(StatModifierComponent);
   * //    ^? StatModifierComponent[]
   * ```
   */
  getComponents<T extends IAbilityComponent>(
    ctor: ComponentConstructor<T>
  ): T[] {
    return this.components.filter((c) => c instanceof ctor) as T[];
  }

  /**
   * 检查是否有指定类型的 Component（Unity 风格）
   */
  hasComponent<T extends IAbilityComponent>(
    ctor: ComponentConstructor<T>
  ): boolean {
    return this.components.some((c) => c instanceof ctor);
  }

  /**
   * 获取所有 Component（只读）
   */
  getAllComponents(): readonly IAbilityComponent[] {
    return this.components;
  }

  // ========== 内部 Hook ==========

  /**
   * 分发 Tick 到所有 Component
   *
   * Component 在过期时应主动调用 ability.expire()，
   * 而不是由 Ability 轮询检查。
   */
  tick(dt: number): void {
    if (this._state === 'expired') return;

    for (const component of this.components) {
      if (component.state === 'active' && component.onTick) {
        try {
          component.onTick(dt);
        } catch (error) {
          getLogger().error(`Component tick error: ${component.type}`, { error });
        }
      }
    }
  }

  /**
   * 驱动所有执行实例的 Tick
   *
   * @param dt 时间增量（毫秒）
   * @returns 本次 tick 中触发的所有 Tag 列表
   */
  tickExecutions(dt: number): string[] {
    if (this._state === 'expired') return [];

    const allTriggeredTags: string[] = [];

    for (const instance of this.executionInstances) {
      if (instance.isExecuting) {
        try {
          const triggeredTags = instance.tick(dt);
          allTriggeredTags.push(...triggeredTags);
        } catch (error) {
          getLogger().error(`ExecutionInstance tick error: ${instance.id}`, { error });
        }
      }
    }

    // 清理已完成或已取消的实例
    this.executionInstances = this.executionInstances.filter((i) => i.isExecuting);

    return allTriggeredTags;
  }

  // ========== 执行实例管理 ==========

  /**
   * 激活新的执行实例
   *
   * @param config 执行实例配置
   * @returns 执行实例引用
   */
  activateNewExecutionInstance(config: ActivateExecutionConfig): IAbilityExecutionInstance {
    const instance = new AbilityExecutionInstance({
      timelineId: config.timelineId,
      tagActions: config.tagActions,
      eventChain: config.eventChain,
      gameplayState: config.gameplayState,
      abilityInfo: {
        id: this.id,
        configId: this.configId,
        owner: this.owner,
        source: this.source,
      },
    });

    this.executionInstances.push(instance);

    return instance;
  }

  /**
   * 获取所有正在执行的实例
   */
  getExecutingInstances(): readonly IAbilityExecutionInstance[] {
    return this.executionInstances.filter((i) => i.isExecuting);
  }

  /**
   * 获取所有执行实例（包括已完成的）
   */
  getAllExecutionInstances(): readonly AbilityExecutionInstance[] {
    return this.executionInstances;
  }

  /**
   * 取消所有执行实例
   */
  cancelAllExecutions(): void {
    for (const instance of this.executionInstances) {
      instance.cancel();
    }
    this.executionInstances = [];
  }

  // ========== 事件响应 ==========

  /**
   * 接收游戏事件，分发到所有 Component
   *
   * @param event 游戏事件
   * @param context 组件生命周期上下文
   * @param gameplayState 游戏状态（快照或实例引用，由项目决定）
   * @returns 被触发的 Component 类型列表
   */
  receiveEvent(event: GameEventBase, context: ComponentLifecycleContext, gameplayState: unknown): string[] {
    if (this._state === 'expired') return [];

    const triggeredComponents: string[] = [];

    for (const component of this.components) {
      if (component.state === 'active' && component.onEvent) {
        try {
          const triggered = component.onEvent(event, context, gameplayState);
          if (triggered) {
            triggeredComponents.push(component.type);
          }
        } catch (error) {
          getLogger().error(`Component event error: ${component.type}`, { error, event: event.kind });
        }
      }
    }

    // 如果有 Component 被触发，调用回调
    if (triggeredComponents.length > 0) {
      for (const callback of this._onTriggeredCallbacks) {
        callback(event, triggeredComponents);
      }
    }

    return triggeredComponents;
  }

  /**
   * 订阅 Ability 事件触发
   *
   * 当 Ability 收到事件且有 Component 被触发时调用回调。
   *
   * @param callback 回调函数，接收触发事件和被触发的 Component 类型列表
   * @returns 取消订阅函数
   */
  addTriggeredListener(callback: (event: GameEventBase, triggeredComponents: string[]) => void): () => void {
    this._onTriggeredCallbacks.push(callback);
    return () => {
      const index = this._onTriggeredCallbacks.indexOf(callback);
      if (index !== -1) {
        this._onTriggeredCallbacks.splice(index, 1);
      }
    };
  }

  // ========== 生命周期 ==========

  /**
   * 应用效果（在 grant 时由 AbilitySet 调用）
   * @param context 上下文，包含 owner 的 AttributeSet 写入接口
   */
  applyEffects(context: ComponentLifecycleContext): void {
    if (this._state === 'granted') {
      getLogger().warn(`Ability already granted: ${this.id}`);
      return;
    }

    this._state = 'granted';
    this.lifecycleContext = context;

    // 通知所有 Component
    for (const component of this.components) {
      if (component.onApply) {
        try {
          component.onApply(context);
        } catch (error) {
          getLogger().error(`Component onApply error: ${component.type}`, { error });
        }
      }
    }
  }

  /**
   * 移除效果（在 revoke/expire 时调用）
   */
  removeEffects(): void {
    const ctx = this.lifecycleContext;
    if (!ctx) {
      return;
    }

    // 通知所有 Component
    for (const component of this.components) {
      if (component.onRemove) {
        try {
          component.onRemove(ctx);
        } catch (error) {
          getLogger().error(`Component onRemove error: ${component.type}`, { error });
        }
      }
    }

    this.lifecycleContext = undefined;
  }

  /**
   * 标记为过期（会先调用 removeEffects）
   *
   * @param reason 过期原因，只有第一次调用会被记录
   */
  expire(reason: string): void {
    if (this._state === 'expired') {
      // 已过期，忽略后续调用（多个 Component 可能同时触发过期）
      return;
    }

    // 记录第一个过期原因
    this._expireReason = reason;

    // 先移除效果
    this.removeEffects();

    this._state = 'expired';
  }

  // ========== 标签操作 ==========

  /**
   * 检查是否有指定标签
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  // ========== 序列化 ==========

  /**
   * 序列化
   */
  serialize(): object {
    return {
      id: this.id,
      configId: this.configId,
      source: this.source,
      owner: this.owner,
      state: this._state,
      displayName: this.displayName,
      tags: this.tags,
      components: this.components
        .filter((c) => c.serialize)
        .map((c) => ({
          type: c.type,
          data: c.serialize!(),
        })),
      executionInstances: this.executionInstances.map((i) => i.serialize()),
    };
  }
}

