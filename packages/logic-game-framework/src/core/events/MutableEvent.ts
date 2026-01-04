/**
 * MutableEvent - 可变事件实现
 *
 * 包装原始事件，提供修改和取消能力（仅 Pre 阶段有效）。
 *
 * ## 修改应用规则
 *
 * 当获取字段当前值时，按以下顺序应用修改：
 * 1. **set**: 最后一个 set 操作的值作为基础（如果有）
 * 2. **add**: 所有 add 操作累加
 * 3. **multiply**: 所有 multiply 操作累乘
 *
 * ## 使用示例
 *
 * ```typescript
 * const mutable = new MutableEventImpl(damageEvent, 'pre');
 *
 * // 护甲减伤 30%
 * mutable.addModification({ field: 'damage', operation: 'multiply', value: 0.7 });
 *
 * // 固定减伤 10
 * mutable.addModification({ field: 'damage', operation: 'add', value: -10 });
 *
 * // 获取最终伤害
 * const finalDamage = mutable.getCurrentValue('damage'); // 原始 100 → 70 → 60
 * ```
 */

import type { GameEventBase } from './GameEvent.js';
import type { EventPhase, EventModification, MutableEvent } from './EventPhase.js';

/**
 * MutableEvent 实现类
 */
export class MutableEventImpl<T extends GameEventBase = GameEventBase> implements MutableEvent<T> {
  readonly original: T;
  readonly phase: EventPhase;

  cancelled = false;
  cancelReason?: string;
  cancelledBy?: string;

  private _modifications: EventModification[] = [];

  constructor(original: T, phase: EventPhase) {
    this.original = original;
    this.phase = phase;
  }

  get modifications(): EventModification[] {
    return this._modifications;
  }

  /**
   * 获取字段当前值（应用所有修改后）
   *
   * 修改应用顺序：
   * 1. 取原始值（或最后一个 set 值）
   * 2. 累加所有 add
   * 3. 累乘所有 multiply
   */
  getCurrentValue(field: string): unknown {
    const originalValue = this.original[field];

    // 非数字字段直接返回原值
    if (typeof originalValue !== 'number') {
      return originalValue;
    }

    // 筛选该字段的所有修改
    const fieldMods = this._modifications.filter((m) => m.field === field);
    if (fieldMods.length === 0) {
      return originalValue;
    }

    // 分类
    const sets = fieldMods.filter((m) => m.operation === 'set');
    const adds = fieldMods.filter((m) => m.operation === 'add');
    const muls = fieldMods.filter((m) => m.operation === 'multiply');

    // 1. 基础值：最后一个 set，或原始值
    let value = sets.length > 0 ? sets[sets.length - 1].value : originalValue;

    // 2. 累加
    for (const mod of adds) {
      value += mod.value;
    }

    // 3. 累乘
    for (const mod of muls) {
      value *= mod.value;
    }

    return value;
  }

  /**
   * 添加修改
   */
  addModification(modification: EventModification): void {
    this._modifications.push(modification);
  }

  /**
   * 批量添加修改
   */
  addModifications(modifications: readonly EventModification[]): void {
    this._modifications.push(...modifications);
  }

  /**
   * 取消事件
   */
  cancel(handlerId: string, reason: string): void {
    this.cancelled = true;
    this.cancelledBy = handlerId;
    this.cancelReason = reason;
  }

  /**
   * 生成最终事件（应用所有修改）
   */
  toFinalEvent(): T {
    if (this._modifications.length === 0) {
      return this.original;
    }

    // 收集所有被修改的字段
    const modifiedFields = new Set(this._modifications.map((m) => m.field));

    // 构建最终事件
    const finalEvent = { ...this.original } as Record<string, unknown>;
    for (const field of modifiedFields) {
      finalEvent[field] = this.getCurrentValue(field);
    }

    return finalEvent as T;
  }

  /**
   * 获取所有被修改字段的原始值
   */
  getOriginalValues(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const modifiedFields = new Set(this._modifications.map((m) => m.field));

    for (const field of modifiedFields) {
      result[field] = this.original[field];
    }

    return result;
  }

  /**
   * 获取所有被修改字段的最终值
   */
  getFinalValues(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const modifiedFields = new Set(this._modifications.map((m) => m.field));

    for (const field of modifiedFields) {
      result[field] = this.getCurrentValue(field);
    }

    return result;
  }
}

/**
 * 创建可变事件
 */
export function createMutableEvent<T extends GameEventBase>(
  event: T,
  phase: EventPhase
): MutableEvent<T> {
  return new MutableEventImpl(event, phase);
}
