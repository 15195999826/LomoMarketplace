/**
 * Recording Utils - 录像工具函数
 *
 * 提供给 Actor 在 setupRecording 中使用的标准订阅函数。
 * Actor 可以选择性地调用这些函数来订阅框架组件的变化。
 *
 * ## 设计原则
 *
 * - **控制反转**: Actor 决定订阅什么，而不是 BattleRecorder 探测 Actor 结构
 * - **类型安全**: 无需 duck typing，完全类型安全
 * - **可组合**: 每个函数独立，Actor 可自由组合
 * - **可扩展**: 项目可以添加自己的录像工具函数
 *
 * ## 可用函数
 *
 * - `recordAttributeChanges` - 订阅属性变化
 * - `recordAbilitySetChanges` - 订阅 Ability 生命周期、事件触发和 Tag 变化
 * - `recordTagChanges` - 单独订阅 Tag 变化（已包含在 recordAbilitySetChanges 中）
 * - `recordActorLifecycle` - 订阅 Actor 生命周期（生成/销毁）
 *
 * @example
 * ```typescript
 * class CharacterActor implements IRecordableActor {
 *   setupRecording(ctx: IRecordingContext) {
 *     return [
 *       recordAttributeChanges(this.attributeSet, ctx),
 *       ...recordAbilitySetChanges(this.abilitySet, ctx),
 *       ...recordActorLifecycle(this, ctx),
 *     ];
 *   }
 * }
 * ```
 */

import type { AttributeChangeListener } from '../../core/attributes/AttributeSet.js';
import type { AbilitySet } from '../../core/abilities/AbilitySet.js';
import type { Ability } from '../../core/abilities/Ability.js';
import type { IRecordingContext } from './ReplayTypes.js';
import type { Actor } from '../../core/entity/Actor.js';
import type { GameEventBase } from '../../core/events/GameEvent.js';
import {
  createAttributeChangedEvent,
  createAbilityGrantedEvent,
  createAbilityRemovedEvent,
  createTagChangedEvent,
  createActorSpawnedEvent,
  createActorDestroyedEvent,
  createAbilityTriggeredEvent,
} from '../../core/events/GameEvent.js';

/**
 * 可订阅属性变化的对象接口
 *
 * 匹配 AttributeSet<T> 的监听器 API
 */
export interface IAttributeChangeSubscribable {
  addChangeListener(listener: AttributeChangeListener): void;
  removeChangeListener(listener: AttributeChangeListener): void;
}

/**
 * 可订阅 Tag 变化的对象接口
 *
 * 匹配 TagContainer 和 AbilitySet 的 onTagChanged API
 */
export interface ITagChangeSubscribable {
  onTagChanged(callback: (tag: string, oldCount: number, newCount: number) => void): () => void;
}

/**
 * 订阅 AttributeSet 的属性变化
 *
 * 监听所有属性的变化，自动转换为 AttributeChangedEvent。
 *
 * @param attributeSet 属性集合（需要实现 addChangeListener/removeChangeListener）
 * @param ctx 录像上下文
 * @returns 取消订阅函数
 *
 * @example
 * ```typescript
 * setupRecording(ctx: IRecordingContext) {
 *   return [
 *     recordAttributeChanges(this.attributeSet, ctx),
 *   ];
 * }
 * ```
 */
export function recordAttributeChanges(
  attributeSet: IAttributeChangeSubscribable,
  ctx: IRecordingContext
): () => void {
  const listener: AttributeChangeListener = (event) => {
    ctx.pushEvent(
      createAttributeChangedEvent(
        ctx.actorId,
        event.attributeName,
        event.oldValue,
        event.newValue
      )
    );
  };

  attributeSet.addChangeListener(listener);

  return () => {
    attributeSet.removeChangeListener(listener);
  };
}

/**
 * 订阅 AbilitySet 的 Ability 生命周期变化
 *
 * 监听 Ability 的获得、移除和事件触发，自动转换为对应事件。
 * 同时自动订阅 Tag 变化（通过 AbilitySet 代理的 TagContainer）。
 *
 * ## 订阅内容
 *
 * - **abilityGranted**: Ability 被授予时
 * - **abilityRemoved**: Ability 被移除时
 * - **abilityTriggered**: Ability 收到事件且有 Component 被触发时
 * - **tagChanged**: Tag 层数变化时
 *
 * @param abilitySet AbilitySet 实例
 * @param ctx 录像上下文
 * @returns 取消订阅函数数组
 *
 * @example
 * ```typescript
 * setupRecording(ctx: IRecordingContext) {
 *   return [
 *     ...recordAbilitySetChanges(this.abilitySet, ctx),
 *   ];
 * }
 * ```
 */
export function recordAbilitySetChanges(
  abilitySet: AbilitySet,
  ctx: IRecordingContext
): (() => void)[] {
  const unsubscribes: (() => void)[] = [];

  // 存储每个 Ability 的触发事件订阅取消函数
  const abilityTriggerUnsubscribes = new Map<string, () => void>();

  // 为单个 Ability 订阅触发事件
  const subscribeAbilityTriggered = (ability: Ability): void => {
    const unsubscribe = ability.addTriggeredListener((event, triggeredComponents) => {
      ctx.pushEvent(
        createAbilityTriggeredEvent(
          ctx.actorId,
          ability.id,
          ability.configId,
          event.kind,
          triggeredComponents
        )
      );
    });
    abilityTriggerUnsubscribes.set(ability.id, unsubscribe);
  };

  // 为已存在的 Ability 订阅触发事件
  for (const ability of abilitySet.getAbilities()) {
    subscribeAbilityTriggered(ability);
  }

  // 订阅 Ability 获得
  unsubscribes.push(
    abilitySet.onAbilityGranted((ability) => {
      // 记录 Ability 获得事件
      ctx.pushEvent(
        createAbilityGrantedEvent(ctx.actorId, {
          instanceId: ability.id,
          configId: ability.configId,
        })
      );

      // 为新 Ability 订阅触发事件
      subscribeAbilityTriggered(ability);
    })
  );

  // 订阅 Ability 移除
  unsubscribes.push(
    abilitySet.onAbilityRevoked((ability) => {
      // 记录 Ability 移除事件
      ctx.pushEvent(
        createAbilityRemovedEvent(ctx.actorId, ability.id)
      );

      // 清理该 Ability 的触发事件订阅
      const unsubscribe = abilityTriggerUnsubscribes.get(ability.id);
      if (unsubscribe) {
        unsubscribe();
        abilityTriggerUnsubscribes.delete(ability.id);
      }
    })
  );

  // 订阅 Tag 变化
  unsubscribes.push(recordTagChanges(abilitySet, ctx));

  // 添加清理所有 Ability 触发订阅的函数
  unsubscribes.push(() => {
    for (const unsubscribe of abilityTriggerUnsubscribes.values()) {
      unsubscribe();
    }
    abilityTriggerUnsubscribes.clear();
  });

  return unsubscribes;
}

/**
 * 订阅 Tag 变化
 *
 * 监听所有来源（Loose/AutoDuration/Component）的 Tag 总层数变化，
 * 自动转换为 TagChangedEvent。
 *
 * 主要用于记录冷却等 Tag 的变化。
 *
 * 可以接受 TagContainer 或 AbilitySet（两者都实现了 ITagChangeSubscribable）。
 *
 * @param tagSource 实现 onTagChanged 的对象（TagContainer 或 AbilitySet）
 * @param ctx 录像上下文
 * @returns 取消订阅函数
 *
 * @example
 * ```typescript
 * // 使用 AbilitySet
 * setupRecording(ctx: IRecordingContext) {
 *   return [
 *     recordTagChanges(this.abilitySet, ctx),
 *   ];
 * }
 *
 * // 使用独立的 TagContainer
 * setupRecording(ctx: IRecordingContext) {
 *   return [
 *     recordTagChanges(this.tagContainer, ctx),
 *   ];
 * }
 * ```
 */
export function recordTagChanges(
  tagSource: ITagChangeSubscribable,
  ctx: IRecordingContext
): () => void {
  return tagSource.onTagChanged((tag, oldCount, newCount) => {
    ctx.pushEvent(
      createTagChangedEvent(
        ctx.actorId,
        tag,
        oldCount,
        newCount
      )
    );
  });
}

/**
 * 订阅 Actor 生命周期事件
 *
 * 监听 Actor 的生成和销毁，自动转换为对应事件。
 *
 * @param actor Actor 实例
 * @param ctx 录像上下文
 * @returns 取消订阅函数数组
 *
 * @example
 * ```typescript
 * setupRecording(ctx: IRecordingContext) {
 *   return [
 *     recordAttributeChanges(this.attributeSet, ctx),
 *     ...recordAbilitySetChanges(this.abilitySet, ctx),
 *     ...recordActorLifecycle(this, ctx),
 *   ];
 * }
 * ```
 */
export function recordActorLifecycle(
  actor: Actor,
  ctx: IRecordingContext
): (() => void)[] {
  const unsubscribes: (() => void)[] = [];

  // 订阅 Actor 生成事件
  unsubscribes.push(
    actor.addSpawnListener(() => {
      ctx.pushEvent(
        createActorSpawnedEvent(actor)
      );
    })
  );

  // 订阅 Actor 销毁事件
  unsubscribes.push(
    actor.addDespawnListener(() => {
      ctx.pushEvent(
        createActorDestroyedEvent(ctx.actorId)
      );
    })
  );

  return unsubscribes;
}
