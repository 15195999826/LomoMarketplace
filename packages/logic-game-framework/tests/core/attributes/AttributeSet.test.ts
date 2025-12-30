/**
 * AttributeSet 底层 API 测试
 *
 * 本文件测试 AttributeSet 类的底层实现，包括：
 * - 四层公式计算（AddBase, MulBase, AddFinal, MulFinal）
 * - Modifier 管理（添加、移除、按来源移除）
 * - 变化监听器
 *
 * 注意：这是框架内部使用的底层 API。
 * 游戏开发者应使用 defineAttributes() 高层 API，
 * 参见 defineAttributes.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AttributeSet,
  createAddBaseModifier,
  createMulBaseModifier,
  createAddFinalModifier,
  createMulFinalModifier,
} from '../../../src/core/attributes/index.js';

describe('AttributeSet（底层 API）', () => {
  let attributeSet: AttributeSet;

  beforeEach(() => {
    attributeSet = new AttributeSet([
      { name: 'hp', baseValue: 100 },
      { name: 'atk', baseValue: 50 },
      { name: 'def', baseValue: 30 },
    ]);
  });

  describe('基础值操作', () => {
    it('should get base value', () => {
      expect(attributeSet.getBase('hp')).toBe(100);
      expect(attributeSet.getBase('atk')).toBe(50);
    });

    it('should set base value', () => {
      attributeSet.setBase('hp', 120);
      expect(attributeSet.getBase('hp')).toBe(120);
    });

    it('should modify base value', () => {
      attributeSet.modifyBase('hp', -20);
      expect(attributeSet.getBase('hp')).toBe(80);
    });
  });

  describe('四层公式计算', () => {
    it('should calculate with AddBase modifier', () => {
      // Base = 100, AddBase = +10
      // CurrentValue = ((100 + 10) × 1 + 0) × 1 = 110
      const mod = createAddBaseModifier('mod1', 'hp', 10);
      attributeSet.addModifier(mod);

      expect(attributeSet.getCurrentValue('hp')).toBe(110);
      expect(attributeSet.getAddBaseSum('hp')).toBe(10);
    });

    it('should calculate with MulBase modifier', () => {
      // Base = 100, MulBase = +20% (0.2)
      // CurrentValue = ((100 + 0) × 1.2 + 0) × 1 = 120
      const mod = createMulBaseModifier('mod1', 'hp', 0.2);
      attributeSet.addModifier(mod);

      expect(attributeSet.getCurrentValue('hp')).toBe(120);
      expect(attributeSet.getMulBaseProduct('hp')).toBe(1.2);
    });

    it('should calculate with AddFinal modifier', () => {
      // Base = 100, AddFinal = +50
      // CurrentValue = ((100 + 0) × 1 + 50) × 1 = 150
      const mod = createAddFinalModifier('mod1', 'hp', 50);
      attributeSet.addModifier(mod);

      expect(attributeSet.getCurrentValue('hp')).toBe(150);
      expect(attributeSet.getAddFinalSum('hp')).toBe(50);
    });

    it('should calculate with MulFinal modifier', () => {
      // Base = 100, MulFinal = -30% (-0.3)
      // CurrentValue = ((100 + 0) × 1 + 0) × 0.7 = 70
      const mod = createMulFinalModifier('mod1', 'hp', -0.3);
      attributeSet.addModifier(mod);

      expect(attributeSet.getCurrentValue('hp')).toBe(70);
      expect(attributeSet.getMulFinalProduct('hp')).toBe(0.7);
    });

    it('should calculate full four-layer formula', () => {
      // Base = 100
      // AddBase = +10
      // MulBase = +20% (0.2)
      // AddFinal = +50
      // MulFinal = +10% (0.1)
      //
      // BodyValue = (100 + 10) × 1.2 = 132
      // CurrentValue = (132 + 50) × 1.1 = 200.2

      attributeSet.addModifier(createAddBaseModifier('m1', 'hp', 10));
      attributeSet.addModifier(createMulBaseModifier('m2', 'hp', 0.2));
      attributeSet.addModifier(createAddFinalModifier('m3', 'hp', 50));
      attributeSet.addModifier(createMulFinalModifier('m4', 'hp', 0.1));

      expect(attributeSet.getBodyValue('hp')).toBeCloseTo(132, 2);
      expect(attributeSet.getCurrentValue('hp')).toBeCloseTo(200.2, 2);
    });
  });

  describe('Modifier 聚合（求和规则）', () => {
    it('should sum AddBase modifiers', () => {
      // +10 和 +5 → +15
      attributeSet.addModifier(createAddBaseModifier('m1', 'hp', 10));
      attributeSet.addModifier(createAddBaseModifier('m2', 'hp', 5));

      expect(attributeSet.getAddBaseSum('hp')).toBe(15);
      expect(attributeSet.getCurrentValue('hp')).toBe(115);
    });

    it('should sum MulBase modifiers', () => {
      // +20% 和 +10% → +30% (乘数 = 1.3)
      attributeSet.addModifier(createMulBaseModifier('m1', 'hp', 0.2));
      attributeSet.addModifier(createMulBaseModifier('m2', 'hp', 0.1));

      expect(attributeSet.getMulBaseProduct('hp')).toBeCloseTo(1.3, 2);
      expect(attributeSet.getCurrentValue('hp')).toBeCloseTo(130, 2);
    });
  });

  describe('Modifier 管理', () => {
    it('should remove modifier by id', () => {
      const mod = createAddBaseModifier('toRemove', 'hp', 20);
      attributeSet.addModifier(mod);
      expect(attributeSet.getCurrentValue('hp')).toBe(120);

      attributeSet.removeModifier('toRemove');
      expect(attributeSet.getCurrentValue('hp')).toBe(100);
    });

    it('should remove modifiers by source', () => {
      attributeSet.addModifier(createAddBaseModifier('m1', 'hp', 10, 'buff1'));
      attributeSet.addModifier(createAddBaseModifier('m2', 'atk', 5, 'buff1'));
      attributeSet.addModifier(createAddBaseModifier('m3', 'hp', 20, 'buff2'));

      expect(attributeSet.getCurrentValue('hp')).toBe(130);

      attributeSet.removeModifiersBySource('buff1');
      expect(attributeSet.getCurrentValue('hp')).toBe(120);
      expect(attributeSet.getCurrentValue('atk')).toBe(50);
    });
  });

  describe('变化监听', () => {
    it('should notify on base value change', () => {
      const changes: { attr: string; oldVal: number; newVal: number }[] = [];

      attributeSet.addChangeListener((event) => {
        changes.push({
          attr: event.attributeName,
          oldVal: event.oldValue,
          newVal: event.newValue,
        });
      });

      attributeSet.setBase('hp', 120);

      expect(changes.length).toBe(1);
      expect(changes[0]).toEqual({ attr: 'hp', oldVal: 100, newVal: 120 });
    });
  });
});
