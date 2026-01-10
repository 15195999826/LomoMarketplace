/**
 * PreEventComponent - Pre 阶段事件处理组件
 *
 * 用于在事件生效前拦截和修改事件。与 NoInstanceComponent 的区别：
 *
 * | 特性 | PreEventComponent | NoInstanceComponent |
 * |------|-------------------|---------------------|
 * | 阶段 | Pre 阶段 | Post 阶段 |
 * | 返回值 | 返回 Intent | 不返回 |
 * | 能力 | 可修改/取消事件 | 只能响应事件 |
 * | 注册方式 | 自动注册到 EventProcessor | 通过 receiveEvent 触发 |
 *
 * ## 使用示例
 *
 * ```typescript
 * // 护甲减伤 30%
 * new PreEventComponent({
 *   eventKind: 'pre_damage',
 *   filter: (e, ctx) => e.targetId === ctx.owner.id,
 *   handler: (mutable, ctx) => modifyIntent(ctx.ability.id, [
 *     { field: 'damage', operation: 'multiply', value: 0.7 }
 *   ]),
 * });
 *
 * // 50% 概率免疫伤害
 * new PreEventComponent({
 *   eventKind: 'pre_damage',
 *   filter: (e, ctx) => e.targetId === ctx.owner.id,
 *   handler: (mutable, ctx) => {
 *     if (Math.random() < 0.5) {
 *       return cancelIntent(ctx.ability.id, '闪避');
 *     }
 *     return passIntent();
 *   },
 * });
 * ```
 */

import {
  BaseAbilityComponent,
  type ComponentLifecycleContext,
} from './AbilityComponent.js';
import type { GameEventBase } from '../events/GameEvent.js';
import type {
  MutableEvent,
  PreEventIntent,
  PreEventHandlerContext,
} from '../events/EventPhase.js';
import { passIntent } from '../events/EventPhase.js';
import { getLogger } from '../utils/Logger.js';

// ========== 类型定义 ==========

/**
 * Pre 阶段处理器函数类型
 *
 * @param mutable 可变事件（可读取当前值）
 * @param context 组件生命周期上下文
 * @returns 处理意图（pass/cancel/modify）
 */
export type PreEventHandlerFn<TEvent extends GameEventBase = GameEventBase> = (
  mutable: MutableEvent<TEvent>,
  context: ComponentLifecycleContext
) => PreEventIntent;

/**
 * 事件过滤器函数类型
 */
export type PreEventFilterFn<TEvent extends GameEventBase = GameEventBase> = (
  event: TEvent,
  context: ComponentLifecycleContext
) => boolean;

/**
 * PreEventComponent 配置
 */
export type PreEventComponentConfig<TEvent extends GameEventBase = GameEventBase> = {
  /** 监听的事件类型（kind 字符串） */
  readonly eventKind: string;
  /** 条件过滤器（可选） */
  readonly filter?: PreEventFilterFn<TEvent>;
  /** Pre 阶段处理器 */
  readonly handler: PreEventHandlerFn<TEvent>;
  /** 处理器名称（用于日志和追踪，可选） */
  readonly name?: string;
};

// ========== PreEventComponent ==========

/**
 * PreEventComponent - Pre 阶段事件处理组件
 *
 * 在 Ability 激活时自动注册到 EventProcessor，失效时自动注销。
 */
export class PreEventComponent<
  TEvent extends GameEventBase = GameEventBase
> extends BaseAbilityComponent {
  readonly type = 'PreEventComponent';

  private readonly eventKind: string;
  private readonly filter?: PreEventFilterFn<TEvent>;
  private readonly handler: PreEventHandlerFn<TEvent>;
  private readonly handlerName?: string;

  /** 注销函数（由 registerPreHandler 返回） */
  private unregister?: () => void;

  /** 保存激活时的上下文（用于 handler 调用） */
  private lifecycleContext?: ComponentLifecycleContext;

  constructor(config: PreEventComponentConfig<TEvent>) {
    super();
    this.eventKind = config.eventKind;
    this.filter = config.filter;
    this.handler = config.handler;
    this.handlerName = config.name;
  }

  /**
   * 获取监听的事件类型
   */
  getEventKind(): string {
    return this.eventKind;
  }

  /**
   * Ability grant 时调用
   * 注册 Pre 阶段处理器到 EventProcessor
   */
  onApply(context: ComponentLifecycleContext): void {
    this.lifecycleContext = context;

    const eventProcessor = context.eventProcessor;
    if (!eventProcessor) {
      getLogger().warn(
        `PreEventComponent: EventProcessor not available, handler will not be registered`,
        { abilityId: context.ability.id, eventKind: this.eventKind }
      );
      return;
    }

    const ability = context.ability;

    // 注册到 EventProcessor
    // 注意: handler 参数类型为 MutableEvent<GameEventBase>，
    // 但实际传入的事件已通过 eventKind 过滤，类型安全由 filter 保证
    this.unregister = eventProcessor.registerPreHandler({
      id: `${ability.id}_pre_${this.eventKind}`,
      name: this.handlerName ?? ability.displayName ?? ability.configId,
      eventKind: this.eventKind,
      ownerId: context.owner.id,
      abilityId: ability.id,
      configId: ability.configId,
      filter: this.filter
        ? (event) => this.filter!(event as TEvent, this.lifecycleContext!)
        : undefined,
      handler: (mutable, handlerContext) =>
        this.handlePreEvent(mutable as MutableEvent<TEvent>, handlerContext),
    });
  }

  /**
   * Ability revoke/expire 时调用
   * 从 EventProcessor 注销处理器
   */
  onRemove(context: ComponentLifecycleContext): void {
    if (this.unregister) {
      this.unregister();
      this.unregister = undefined;
    }
    this.lifecycleContext = undefined;
  }

  /**
   * 处理 Pre 阶段事件
   *
   * 注意：此方法作为 PreEventHandler 传递给 EventProcessor，
   * EventProcessor 会传入正确类型的 MutableEvent<T>。
   * 由于 TypeScript 的函数参数逆变性，我们需要显式声明参数类型
   * 以保持类型兼容性。实际调用时类型是安全的。
   *
   * 错误处理：handler 抛出的错误会传播到 EventProcessor，
   * 由 EventProcessor 统一记录到 trace 系统。
   */
  private handlePreEvent(
    mutable: MutableEvent<TEvent>,
    _handlerContext: PreEventHandlerContext
  ): PreEventIntent {
    if (!this.lifecycleContext) {
      getLogger().warn(`PreEventComponent: lifecycleContext not available`);
      return passIntent();
    }

    // 不捕获错误，让 EventProcessor 统一处理并记录到 trace
    return this.handler(mutable, this.lifecycleContext);
  }

  serialize(): object {
    return {
      eventKind: this.eventKind,
      handlerName: this.handlerName,
    };
  }
}
