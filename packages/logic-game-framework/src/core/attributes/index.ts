/**
 * 属性系统 - Attributes Module
 *
 * 提供类型安全的角色属性管理，支持四层 Modifier 公式计算。
 *
 * ## 对外 API（游戏开发者使用）
 *
 * ### 核心函数
 * - `defineAttributes(config)` - 创建类型安全的属性集
 * - `restoreAttributes(data)` - 从序列化数据恢复属性集
 *
 * ### 类型定义
 * - `TypedAttributeSet<T>` - 属性集类型
 * - `AttributesConfig` - 属性配置类型
 * - `AttributeDefConfig` - 单个属性配置
 * - `ModifierBreakdown` - 属性详情（$xxx 返回类型）
 * - `AttributeChangeEvent` - 属性变化事件
 *
 * ### 使用示例
 *
 * ```typescript
 * import { defineAttributes, TypedAttributeSet, AttributesConfig } from '@lomo/logic-game-framework';
 *
 * // 1. 定义角色属性配置
 * const heroConfig = {
 *   maxHp: { baseValue: 100, minValue: 0 },
 *   currentHp: { baseValue: 100, minValue: 0 },
 *   attack: { baseValue: 50 },
 *   defense: { baseValue: 30 },
 *   speed: { baseValue: 10 },
 * } as const;
 *
 * // 2. 创建角色类
 * class Character {
 *   readonly name: string;
 *   readonly attributes: TypedAttributeSet<typeof heroConfig>;
 *
 *   constructor(name: string) {
 *     this.name = name;
 *     this.attributes = defineAttributes(heroConfig);
 *
 *     // 3. 订阅属性变化
 *     this.attributes.onCurrentHpChanged((event) => {
 *       console.log(`${this.name} HP: ${event.oldValue} → ${event.newValue}`);
 *       if (event.newValue <= 0) {
 *         console.log(`${this.name} 已阵亡！`);
 *       }
 *     });
 *   }
 *
 *   // 4. 获取属性值
 *   get hp() { return this.attributes.currentHp; }
 *   get maxHp() { return this.attributes.maxHp; }
 *   get attack() { return this.attributes.attack; }
 *
 *   // 5. 直接修改基础值（少数情况）
 *   takeDamage(damage: number) {
 *     const newHp = Math.max(0, this.attributes.currentHp - damage);
 *     this.attributes.setBase('currentHp', newHp);
 *   }
 *
 *   // 6. 查看属性详情
 *   showAttackBreakdown() {
 *     const breakdown = this.attributes.$attack;
 *     console.log(`攻击力分解：`);
 *     console.log(`  基础值: ${breakdown.base}`);
 *     console.log(`  肉体强化: +${breakdown.addBaseSum}`);
 *     console.log(`  肉体潜能: ×${breakdown.mulBaseProduct}`);
 *     console.log(`  外物附加: +${breakdown.addFinalSum}`);
 *     console.log(`  最终值: ${breakdown.currentValue}`);
 *   }
 * }
 *
 * // 7. 使用 StatModifierComponent 修改属性（推荐方式）
 * // 参见 stdlib/components/StatModifierComponent
 * const hero = new Character('勇者');
 * const buffAbility = new Ability('power-buff');
 * buffAbility.addComponent(new StatModifierComponent([
 *   { attributeName: hero.attributes.attackAttribute, modifierType: ModifierType.AddBase, value: 20 },
 * ]));
 * ```
 *
 * @packageDocumentation
 */

// ============================================================
// 对外 API（Public API）- 游戏开发者使用
// ============================================================

/**
 * 创建类型安全的属性集
 */
export { defineAttributes, restoreAttributes } from './defineAttributes.js';

/**
 * 类型定义
 */
export type {
  /** 类型安全的属性集代理 */
  TypedAttributeSet,
  /** 属性集合配置 */
  AttributesConfig,
  /** 单个属性配置 */
  AttributeDefConfig,
} from './defineAttributes.js';

export type {
  /** 属性详情（$xxx 返回类型） */
  ModifierBreakdown,
} from './AttributeModifier.js';

export type {
  /** 属性变化事件 */
  AttributeChangeEvent,
} from './AttributeSet.js';

// ============================================================
// 内部 API（Internal API）- 框架内部 / stdlib 使用
// 注意：这些 API 不建议游戏开发者直接使用
// ============================================================

/**
 * @internal Modifier 类型枚举（值 + 类型）
 */
export { ModifierType } from './AttributeModifier.js';
export type { AttributeModifier } from './AttributeModifier.js';

/**
 * @internal Modifier 创建辅助函数（供 StatModifierComponent 使用）
 */
export {
  createAddBaseModifier,
  createMulBaseModifier,
  createAddFinalModifier,
  createMulFinalModifier,
} from './AttributeModifier.js';

/**
 * @internal 属性计算函数
 */
export {
  calculateAttribute,
  calculateBodyValue,
  calculateCurrentValue,
} from './AttributeCalculator.js';

/**
 * @internal 底层 AttributeSet 类
 */
export {
  AttributeSet,
} from './AttributeSet.js';

/**
 * @internal 底层类型定义
 */
export type {
  AttributeConfig,
  AttributeChangeListener,
  AttributeHooks,
  AttributeHookResult,
} from './AttributeSet.js';

/**
 * @internal Modifier 写入接口（仅供 AbilityComponent 使用）
 */
export type { IAttributeModifierTarget } from './defineAttributes.js';
