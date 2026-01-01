/**
 * Ability 能力实例
 *
 * 技能/Buff 的容器，采用 EC 模式，通过 Component 组合实现不同类型的能力。
 *
 * ## 关键设计
 * - Component 在构造时注入，运行时不可修改
 * - 双层触发机制：内部 Hook (tick/activate/deactivate) + 事件响应 (receiveEvent)
 */

import { generateId } from '../utils/IdGenerator.js';
import { getLogger } from '../utils/Logger.js';
import type { ActorRef } from '../types/common.js';
import type { GameEventBase } from '../events/GameEvent.js';
import type { IAbilityComponent, IAbilityForComponent, ComponentLifecycleContext } from './AbilityComponent.js';

/**
 * Ability 状态
 */
export type AbilityState = 'idle' | 'active' | 'expired';

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
  private _state: AbilityState = 'idle';

  /** Component 列表（只读，构造时确定） */
  private readonly components: readonly IAbilityComponent[];

  /** 保存激活时的上下文 */
  private lifecycleContext?: ComponentLifecycleContext;

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

  get isActive(): boolean {
    return this._state === 'active';
  }

  get isExpired(): boolean {
    return this._state === 'expired';
  }

  // ========== Component 查询（只读）==========

  /**
   * 获取指定类型的 Component
   */
  getComponent<T extends IAbilityComponent>(type: string): T | undefined {
    return this.components.find((c) => c.type === type) as T | undefined;
  }

  /**
   * 检查是否有指定类型的 Component
   */
  hasComponent(type: string): boolean {
    return this.components.some((c) => c.type === type);
  }

  /**
   * 获取所有 Component（只读）
   */
  getComponents(): readonly IAbilityComponent[] {
    return this.components;
  }

  // ========== 内部 Hook ==========

  /**
   * 分发 Tick 到所有 Component
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

    // 检查是否有过期的 Component
    this.checkExpiration();
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

    // 检查是否因事件处理而过期
    this.checkExpiration();
  }

  // ========== 生命周期 ==========

  /**
   * 激活能力
   * @param context 激活上下文，包含 owner 的 AttributeSet 写入接口
   */
  activate(context: ComponentLifecycleContext): void {
    if (this._state === 'active') {
      getLogger().warn(`Ability already active: ${this.id}`);
      return;
    }

    this._state = 'active';
    this.lifecycleContext = context;

    // 通知所有 Component
    for (const component of this.components) {
      if (component.onActivate) {
        try {
          component.onActivate(context);
        } catch (error) {
          getLogger().error(`Component onActivate error: ${component.type}`, { error });
        }
      }
    }
  }

  /**
   * 失效能力（移除 Modifier）
   */
  deactivate(): void {
    const ctx = this.lifecycleContext;
    if (!ctx) {
      return;
    }

    // 通知所有 Component
    for (const component of this.components) {
      if (component.onDeactivate) {
        try {
          component.onDeactivate(ctx);
        } catch (error) {
          getLogger().error(`Component onDeactivate error: ${component.type}`, { error });
        }
      }
    }

    this.lifecycleContext = undefined;
  }

  /**
   * 标记为过期（会先调用 deactivate）
   */
  expire(): void {
    if (this._state === 'expired') {
      return;
    }

    // 先 deactivate（移除 Modifier）
    this.deactivate();

    this._state = 'expired';
  }

  /**
   * 检查 Component 过期状态
   */
  private checkExpiration(): void {
    // 如果有任何关键 Component 过期，整个 Ability 过期
    const durationComponent = this.getComponent('duration');
    if (durationComponent && durationComponent.state === 'expired') {
      this.expire();
    }
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
    };
  }
}

