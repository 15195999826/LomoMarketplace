/**
 * Ability 能力实例
 *
 * 技能/Buff 的容器
 * 采用 EC 模式，通过 Component 组合实现不同类型的能力
 */

import { generateId } from '../utils/IdGenerator.js';
import { getLogger } from '../utils/Logger.js';
import type { ActorRef, HookContext, ActivationContext, ActivationError } from '../types/common.js';
import type { IAbilityComponent, IAbilityForComponent } from './AbilityComponent.js';

/**
 * Ability 状态
 */
export type AbilityState = 'idle' | 'active' | 'channeling' | 'executing' | 'cooldown' | 'expired';

/**
 * Ability 配置
 */
export interface AbilityConfig {
  /** 配置表 ID */
  configId: string;
  /** 显示名称 */
  displayName?: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 标签 */
  tags?: string[];
}

/**
 * Ability 实例
 */
export class Ability implements IAbilityForComponent {
  /** 实例唯一标识 */
  readonly id: string;

  /** 配置表引用 */
  readonly configId: string;

  /** 施加者（谁给的这个能力） */
  source: ActorRef;

  /** 持有者（谁拥有这个能力） */
  owner: ActorRef;

  /** 显示名称 */
  displayName?: string;

  /** 描述 */
  description?: string;

  /** 图标 */
  icon?: string;

  /** 标签 */
  tags: string[] = [];

  /** 当前状态 */
  private _state: AbilityState = 'idle';

  /** Component 列表 */
  private components: IAbilityComponent[] = [];

  constructor(config: AbilityConfig, owner: ActorRef, source?: ActorRef) {
    this.id = generateId('ability');
    this.configId = config.configId;
    this.owner = owner;
    this.source = source ?? owner;
    this.displayName = config.displayName;
    this.description = config.description;
    this.icon = config.icon;
    this.tags = config.tags ?? [];
  }

  // ========== 状态访问器 ==========

  get state(): AbilityState {
    return this._state;
  }

  set state(value: AbilityState) {
    this._state = value;
  }

  get isActive(): boolean {
    return this._state !== 'expired';
  }

  get isExpired(): boolean {
    return this._state === 'expired';
  }

  // ========== Component 管理 ==========

  /**
   * 添加 Component
   */
  addComponent(component: IAbilityComponent): void {
    // 检查是否已存在同类型
    const existing = this.components.find((c) => c.type === component.type);
    if (existing) {
      getLogger().warn(`Component type already exists: ${component.type}`);
      return;
    }

    this.components.push(component);
    component.onAttach(this);
  }

  /**
   * 移除 Component
   */
  removeComponent(type: string): boolean {
    const index = this.components.findIndex((c) => c.type === type);
    if (index === -1) {
      return false;
    }

    const component = this.components[index];
    component.onDetach();
    this.components.splice(index, 1);
    return true;
  }

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
   * 获取所有 Component
   */
  getComponents(): readonly IAbilityComponent[] {
    return this.components;
  }

  // ========== 分发方法 ==========

  /**
   * 分发 Tick 到所有 Component
   */
  tick(dt: number): void {
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

  /**
   * 分发钩子到所有 Component
   */
  dispatchHook(hookName: string, context: HookContext): void {
    for (const component of this.components) {
      if (component.state === 'active' && component.onHook) {
        try {
          component.onHook(hookName, context);
        } catch (error) {
          getLogger().error(`Component hook error: ${component.type}`, { error, hookName });
        }
      }
    }
  }

  /**
   * 检查是否可以激活
   */
  canActivate(ctx: ActivationContext): true | ActivationError {
    for (const component of this.components) {
      if (component.canActivate) {
        const result = component.canActivate(ctx);
        if (result !== true && typeof result === 'object') {
          return result;
        }
        if (result === false) {
          return { code: 'CANNOT_ACTIVATE', message: `Component ${component.type} blocked activation` };
        }
      }
    }
    return true;
  }

  // ========== 生命周期 ==========

  /**
   * 激活能力
   */
  activate(): void {
    this._state = 'active';
  }

  /**
   * 标记为过期
   */
  expire(): void {
    this._state = 'expired';
    // 通知所有 Component
    for (const component of this.components) {
      component.onDetach();
    }
  }

  /**
   * 检查 Component 过期状态
   */
  private checkExpiration(): void {
    // 如果有任何关键 Component 过期，整个 Ability 过期
    // 这里假设 Duration Component 是关键的
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

  /**
   * 添加标签
   */
  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * 移除标签
   */
  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index !== -1) {
      this.tags.splice(index, 1);
    }
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

/**
 * Ability 标签常量
 */
export const AbilityTags = {
  /** Buff（增益效果） */
  BUFF: 'buff',
  /** Debuff（减益效果） */
  DEBUFF: 'debuff',
  /** 主动技能 */
  ACTIVE: 'active',
  /** 被动技能 */
  PASSIVE: 'passive',
  /** 可叠加 */
  STACKABLE: 'stackable',
  /** 可驱散 */
  DISPELLABLE: 'dispellable',
  /** 隐藏（不显示在 UI 中） */
  HIDDEN: 'hidden',
} as const;

export type AbilityTag = (typeof AbilityTags)[keyof typeof AbilityTags];
