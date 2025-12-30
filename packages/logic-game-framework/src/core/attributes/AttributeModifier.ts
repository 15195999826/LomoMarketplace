/**
 * 属性修改器类型
 *
 * 四层语义模型：
 * 1. AddBase  - 肉体强化（基础加法）
 * 2. MulBase  - 肉体潜能（基础乘法）
 * 3. AddFinal - 外物附加（最终加法）
 * 4. MulFinal - 状态效率（最终乘法）
 *
 * @example
 * ```typescript
 * // 使用枚举值（推荐，IDE 自动补全）
 * { modifierType: ModifierType.AddBase }
 *
 * // 也支持字符串（兼容旧代码）
 * { modifierType: 'AddBase' }
 * ```
 */
export const ModifierType = {
  /** 肉体强化（基础加法） */
  AddBase: 'AddBase',
  /** 肉体潜能（基础乘法） */
  MulBase: 'MulBase',
  /** 外物附加（最终加法） */
  AddFinal: 'AddFinal',
  /** 状态效率（最终乘法） */
  MulFinal: 'MulFinal',
} as const;

/** 修改器类型 */
export type ModifierType = (typeof ModifierType)[keyof typeof ModifierType];

/**
 * 属性修改器
 * 描述"如何修改某个属性"的数据结构
 */
export type AttributeModifier = {
  /** 修改器唯一标识 */
  readonly id: string;

  /** 目标属性名 */
  readonly attributeName: string;

  /** 修改器类型 */
  readonly modifierType: ModifierType;

  /**
   * 修改值
   * - AddBase/AddFinal: 直接加减的数值
   * - MulBase/MulFinal: 百分比值（0.2 表示 +20%，-0.3 表示 -30%）
   */
  readonly value: number;

  /** 来源标识（便于调试和追踪） */
  readonly source?: string;

  /** 优先级（同类型内的排序，数值越大越先应用） */
  readonly priority?: number;
};

/**
 * 创建 AddBase 修改器
 * 用于肉体强化，如"力量训练 +10"
 */
export function createAddBaseModifier(
  id: string,
  attributeName: string,
  value: number,
  source?: string
): AttributeModifier {
  return {
    id,
    attributeName,
    modifierType: ModifierType.AddBase,
    value,
    source,
  };
}

/**
 * 创建 MulBase 修改器
 * 用于肉体潜能，如"天赋觉醒 +20%"
 */
export function createMulBaseModifier(
  id: string,
  attributeName: string,
  value: number,
  source?: string
): AttributeModifier {
  return {
    id,
    attributeName,
    modifierType: ModifierType.MulBase,
    value,
    source,
  };
}

/**
 * 创建 AddFinal 修改器
 * 用于外物附加，如"装备攻击力 +50"
 */
export function createAddFinalModifier(
  id: string,
  attributeName: string,
  value: number,
  source?: string
): AttributeModifier {
  return {
    id,
    attributeName,
    modifierType: ModifierType.AddFinal,
    value,
    source,
  };
}

/**
 * 创建 MulFinal 修改器
 * 用于状态效率，如"虚弱 -30%"
 */
export function createMulFinalModifier(
  id: string,
  attributeName: string,
  value: number,
  source?: string
): AttributeModifier {
  return {
    id,
    attributeName,
    modifierType: ModifierType.MulFinal,
    value,
    source,
  };
}

/**
 * Modifier 聚合结果
 * 用于 UI 显示属性分层
 */
export type ModifierBreakdown = {
  /** 基础值 */
  base: number;
  /** 肉体强化总和 */
  addBaseSum: number;
  /** 肉体潜能乘数（1 + 所有 MulBase 之和） */
  mulBaseProduct: number;
  /** 肉体属性 = (base + addBaseSum) * mulBaseProduct */
  bodyValue: number;
  /** 外物附加总和 */
  addFinalSum: number;
  /** 效率乘数（1 + 所有 MulFinal 之和） */
  mulFinalProduct: number;
  /** 最终值 = (bodyValue + addFinalSum) * mulFinalProduct */
  currentValue: number;
};
