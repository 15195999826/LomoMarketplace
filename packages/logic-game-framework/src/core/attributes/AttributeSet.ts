/**
 * 属性集合
 *
 * 核心职责：
 * 1. 持有一组属性的基础值
 * 2. 管理 Modifier
 * 3. 计算 CurrentValue（含缓存和脏标记）
 * 4. 处理循环依赖
 * 5. 提供变化钩子
 */

import { generateId } from '../utils/IdGenerator.js';
import { getLogger } from '../utils/Logger.js';
import type { AttributeModifier, ModifierBreakdown } from './AttributeModifier.js';
import { calculateAttribute, calculateBodyValue } from './AttributeCalculator.js';

/**
 * 属性变化事件
 */
export type AttributeChangeEvent = {
  readonly attributeName: string;
  readonly oldValue: number;
  readonly newValue: number;
  readonly changeType: 'base' | 'modifier' | 'current';
};

/**
 * 属性变化钩子结果
 * 返回 false 可阻止变化（仅 Pre 钩子有效）
 * 返回 number 可修改即将应用的值（仅 Pre 钩子有效）
 */
export type AttributeHookResult = void | boolean | number;

/**
 * 属性变化钩子
 */
export type AttributeHooks = {
  /** 基础值变化前（可阻止或修改） */
  preBaseChange?: (event: AttributeChangeEvent) => AttributeHookResult;
  /** 基础值变化后 */
  postBaseChange?: (event: AttributeChangeEvent) => void;
  /** 当前值变化前（可阻止或修改） */
  preCurrentChange?: (event: AttributeChangeEvent) => AttributeHookResult;
  /** 当前值变化后 */
  postCurrentChange?: (event: AttributeChangeEvent) => void;
};

/**
 * 属性变化监听器
 */
export type AttributeChangeListener = (event: AttributeChangeEvent) => void;

/**
 * 属性配置
 */
export type AttributeConfig = {
  /** 属性名 */
  name: string;
  /** 初始基础值 */
  baseValue: number;
  /** 最小值（可选） */
  minValue?: number;
  /** 最大值（可选） */
  maxValue?: number;
};

/**
 * 属性集合
 */
export class AttributeSet {
  /** 基础值存储 */
  private baseValues: Map<string, number> = new Map();

  /** Modifier 存储（按属性名分组） */
  private modifiers: Map<string, AttributeModifier[]> = new Map();

  /** 缓存存储 */
  private cache: Map<string, ModifierBreakdown> = new Map();

  /** 脏标记 */
  private dirtySet: Set<string> = new Set();

  /** 正在计算的属性集合（用于检测循环依赖） */
  private computingSet: Set<string> = new Set();

  /** 属性约束（min/max） */
  private constraints: Map<string, { min?: number; max?: number }> = new Map();

  /** 变化监听器 */
  private listeners: AttributeChangeListener[] = [];

  /** 属性钩子（按属性名分组） */
  private hooks: Map<string, AttributeHooks> = new Map();

  /** 全局钩子（对所有属性生效） */
  private globalHooks: AttributeHooks = {};

  /**
   * 构造函数
   * @param attributes 初始属性配置
   */
  constructor(attributes?: AttributeConfig[]) {
    if (attributes) {
      for (const attr of attributes) {
        this.defineAttribute(attr.name, attr.baseValue, attr.minValue, attr.maxValue);
      }
    }
  }

  /**
   * 定义属性
   */
  defineAttribute(name: string, baseValue: number, minValue?: number, maxValue?: number): void {
    this.baseValues.set(name, baseValue);
    this.modifiers.set(name, []);
    this.dirtySet.add(name);

    if (minValue !== undefined || maxValue !== undefined) {
      this.constraints.set(name, { min: minValue, max: maxValue });
    }
  }

  /**
   * 检查属性是否存在
   */
  hasAttribute(name: string): boolean {
    return this.baseValues.has(name);
  }

  /**
   * 获取基础值
   */
  getBase(name: string): number {
    const value = this.baseValues.get(name);
    if (value === undefined) {
      getLogger().warn(`Attribute not found: ${name}`);
      return 0;
    }
    return value;
  }

  /**
   * 设置基础值
   */
  setBase(name: string, value: number): void {
    if (!this.baseValues.has(name)) {
      getLogger().warn(`Attribute not found: ${name}`);
      return;
    }

    const oldValue = this.baseValues.get(name)!;
    const clampedValue = this.clampValue(name, value);

    if (oldValue === clampedValue) {
      return;
    }

    // 创建变化事件
    const event: AttributeChangeEvent = {
      attributeName: name,
      oldValue,
      newValue: clampedValue,
      changeType: 'base',
    };

    // 调用 preBaseChange 钩子
    const hookResult = this.invokePreHook('preBaseChange', event);
    if (hookResult === false) {
      // 钩子阻止了变化
      return;
    }

    // 如果钩子返回数字，使用该值
    const finalValue = typeof hookResult === 'number'
      ? this.clampValue(name, hookResult)
      : clampedValue;

    // 应用变化
    this.baseValues.set(name, finalValue);
    this.markDirty(name);

    // 更新事件的新值
    const finalEvent: AttributeChangeEvent = {
      ...event,
      newValue: finalValue,
    };

    // 调用 postBaseChange 钩子
    this.invokePostHook('postBaseChange', finalEvent);

    // 通知监听器
    this.notifyChange(finalEvent);
  }

  /**
   * 修改基础值（增量）
   */
  modifyBase(name: string, delta: number): void {
    const current = this.getBase(name);
    this.setBase(name, current + delta);
  }

  /**
   * 获取肉体属性
   * (Base + AddBase) × MulBase
   */
  getBodyValue(name: string): number {
    const breakdown = this.getBreakdown(name);
    return breakdown.bodyValue;
  }

  /**
   * 获取当前值（最终值）
   * ((Base + AddBase) × MulBase + AddFinal) × MulFinal
   */
  getCurrentValue(name: string): number {
    const breakdown = this.getBreakdown(name);
    return breakdown.currentValue;
  }

  /**
   * 获取完整的属性分层数据
   */
  getBreakdown(name: string): ModifierBreakdown {
    // 检查循环依赖
    if (this.computingSet.has(name)) {
      getLogger().warn(`Circular dependency detected for attribute: ${name}`);
      // 返回缓存值或基础值
      const cached = this.cache.get(name);
      if (cached) {
        return cached;
      }
      // 没有缓存时返回仅基础值的结果
      const baseValue = this.baseValues.get(name) ?? 0;
      return {
        base: baseValue,
        addBaseSum: 0,
        mulBaseProduct: 1,
        bodyValue: baseValue,
        addFinalSum: 0,
        mulFinalProduct: 1,
        currentValue: baseValue,
      };
    }

    // 检查缓存
    if (!this.dirtySet.has(name) && this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    // 标记正在计算
    this.computingSet.add(name);

    try {
      const baseValue = this.baseValues.get(name) ?? 0;
      const mods = this.modifiers.get(name) ?? [];

      // 计算属性值
      const breakdown = calculateAttribute(baseValue, mods);

      // 应用约束
      const constraint = this.constraints.get(name);
      if (constraint) {
        let clampedCurrent = breakdown.currentValue;
        if (constraint.min !== undefined && clampedCurrent < constraint.min) {
          clampedCurrent = constraint.min;
        }
        if (constraint.max !== undefined && clampedCurrent > constraint.max) {
          clampedCurrent = constraint.max;
        }
        if (clampedCurrent !== breakdown.currentValue) {
          // 创建新的 breakdown 对象，保持不可变性
          const clampedBreakdown: ModifierBreakdown = {
            ...breakdown,
            currentValue: clampedCurrent,
          };
          this.cache.set(name, clampedBreakdown);
          this.dirtySet.delete(name);
          return clampedBreakdown;
        }
      }

      // 缓存结果
      this.cache.set(name, breakdown);
      this.dirtySet.delete(name);

      return breakdown;
    } finally {
      // 清除计算标记
      this.computingSet.delete(name);
    }
  }

  /**
   * 获取 AddBase 总和
   */
  getAddBaseSum(name: string): number {
    return this.getBreakdown(name).addBaseSum;
  }

  /**
   * 获取 MulBase 乘数
   */
  getMulBaseProduct(name: string): number {
    return this.getBreakdown(name).mulBaseProduct;
  }

  /**
   * 获取 AddFinal 总和
   */
  getAddFinalSum(name: string): number {
    return this.getBreakdown(name).addFinalSum;
  }

  /**
   * 获取 MulFinal 乘数
   */
  getMulFinalProduct(name: string): number {
    return this.getBreakdown(name).mulFinalProduct;
  }

  // ========== Modifier 管理 ==========

  /**
   * 添加 Modifier
   */
  addModifier(modifier: AttributeModifier): void {
    const attrName = modifier.attributeName;

    if (!this.modifiers.has(attrName)) {
      getLogger().warn(`Attribute not found for modifier: ${attrName}`);
      return;
    }

    const mods = this.modifiers.get(attrName)!;

    // 检查是否已存在
    if (mods.some((m) => m.id === modifier.id)) {
      getLogger().warn(`Modifier already exists: ${modifier.id}`);
      return;
    }

    const oldValue = this.getCurrentValue(attrName);

    mods.push(modifier);
    this.markDirty(attrName);

    const newValue = this.getCurrentValue(attrName);
    if (oldValue !== newValue) {
      this.notifyChange({
        attributeName: attrName,
        oldValue,
        newValue,
        changeType: 'modifier',
      });
    }
  }

  /**
   * 移除 Modifier
   */
  removeModifier(modifierId: string): boolean {
    for (const [attrName, mods] of this.modifiers.entries()) {
      const index = mods.findIndex((m) => m.id === modifierId);
      if (index !== -1) {
        const oldValue = this.getCurrentValue(attrName);

        mods.splice(index, 1);
        this.markDirty(attrName);

        const newValue = this.getCurrentValue(attrName);
        if (oldValue !== newValue) {
          this.notifyChange({
            attributeName: attrName,
            oldValue,
            newValue,
            changeType: 'modifier',
          });
        }
        return true;
      }
    }
    return false;
  }

  /**
   * 移除来自特定来源的所有 Modifier
   */
  removeModifiersBySource(source: string): number {
    let count = 0;

    for (const [attrName, mods] of this.modifiers.entries()) {
      const oldValue = this.getCurrentValue(attrName);
      const originalLength = mods.length;

      // 过滤掉匹配的 modifier
      const filtered = mods.filter((m) => m.source !== source);
      if (filtered.length !== originalLength) {
        this.modifiers.set(attrName, filtered);
        this.markDirty(attrName);
        count += originalLength - filtered.length;

        const newValue = this.getCurrentValue(attrName);
        if (oldValue !== newValue) {
          this.notifyChange({
            attributeName: attrName,
            oldValue,
            newValue,
            changeType: 'modifier',
          });
        }
      }
    }

    return count;
  }

  /**
   * 获取属性的所有 Modifier
   */
  getModifiers(name: string): readonly AttributeModifier[] {
    return this.modifiers.get(name) ?? [];
  }

  /**
   * 检查是否有指定 ID 的 Modifier
   */
  hasModifier(modifierId: string): boolean {
    for (const mods of this.modifiers.values()) {
      if (mods.some((m) => m.id === modifierId)) {
        return true;
      }
    }
    return false;
  }

  // ========== 监听器 ==========

  /**
   * 添加变化监听器
   */
  addChangeListener(listener: AttributeChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除变化监听器
   */
  removeChangeListener(listener: AttributeChangeListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  // ========== 钩子管理 ==========

  /**
   * 设置属性钩子
   * @param name 属性名
   * @param hooks 钩子配置
   */
  setHooks(name: string, hooks: Partial<AttributeHooks>): void {
    const existing = this.hooks.get(name) ?? {};
    this.hooks.set(name, { ...existing, ...hooks });
  }

  /**
   * 获取属性钩子
   */
  getHooks(name: string): AttributeHooks | undefined {
    return this.hooks.get(name);
  }

  /**
   * 移除属性钩子
   */
  removeHooks(name: string): void {
    this.hooks.delete(name);
  }

  /**
   * 设置全局钩子（对所有属性生效）
   */
  setGlobalHooks(hooks: Partial<AttributeHooks>): void {
    this.globalHooks = { ...this.globalHooks, ...hooks };
  }

  /**
   * 获取全局钩子
   */
  getGlobalHooks(): AttributeHooks {
    return this.globalHooks;
  }

  /**
   * 清除全局钩子
   */
  clearGlobalHooks(): void {
    this.globalHooks = {};
  }

  // ========== 序列化 ==========

  /**
   * 序列化（用于存档）
   */
  serialize(): object {
    const result: Record<string, { base: number; modifiers: AttributeModifier[] }> = {};

    for (const [name, baseValue] of this.baseValues.entries()) {
      result[name] = {
        base: baseValue,
        modifiers: this.modifiers.get(name) ?? [],
      };
    }

    return result;
  }

  /**
   * 反序列化
   */
  static deserialize(data: object): AttributeSet {
    const set = new AttributeSet();
    const parsed = data as Record<string, { base: number; modifiers: AttributeModifier[] }>;

    for (const [name, attrData] of Object.entries(parsed)) {
      set.defineAttribute(name, attrData.base);
      for (const mod of attrData.modifiers) {
        set.addModifier(mod);
      }
    }

    return set;
  }

  // ========== 私有方法 ==========

  private markDirty(name: string): void {
    this.dirtySet.add(name);
  }

  private clampValue(name: string, value: number): number {
    const constraint = this.constraints.get(name);
    if (!constraint) {
      return value;
    }

    let result = value;
    if (constraint.min !== undefined && result < constraint.min) {
      result = constraint.min;
    }
    if (constraint.max !== undefined && result > constraint.max) {
      result = constraint.max;
    }
    return result;
  }

  private notifyChange(event: AttributeChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        getLogger().error('Error in attribute change listener', { error });
      }
    }
  }

  /**
   * 调用 Pre 钩子
   * @returns false 阻止变化，number 修改值，其他继续
   */
  private invokePreHook(
    hookName: 'preBaseChange' | 'preCurrentChange',
    event: AttributeChangeEvent
  ): AttributeHookResult {
    const attrHooks = this.hooks.get(event.attributeName);

    // 先调用属性特定钩子
    if (attrHooks?.[hookName]) {
      try {
        const result = attrHooks[hookName]!(event);
        if (result === false || typeof result === 'number') {
          return result;
        }
      } catch (error) {
        getLogger().error(`Error in attribute hook ${hookName}`, { error });
      }
    }

    // 再调用全局钩子
    if (this.globalHooks[hookName]) {
      try {
        const result = this.globalHooks[hookName]!(event);
        if (result === false || typeof result === 'number') {
          return result;
        }
      } catch (error) {
        getLogger().error(`Error in global attribute hook ${hookName}`, { error });
      }
    }

    return undefined;
  }

  /**
   * 调用 Post 钩子
   */
  private invokePostHook(
    hookName: 'postBaseChange' | 'postCurrentChange',
    event: AttributeChangeEvent
  ): void {
    const attrHooks = this.hooks.get(event.attributeName);

    // 先调用属性特定钩子
    if (attrHooks?.[hookName]) {
      try {
        attrHooks[hookName]!(event);
      } catch (error) {
        getLogger().error(`Error in attribute hook ${hookName}`, { error });
      }
    }

    // 再调用全局钩子
    if (this.globalHooks[hookName]) {
      try {
        this.globalHooks[hookName]!(event);
      } catch (error) {
        getLogger().error(`Error in global attribute hook ${hookName}`, { error });
      }
    }
  }
}
