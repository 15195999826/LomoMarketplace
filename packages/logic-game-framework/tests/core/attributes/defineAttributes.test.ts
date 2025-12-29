import { describe, it, expect } from 'vitest';
import {
  defineAttributes,
  restoreAttributes,
  createAddBaseModifier,
  createMulBaseModifier,
  createAddFinalModifier,
  createMulFinalModifier,
} from '../../../src/core/attributes/index.js';

describe('defineAttributes', () => {
  describe('基础功能', () => {
    it('应该能定义属性并直接访问 currentValue', () => {
      const attrs = defineAttributes({
        maxHp: { baseValue: 100 },
        attack: { baseValue: 50 },
        defense: { baseValue: 30 },
      });

      expect(attrs.maxHp).toBe(100);
      expect(attrs.attack).toBe(50);
      expect(attrs.defense).toBe(30);
    });

    it('应该能通过 $ 前缀访问 breakdown', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 50 },
      });

      const breakdown = attrs.$attack;
      expect(breakdown.base).toBe(50);
      expect(breakdown.currentValue).toBe(50);
      expect(breakdown.bodyValue).toBe(50);
      expect(breakdown.addBaseSum).toBe(0);
      expect(breakdown.mulBaseProduct).toBe(1);
    });

    it('应该能通过 xxxAttribute 后缀获取属性名引用', () => {
      const attrs = defineAttributes({
        maxHp: { baseValue: 100 },
        attack: { baseValue: 50 },
        defense: { baseValue: 30 },
      });

      // 返回属性名字符串
      expect(attrs.maxHpAttribute).toBe('maxHp');
      expect(attrs.attackAttribute).toBe('attack');
      expect(attrs.defenseAttribute).toBe('defense');

      // 可用于 StatModifierConfig 的 attributeName
      const config = {
        attributeName: attrs.attackAttribute,
        modifierType: 'AddBase' as const,
        value: 20,
      };
      expect(config.attributeName).toBe('attack');
    });

    it('应该能使用 getBase 和 setBase', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 50 },
      });

      expect(attrs.getBase('attack')).toBe(50);

      attrs.setBase('attack', 80);
      expect(attrs.attack).toBe(80);
      expect(attrs.getBase('attack')).toBe(80);
    });

    it('应该能使用 modifyBase', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 50 },
      });

      attrs.modifyBase('attack', 10);
      expect(attrs.attack).toBe(60);

      attrs.modifyBase('attack', -20);
      expect(attrs.attack).toBe(40);
    });
  });

  describe('Modifier 功能（通过内部接口）', () => {
    it('应该能通过 _modifierTarget 添加和移除 Modifier', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      // 通过内部接口添加 AddBase modifier
      attrs._modifierTarget.addModifier(createAddBaseModifier('buff-1', 'attack', 20));
      expect(attrs.attack).toBe(120);
      expect(attrs.$attack.addBaseSum).toBe(20);

      // 移除 modifier
      attrs._modifierTarget.removeModifier('buff-1');
      expect(attrs.attack).toBe(100);
    });

    it('应该正确计算四层公式', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      const target = attrs._modifierTarget;

      // (Base + AddBase) × MulBase + AddFinal) × MulFinal
      // (100 + 20) × 1.5 + 50) × 0.8 = (120 × 1.5 + 50) × 0.8 = (180 + 50) × 0.8 = 184
      target.addModifier(createAddBaseModifier('add-base', 'attack', 20));
      target.addModifier(createMulBaseModifier('mul-base', 'attack', 0.5)); // +50%
      target.addModifier(createAddFinalModifier('add-final', 'attack', 50));
      target.addModifier(createMulFinalModifier('mul-final', 'attack', -0.2)); // -20%

      expect(attrs.attack).toBe(184);
      expect(attrs.$attack.bodyValue).toBe(180); // (100 + 20) × 1.5
    });

    it('应该能按来源移除 Modifier', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      const target = attrs._modifierTarget;

      target.addModifier({ ...createAddBaseModifier('buff-1', 'attack', 10), source: 'skill' });
      target.addModifier({ ...createAddBaseModifier('buff-2', 'attack', 20), source: 'skill' });
      target.addModifier({ ...createAddBaseModifier('buff-3', 'attack', 30), source: 'item' });

      expect(attrs.attack).toBe(160); // 100 + 10 + 20 + 30

      const removed = target.removeModifiersBySource('skill');
      expect(removed).toBe(2);
      expect(attrs.attack).toBe(130); // 100 + 30
    });

    it('应该能获取属性的所有 Modifier', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      const target = attrs._modifierTarget;

      target.addModifier(createAddBaseModifier('buff-1', 'attack', 10));
      target.addModifier(createAddBaseModifier('buff-2', 'attack', 20));

      const mods = target.getModifiers('attack');
      expect(mods).toHaveLength(2);
      expect(mods[0].id).toBe('buff-1');
      expect(mods[1].id).toBe('buff-2');
    });
  });

  describe('外部无法直接调用 Modifier 方法', () => {
    it('addModifier 不应该在类型上存在', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      // 运行时验证：直接访问返回 undefined
      expect((attrs as any).addModifier).toBeUndefined();
      expect((attrs as any).removeModifier).toBeUndefined();
      expect((attrs as any).removeModifiersBySource).toBeUndefined();
    });

    it('_modifierTarget 应该可用', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      expect(attrs._modifierTarget).toBeDefined();
      expect(typeof attrs._modifierTarget.addModifier).toBe('function');
    });
  });

  describe('约束功能', () => {
    it('应该遵守 minValue 约束', () => {
      const attrs = defineAttributes({
        hp: { baseValue: 100, minValue: 0 },
      });

      attrs.setBase('hp', -50);
      expect(attrs.hp).toBe(0);
    });

    it('应该遵守 maxValue 约束', () => {
      const attrs = defineAttributes({
        hp: { baseValue: 100, maxValue: 100 },
      });

      attrs.setBase('hp', 150);
      expect(attrs.hp).toBe(100);
    });
  });

  describe('监听器功能', () => {
    it('应该能监听属性变化', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      const changes: { old: number; new: number }[] = [];
      attrs.addChangeListener((event) => {
        changes.push({ old: event.oldValue, new: event.newValue });
      });

      attrs.setBase('attack', 120);
      attrs._modifierTarget.addModifier(createAddBaseModifier('buff', 'attack', 30));

      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({ old: 100, new: 120 });
      expect(changes[1]).toEqual({ old: 120, new: 150 });
    });
  });

  describe('序列化功能', () => {
    it('应该能序列化和反序列化', () => {
      const attrs = defineAttributes({
        maxHp: { baseValue: 100 },
        attack: { baseValue: 50 },
      });

      attrs._modifierTarget.addModifier(createAddBaseModifier('buff', 'attack', 20));

      // 序列化
      const data = attrs.serialize();

      // 反序列化
      const restored = restoreAttributes<typeof attrs>(data);

      expect(restored.maxHp).toBe(100);
      expect(restored.attack).toBe(70); // 50 + 20
    });

    it('restoreAttributes 也应该支持 xxxAttribute', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 50 },
        defense: { baseValue: 30 },
      });

      const data = attrs.serialize();
      const restored = restoreAttributes<typeof attrs>(data);

      // 验证 xxxAttribute 也能正常工作
      expect(restored.attackAttribute).toBe('attack');
      expect(restored.defenseAttribute).toBe('defense');
    });
  });

  describe('边界情况', () => {
    it('禁止直接赋值属性', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      expect(() => {
        (attrs as any).attack = 200;
      }).toThrow('Cannot directly set attribute');
    });

    it('应该能通过 _raw 访问底层 AttributeSet', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      expect(attrs._raw).toBeDefined();
      expect(attrs._raw.getCurrentValue('attack')).toBe(100);
    });

    it('hasAttribute 应该正常工作', () => {
      const attrs = defineAttributes({
        attack: { baseValue: 100 },
      });

      expect(attrs.hasAttribute('attack')).toBe(true);
      expect(attrs.hasAttribute('defense')).toBe(false);
    });
  });
});
