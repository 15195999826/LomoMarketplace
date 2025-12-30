/**
 * 属性计算器
 *
 * 实现四层公式：
 * CurrentValue = ((Base + AddBase) × MulBase + AddFinal) × MulFinal
 *
 * 聚合规则：同类型求和（非求积）
 */

import { ModifierType, type AttributeModifier, type ModifierBreakdown } from './AttributeModifier.js';

/**
 * 计算属性最终值
 * @param baseValue 基础值
 * @param modifiers 应用于该属性的所有修改器
 * @returns 计算结果，包含分层数据
 */
export function calculateAttribute(
  baseValue: number,
  modifiers: readonly AttributeModifier[]
): ModifierBreakdown {
  // 按类型分组并求和
  let addBaseSum = 0;
  let mulBaseSum = 0; // 注意：这是增量百分比的和，最终乘数 = 1 + sum
  let addFinalSum = 0;
  let mulFinalSum = 0;

  for (const mod of modifiers) {
    switch (mod.modifierType) {
      case ModifierType.AddBase:
        addBaseSum += mod.value;
        break;
      case ModifierType.MulBase:
        mulBaseSum += mod.value;
        break;
      case ModifierType.AddFinal:
        addFinalSum += mod.value;
        break;
      case ModifierType.MulFinal:
        mulFinalSum += mod.value;
        break;
    }
  }

  // 计算乘数（基础值为 1，加上所有百分比增量）
  const mulBaseProduct = 1 + mulBaseSum;
  const mulFinalProduct = 1 + mulFinalSum;

  // 肉体属性 = (Base + AddBase) × MulBase
  const bodyValue = (baseValue + addBaseSum) * mulBaseProduct;

  // 最终值 = (BodyValue + AddFinal) × MulFinal
  const currentValue = (bodyValue + addFinalSum) * mulFinalProduct;

  return {
    base: baseValue,
    addBaseSum,
    mulBaseProduct,
    bodyValue,
    addFinalSum,
    mulFinalProduct,
    currentValue,
  };
}

/**
 * 快速计算肉体属性
 * 用于装备需求检测等场景
 */
export function calculateBodyValue(
  baseValue: number,
  modifiers: readonly AttributeModifier[]
): number {
  let addBaseSum = 0;
  let mulBaseSum = 0;

  for (const mod of modifiers) {
    if (mod.modifierType === ModifierType.AddBase) {
      addBaseSum += mod.value;
    } else if (mod.modifierType === ModifierType.MulBase) {
      mulBaseSum += mod.value;
    }
  }

  return (baseValue + addBaseSum) * (1 + mulBaseSum);
}

/**
 * 快速计算最终值
 * 用于战斗计算等高频场景
 */
export function calculateCurrentValue(
  baseValue: number,
  modifiers: readonly AttributeModifier[]
): number {
  return calculateAttribute(baseValue, modifiers).currentValue;
}
