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
 * @example
 * ```typescript
 * class CharacterActor implements IRecordableActor {
 *   setupRecording(ctx: IRecordingContext) {
 *     return [
 *       recordAttributeChanges(this.attributeSet, ctx),
 *       ...recordAbilitySetChanges(this.abilitySet, ctx),
 *     ];
 *   }
 * }
 * ```
 */

import type { AttributeChangeListener } from '../../core/attributes/AttributeSet.js';
import type { AbilitySet } from '../../core/abilities/AbilitySet.js';
import type { IRecordingContext } from './ReplayTypes.js';
import {
  createAttributeChangedEvent,
  createAbilityGrantedEvent,
  createAbilityRemovedEvent,
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
        ctx.getLogicTime(),
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
 * 监听 Ability 的获得和移除，自动转换为对应事件。
 *
 * 注意：Tag 变化暂不支持（AbilitySet 目前没有 onTagChanged 回调）
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

  // 订阅 Ability 获得
  unsubscribes.push(
    abilitySet.onAbilityGranted((ability) => {
      ctx.pushEvent(
        createAbilityGrantedEvent(ctx.getLogicTime(), ctx.actorId, {
          instanceId: ability.id,
          configId: ability.configId,
        })
      );
    })
  );

  // 订阅 Ability 移除
  unsubscribes.push(
    abilitySet.onAbilityRevoked((ability) => {
      ctx.pushEvent(
        createAbilityRemovedEvent(ctx.getLogicTime(), ctx.actorId, ability.id)
      );
    })
  );

  // TODO: 订阅 Tag 变化（需要 AbilitySet 添加 onTagChanged 回调）

  return unsubscribes;
}
