/**
 * 属性集合工厂函数
 *
 * 提供类型安全的属性定义和访问方式，支持 IDE 自动补全。
 *
 * 注意：Modifier 的添加/移除只能通过 AbilityComponent 进行，
 * 外部代码无法直接调用 addModifier。
 *
 * @example
 * ```typescript
 * const hero = defineAttributes({
 *   maxHp: { baseValue: 100, minValue: 0 },
 *   attack: { baseValue: 50 },
 *   defense: { baseValue: 30 },
 * });
 *
 * // 直接访问 currentValue（最常用）
 * hero.maxHp          // → 100
 * hero.attack         // → 50
 *
 * // $ 前缀访问 breakdown（需要详情时）
 * hero.$maxHp.base       // → 100
 * hero.$maxHp.bodyValue  // → 100
 *
 * // 设置基础值
 * hero.setBase('attack', 60);
 *
 * // ❌ 外部无法调用 addModifier（编译错误）
 * // hero.addModifier(...);  // Property 'addModifier' does not exist
 * ```
 */

import type { AttributeModifier, ModifierBreakdown } from './AttributeModifier.js';
import type { AttributeChangeEvent, AttributeChangeListener, AttributeHooks } from './AttributeSet.js';
import { AttributeSet } from './AttributeSet.js';

/**
 * 单个属性配置
 */
export type AttributeDefConfig = {
  /** 初始基础值 */
  baseValue: number;
  /** 最小值约束（可选） */
  minValue?: number;
  /** 最大值约束（可选） */
  maxValue?: number;
};

/**
 * 属性集合配置
 */
export type AttributesConfig = Record<string, AttributeDefConfig>;

/**
 * Modifier 写入接口（内部使用）
 *
 * 此接口仅提供给 AbilityComponent 使用，外部代码不应直接使用。
 * 通过 TypedAttributeSet._modifierTarget 获取。
 */
export type IAttributeModifierTarget = {
  /**
   * 添加 Modifier
   */
  addModifier(modifier: AttributeModifier): void;

  /**
   * 移除 Modifier
   */
  removeModifier(modifierId: string): boolean;

  /**
   * 移除来自特定来源的所有 Modifier
   */
  removeModifiersBySource(source: string): number;

  /**
   * 获取属性的所有 Modifier
   */
  getModifiers(name: string): readonly AttributeModifier[];

  /**
   * 检查是否有指定 ID 的 Modifier
   */
  hasModifier(modifierId: string): boolean;
};

/**
 * 类型安全的属性集合代理
 *
 * - `attrs.xxx` → 返回 currentValue (number)
 * - `attrs.$xxx` → 返回 ModifierBreakdown
 * - `attrs.xxxAttribute` → 返回属性名字符串字面量（用于 StatModifier）
 * - `attrs.setBase(name, value)` → 设置基础值
 *
 * 注意：Modifier 管理方法已移至内部接口，外部无法直接调用
 */
export type TypedAttributeSet<T extends AttributesConfig> = {
  /** 直接访问属性名返回 currentValue */
  readonly [K in keyof T]: number;
} & {
  /** $ 前缀访问返回完整 breakdown */
  readonly [K in keyof T as `$${string & K}`]: ModifierBreakdown;
} & {
  /**
   * Attribute 后缀返回属性名字符串字面量
   *
   * 类似 UE 的 GetMaxHPAttribute()，用于类型安全地引用属性名
   *
   * @example
   * ```typescript
   * hero.attackAttribute  // → 'attack'
   *
   * // 用于 StatModifierComponent
   * new StatModifierComponent([
   *   { attributeName: hero.attackAttribute, modifierType: ModifierType.AddBase, value: 20 }
   * ])
   * ```
   */
  readonly [K in keyof T as `${string & K}Attribute`]: K;
} & {
  /**
   * onXxxChanged 委托：订阅特定属性的变化事件
   *
   * 类似 UE 的 OnMaxHPChanged 委托，返回取消订阅函数
   *
   * @example
   * ```typescript
   * const unsubscribe = hero.onAttackChanged((event) => {
   *   console.log(`Attack: ${event.oldValue} → ${event.newValue}`);
   * });
   *
   * // 取消订阅
   * unsubscribe();
   * ```
   */
  readonly [K in keyof T as `on${Capitalize<string & K>}Changed`]: (
    callback: (event: AttributeChangeEvent) => void
  ) => () => void;
} & {
  // ========== 基础值操作 ==========

  /**
   * 获取基础值
   */
  getBase<K extends keyof T>(name: K): number;

  /**
   * 设置基础值
   */
  setBase<K extends keyof T>(name: K, value: number): void;

  /**
   * 修改基础值（增量）
   */
  modifyBase<K extends keyof T>(name: K, delta: number): void;

  // ========== 详细数据访问 ==========

  /**
   * 获取完整的属性分层数据
   */
  getBreakdown<K extends keyof T>(name: K): ModifierBreakdown;

  /**
   * 检查属性是否存在
   */
  hasAttribute(name: string): boolean;

  // ========== 监听器 ==========

  /**
   * 添加变化监听器
   */
  addChangeListener(listener: AttributeChangeListener): void;

  /**
   * 移除变化监听器
   */
  removeChangeListener(listener: AttributeChangeListener): void;

  /**
   * 移除所有变化监听器
   *
   * 用于清理所有订阅（包括 onXxxChanged 创建的监听器），防止内存泄漏
   *
   * @example
   * ```typescript
   * // 清理角色销毁时的所有监听器
   * character.attributes.removeAllChangeListeners();
   * ```
   */
  removeAllChangeListeners(): void;

  // ========== 钩子 ==========

  /**
   * 设置属性钩子
   */
  setHooks<K extends keyof T>(name: K, hooks: Partial<AttributeHooks>): void;

  /**
   * 设置全局钩子
   */
  setGlobalHooks(hooks: Partial<AttributeHooks>): void;

  // ========== 序列化 ==========

  /**
   * 序列化（用于存档）
   */
  serialize(): object;

  // ========== 内部访问 ==========

  /**
   * 获取底层 AttributeSet 实例（高级用法）
   */
  readonly _raw: AttributeSet;

  /**
   * 获取 Modifier 写入接口（仅供 AbilityComponent 内部使用）
   *
   * ⚠️ 警告：此接口不应在 Component 外部使用
   */
  readonly _modifierTarget: IAttributeModifierTarget;
};

// ========== 内部辅助函数 ==========

/**
 * 创建 Modifier 写入接口
 */
function createModifierTarget(set: AttributeSet): IAttributeModifierTarget {
  return {
    addModifier: (modifier: AttributeModifier) => set.addModifier(modifier),
    removeModifier: (modifierId: string) => set.removeModifier(modifierId),
    removeModifiersBySource: (source: string) => set.removeModifiersBySource(source),
    getModifiers: (name: string) => set.getModifiers(name),
    hasModifier: (modifierId: string) => set.hasModifier(modifierId),
  };
}

/**
 * 创建 TypedAttributeSet 的 Proxy handler
 *
 * 此函数提取了 defineAttributes 和 restoreAttributes 共用的 Proxy 逻辑
 */
function createAttributeProxyHandler<T extends AttributesConfig>(
  set: AttributeSet,
  attrNames: Set<string>,
  modifierTarget: IAttributeModifierTarget
): ProxyHandler<TypedAttributeSet<T>> {
  return {
    get(_target, prop: string | symbol) {
      // symbol 属性直接透传
      if (typeof prop === 'symbol') {
        return (set as any)[prop];
      }

      // _raw: 返回底层 AttributeSet
      if (prop === '_raw') {
        return set;
      }

      // _modifierTarget: 返回 Modifier 写入接口
      if (prop === '_modifierTarget') {
        return modifierTarget;
      }

      // $xxx: 返回 breakdown
      if (prop.startsWith('$')) {
        const attrName = prop.slice(1);
        if (attrNames.has(attrName)) {
          return set.getBreakdown(attrName);
        }
      }

      // xxxAttribute: 返回属性名字符串（类似 UE GetXxxAttribute）
      if (prop.endsWith('Attribute')) {
        const attrName = prop.slice(0, -9); // 移除 'Attribute' 后缀
        if (attrNames.has(attrName)) {
          return attrName;
        }
      }

      // onXxxChanged: 返回订阅函数（类似 UE OnXxxChanged 委托）
      if (prop.startsWith('on') && prop.endsWith('Changed')) {
        const capitalizedName = prop.slice(2, -7); // 移除 'on' 前缀和 'Changed' 后缀
        const attrName = capitalizedName.charAt(0).toLowerCase() + capitalizedName.slice(1);
        if (attrNames.has(attrName)) {
          return (callback: (event: AttributeChangeEvent) => void) => {
            // 创建过滤监听器，只监听特定属性
            const filteredListener: AttributeChangeListener = (event) => {
              if (event.attributeName === attrName) {
                callback(event);
              }
            };
            // 添加监听器
            set.addChangeListener(filteredListener);
            // 返回取消订阅函数
            return () => {
              set.removeChangeListener(filteredListener);
            };
          };
        }
      }

      // xxx: 如果是属性名，返回 currentValue
      if (attrNames.has(prop)) {
        return set.getCurrentValue(prop);
      }

      // 其他：透传到 AttributeSet（但排除 Modifier 方法）
      if (prop === 'addModifier' || prop === 'removeModifier' || prop === 'removeModifiersBySource') {
        return undefined; // 不暴露这些方法
      }

      const value = (set as any)[prop];
      if (typeof value === 'function') {
        return value.bind(set);
      }
      return value;
    },

    set(_target, prop: string | symbol, _value) {
      // 禁止直接赋值属性（应该用 setBase）
      if (typeof prop === 'string' && attrNames.has(prop)) {
        throw new Error(
          `Cannot directly set attribute "${prop}". Use setBase("${prop}", value) instead.`
        );
      }
      return false;
    },

    has(_target, prop: string | symbol) {
      if (typeof prop === 'string') {
        return attrNames.has(prop) || prop in set;
      }
      return prop in set;
    },

    ownKeys() {
      return [...attrNames];
    },

    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      if (typeof prop === 'string' && attrNames.has(prop)) {
        return {
          configurable: true,
          enumerable: true,
          value: set.getCurrentValue(prop),
        };
      }
      return undefined;
    },
  };
}

// ========== 对外 API ==========

/**
 * 定义类型安全的属性集合
 *
 * @param config 属性配置对象，键为属性名，值为属性配置
 * @returns 类型安全的属性集合代理
 *
 * @example
 * ```typescript
 * // 定义角色属性
 * const hero = defineAttributes({
 *   maxHp: { baseValue: 100, minValue: 0 },
 *   currentHp: { baseValue: 100, minValue: 0, maxValue: 100 },
 *   attack: { baseValue: 50 },
 *   defense: { baseValue: 30 },
 *   speed: { baseValue: 10 },
 * });
 *
 * // 访问当前值
 * console.log(hero.attack);  // 50
 *
 * // 添加 Buff（通过内部接口）
 * hero._modifierTarget.addModifier(createAddBaseModifier('str-buff', 'attack', 20));
 * console.log(hero.attack);  // 70
 *
 * // 查看详情
 * console.log(hero.$attack.addBaseSum);  // 20
 * ```
 */
export function defineAttributes<T extends AttributesConfig>(
  config: T
): TypedAttributeSet<T> {
  // 创建底层 AttributeSet
  const set = new AttributeSet(
    Object.entries(config).map(([name, cfg]) => ({
      name,
      baseValue: cfg.baseValue,
      minValue: cfg.minValue,
      maxValue: cfg.maxValue,
    }))
  );

  // 缓存属性名集合，用于快速判断
  const attrNames = new Set(Object.keys(config));

  // 创建 Modifier 写入接口（内部使用）
  const modifierTarget = createModifierTarget(set);

  // 创建 Proxy
  return new Proxy(
    set as unknown as TypedAttributeSet<T>,
    createAttributeProxyHandler(set, attrNames, modifierTarget)
  );
}

/**
 * 从序列化数据恢复类型安全的属性集合
 *
 * @param data 序列化数据
 * @returns 类型安全的属性集合代理
 *
 * @example
 * ```typescript
 * // 存档
 * const saved = hero.serialize();
 *
 * // 读档
 * const restored = restoreAttributes<typeof heroConfig>(saved);
 * ```
 */
export function restoreAttributes<T extends AttributesConfig>(
  data: object
): TypedAttributeSet<T> {
  const set = AttributeSet.deserialize(data);
  const attrNames = new Set(Object.keys(data));

  // 创建 Modifier 写入接口（内部使用）
  const modifierTarget = createModifierTarget(set);

  // 创建 Proxy（复用公共 handler）
  return new Proxy(
    set as unknown as TypedAttributeSet<T>,
    createAttributeProxyHandler(set, attrNames, modifierTarget)
  );
}
