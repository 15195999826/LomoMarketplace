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

/**
 * Component 构造函数类型
 * 用于 Unity 风格的 getComponent<T>(ctor) 调用
 */
export type ComponentConstructor<T extends IAbilityComponent> = new (...args: any[]) => T;

/**
 * Ability 状态
 * - pending: 刚创建，尚未授予
 * - granted: 已授予，效果已应用
 * - expired: 已过期/移除
 */
export type AbilityState = 'pending' | 'granted' | 'expired';

/**
 * Ability 配置
 */
export type AbilityConfig = {
  /** 配置表 ID */
  configId: string;
  /** Component 列表 - 在构造时注入，不可运行时修改 */
  components: IAbilityComponent[];
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

    // Component 在构造时注入，之后不可修改
    this.components = Object.freeze([...config.components]);

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
   */
  receiveEvent(event: GameEventBase, context: ComponentLifecycleContext, gameplayState: unknown): void {
    if (this._state === 'expired') return;

    for (const component of this.components) {
      if (component.state === 'active' && component.onEvent) {
        try {
          component.onEvent(event, context, gameplayState);
        } catch (error) {
          getLogger().error(`Component event error: ${component.type}`, { error, event: event.kind });
        }
      }
    }
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

