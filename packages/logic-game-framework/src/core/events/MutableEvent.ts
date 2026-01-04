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

  /**
   * 获取字段的详细计算步骤
   *
   * 用于调试和追踪 Intent 合并过程。
   *
   * @example
   * ```typescript
   * const steps = mutable.getFieldComputationSteps('damage');
   * // 输出示例：
   * // {
   * //   field: 'damage',
   * //   originalValue: 100,
   * //   finalValue: 63,
   * //   steps: [
   * //     { sourceId: 'shield', operation: 'add', value: -10, resultValue: 90 },
   * //     { sourceId: 'armor', operation: 'multiply', value: 0.7, resultValue: 63 },
   * //   ]
   * // }
   * ```
   */
  getFieldComputationSteps(field: string): FieldComputationRecord | null {
    const originalValue = this.original[field];

    if (typeof originalValue !== 'number') {
      return null;
    }

    const fieldMods = this._modifications.filter((m) => m.field === field);
    if (fieldMods.length === 0) {
      return null;
    }

    // 分类
    const sets = fieldMods.filter((m) => m.operation === 'set');
    const adds = fieldMods.filter((m) => m.operation === 'add');
    const muls = fieldMods.filter((m) => m.operation === 'multiply');

    const steps: ComputationStep[] = [];
    let value = sets.length > 0 ? sets[sets.length - 1].value : originalValue;

    // 记录 set 操作（如果有）
    if (sets.length > 0) {
      const lastSet = sets[sets.length - 1];
      steps.push({
        sourceId: lastSet.sourceId ?? 'unknown',
        sourceName: lastSet.sourceName,
        operation: 'set',
        value: lastSet.value,
        resultValue: value,
      });
    }

    // 记录 add 操作
    for (const mod of adds) {
      value += mod.value;
      steps.push({
        sourceId: mod.sourceId ?? 'unknown',
        sourceName: mod.sourceName,
        operation: 'add',
        value: mod.value,
        resultValue: value,
      });
    }

    // 记录 multiply 操作
    for (const mod of muls) {
      value *= mod.value;
      steps.push({
        sourceId: mod.sourceId ?? 'unknown',
        sourceName: mod.sourceName,
        operation: 'multiply',
        value: mod.value,
        resultValue: value,
      });
    }

    return {
      field,
      originalValue,
      finalValue: value,
      steps,
    };
  }

  /**
   * 获取所有被修改字段的计算步骤
   */
  getAllComputationSteps(): FieldComputationRecord[] {
    const modifiedFields = new Set(this._modifications.map((m) => m.field));
    const records: FieldComputationRecord[] = [];

    for (const field of modifiedFields) {
      const record = this.getFieldComputationSteps(field);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  /**
   * 格式化计算过程为可读字符串（用于调试）
   */
  formatComputationLog(field: string): string {
    const record = this.getFieldComputationSteps(field);
    if (!record) {
      return `${field}: no modifications`;
    }

    const lines: string[] = [];
    lines.push(`${field}: ${record.originalValue} → ${record.finalValue}`);

    for (const step of record.steps) {
      const source = step.sourceName ?? step.sourceId;
      const opSign =
        step.operation === 'add'
          ? step.value >= 0
            ? '+'
            : ''
          : step.operation === 'multiply'
            ? '×'
            : '=';
      lines.push(`  [${source}] ${opSign}${step.value} → ${step.resultValue}`);
    }

    return lines.join('\n');
  }
}

// ========== 计算步骤类型 ==========

/**
 * 单个计算步骤
 */
export type ComputationStep = {
  readonly sourceId: string;
  readonly sourceName?: string;
  readonly operation: 'set' | 'add' | 'multiply';
  readonly value: number;
  readonly resultValue: number;
};

/**
 * 字段计算记录
 */
export type FieldComputationRecord = {
  readonly field: string;
  readonly originalValue: number;
  readonly finalValue: number;
  readonly steps: readonly ComputationStep[];
};

/**
 * 创建可变事件
 */
export function createMutableEvent<T extends GameEventBase>(
  event: T,
  phase: EventPhase
): MutableEvent<T> {
  return new MutableEventImpl(event, phase);
}
