/**
 * DamageAction 测试
 *
 * 测试 InkMon 伤害 Action 的各项功能：
 * - 基础伤害计算
 * - 类型相克倍率
 * - STAB 加成
 * - 免疫处理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DamageAction,
  createDamageAction,
} from '../../src/actions/DamageAction.js';
import { createInkMonActor } from '../../src/actors/InkMonActor.js';
import {
  createFireInkMon,
  createWaterInkMon,
  createGrassFlyingInkMon,
  createGroundInkMon,
  createSteelInkMon,
  setupTestEnvironment,
  cleanupTestEnvironment,
  createSimpleBattleContext,
} from '../helpers/mocks.js';

describe('DamageAction', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('基础伤害', () => {
    it('应该造成基础伤害', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createFireInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 50,
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false, // 禁用类型相克
        useSTAB: false, // 禁用 STAB
        useCritical: false, // 禁用暴击
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events![0].kind).toBe('damage');
    });

    it('伤害至少为 1', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 1, // 很小的基础伤害
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: true, // 火攻水 0.5x
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      // 1 * 0.5 = 0.5, 向下取整为 0, 但最少为 1
      const damageEvent = result.events![0] as { damage?: number };
      expect(damageEvent.damage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('类型相克', () => {
    it('火攻草应该有 2x 伤害 (super effective)', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createGrassFlyingInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: true,
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as {
        damage?: number;
        effectiveness?: string;
      };
      // 火克草 2x (不考虑火对飞中性，因为火不克飞)
      expect(damageEvent.effectiveness).toBe('super_effective');
    });

    it('火攻水应该有 0.5x 伤害 (not very effective)', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: true,
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { effectiveness?: string };
      expect(damageEvent.effectiveness).toBe('not_very_effective');
    });

    it('电攻地应该免疫 (0 伤害)', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createGroundInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'electric', // 电系攻击
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: true,
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as {
        damage?: number;
        effectiveness?: string;
      };
      expect(damageEvent.damage).toBe(0);
      expect(damageEvent.effectiveness).toBe('immune');
    });

    it('毒攻钢应该免疫', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createSteelInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'poison', // 毒系攻击
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: true,
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { effectiveness?: string };
      expect(damageEvent.effectiveness).toBe('immune');
    });

    it('禁用类型相克时应该是 neutral', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createGrassFlyingInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false, // 禁用
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { effectiveness?: string };
      expect(damageEvent.effectiveness).toBe('neutral');
    });
  });

  describe('STAB 加成', () => {
    it('使用本系属性攻击应该有 STAB (1.5x)', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A'); // 火系
      const target = createInkMonActor(createGrassFlyingInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'fire', // 火系技能
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false, // 禁用类型相克以便单独测试 STAB
        useSTAB: true,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { isSTAB?: boolean };
      expect(damageEvent.isSTAB).toBe(true);
    });

    it('使用非本系属性攻击应该没有 STAB', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A'); // 火系
      const target = createInkMonActor(createWaterInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'water', // 水系技能（非本系）
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false,
        useSTAB: true,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { isSTAB?: boolean };
      expect(damageEvent.isSTAB).toBe(false);
    });

    it('禁用 STAB 时应该没有 STAB 加成', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false,
        useSTAB: false, // 禁用
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { isSTAB?: boolean };
      expect(damageEvent.isSTAB).toBe(false);
    });
  });

  describe('暴击系统', () => {
    it('启用暴击时有概率暴击', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      // Mock Math.random 返回 0 (小于默认暴击率 0.0625)
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false,
        useSTAB: false,
        useCritical: true,
        critRate: 0.5, // 50% 暴击率便于测试
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { isCritical?: boolean };
      expect(damageEvent.isCritical).toBe(true);

      vi.restoreAllMocks();
    });

    it('禁用暴击时不会暴击', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      // 即使 random 返回 0，禁用暴击也不会暴击
      vi.spyOn(Math, 'random').mockReturnValue(0);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false,
        useSTAB: false,
        useCritical: false, // 禁用
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { isCritical?: boolean };
      expect(damageEvent.isCritical).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe('多目标', () => {
    it('应该对多个目标都造成伤害', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target1 = createInkMonActor(createWaterInkMon(), 'B');
      const target2 = createInkMonActor(createGrassFlyingInkMon(), 'B');

      const { ctx, state } = createSimpleBattleContext(attacker, target1);
      state.addActor(target2);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        targetSelector: () => [target1.toRef(), target2.toRef()],
        useTypeEffectiveness: true,
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(2);
    });
  });

  describe('伤害类型', () => {
    it('默认伤害类型应为 physical', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false,
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { damageCategory?: string };
      expect(damageEvent.damageCategory).toBe('physical');
    });

    it('可以指定伤害类型为 special', () => {
      const attacker = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'B');
      const { ctx } = createSimpleBattleContext(attacker, target);

      const action = createDamageAction({
        damage: 100,
        element: 'fire',
        damageCategory: 'special',
        targetSelector: () => [target.toRef()],
        useTypeEffectiveness: false,
        useSTAB: false,
        useCritical: false,
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const damageEvent = result.events![0] as { damageCategory?: string };
      expect(damageEvent.damageCategory).toBe('special');
    });
  });
});
