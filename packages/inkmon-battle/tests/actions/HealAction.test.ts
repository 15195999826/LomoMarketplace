/**
 * HealAction 测试
 *
 * 测试 InkMon 治疗 Action 的各项功能：
 * - 固定值治疗
 * - 百分比治疗
 * - 自我治疗
 * - 治疗多目标
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  HealAction,
  createHealAction,
  createPercentHealAction,
} from '../../src/actions/HealAction.js';
import { createInkMonActor } from '../../src/actors/InkMonActor.js';
import {
  createFireInkMon,
  createWaterInkMon,
  setupTestEnvironment,
  cleanupTestEnvironment,
  createSimpleBattleContext,
} from '../helpers/mocks.js';

describe('HealAction', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('固定值治疗', () => {
    it('应该产生治疗事件', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'A');
      const { ctx } = createSimpleBattleContext(healer, target);

      const action = createHealAction({
        healAmount: 50,
        targetSelector: () => [target.toRef()],
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events![0].kind).toBe('heal');
    });

    it('治疗量至少为 1', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'A');
      const { ctx } = createSimpleBattleContext(healer, target);

      const action = createHealAction({
        healAmount: 0, // 0 治疗量
        targetSelector: () => [target.toRef()],
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const healEvent = result.events![0] as { healAmount?: number };
      expect(healEvent.healAmount).toBeGreaterThanOrEqual(1);
    });

    it('应该记录正确的治疗量', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'A');
      const { ctx } = createSimpleBattleContext(healer, target);

      const action = createHealAction({
        healAmount: 75,
        targetSelector: () => [target.toRef()],
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const healEvent = result.events![0] as { healAmount?: number };
      expect(healEvent.healAmount).toBe(75);
    });
  });

  describe('百分比治疗', () => {
    it('应该根据最大 HP 计算治疗量', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'A');
      const { ctx } = createSimpleBattleContext(healer, target);

      // 50% 最大 HP 治疗
      const action = createPercentHealAction(0.5, () => [target.toRef()]);

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const healEvent = result.events![0] as { healAmount?: number };
      // 治疗量应为目标最大 HP 的 50%
      expect(healEvent.healAmount).toBe(Math.floor(target.maxHp * 0.5));
    });

    it('10% 治疗应该正确计算', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'A');
      const { ctx } = createSimpleBattleContext(healer, target);

      const action = createPercentHealAction(0.1, () => [target.toRef()]);

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const healEvent = result.events![0] as { healAmount?: number };
      expect(healEvent.healAmount).toBe(Math.floor(target.maxHp * 0.1));
    });
  });

  describe('混合治疗（固定值 + 百分比）', () => {
    it('应该将固定值和百分比治疗相加', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'A');
      const { ctx } = createSimpleBattleContext(healer, target);

      const action = createHealAction({
        healAmount: 20, // 固定 20
        healPercent: 0.1, // 加 10% 最大 HP
        targetSelector: () => [target.toRef()],
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const healEvent = result.events![0] as { healAmount?: number };
      const expectedHeal = 20 + Math.floor(target.maxHp * 0.1);
      expect(healEvent.healAmount).toBe(expectedHeal);
    });
  });

  describe('自我治疗', () => {
    it('应该能治疗自己', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const dummy = createInkMonActor(createWaterInkMon(), 'B'); // 需要一个目标来创建上下文
      const { ctx } = createSimpleBattleContext(healer, dummy);

      const action = createHealAction({
        healAmount: 50,
        targetSelector: () => [healer.toRef()], // 治疗自己
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      const healEvent = result.events![0] as { targetActorId?: string };
      expect(healEvent.targetActorId).toBe(healer.id);
    });
  });

  describe('多目标治疗', () => {
    it('应该能治疗多个目标', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const target1 = createInkMonActor(createWaterInkMon(), 'A');
      const target2 = createInkMonActor(createFireInkMon(), 'A');

      const { ctx, state } = createSimpleBattleContext(healer, target1);
      state.addActor(target2);

      const action = createHealAction({
        healAmount: 30,
        targetSelector: () => [target1.toRef(), target2.toRef()],
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(2);

      // 两个事件都应该是治疗事件
      expect(result.events![0].kind).toBe('heal');
      expect(result.events![1].kind).toBe('heal');
    });

    it('全队治疗应该治疗所有队友', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const ally1 = createInkMonActor(createWaterInkMon(), 'A');
      const ally2 = createInkMonActor(createFireInkMon(), 'A');
      const enemy = createInkMonActor(createWaterInkMon(), 'B');

      const { ctx, state } = createSimpleBattleContext(healer, ally1);
      state.addActor(ally2);
      state.addActor(enemy);

      // 治疗所有 A 队成员
      const action = createHealAction({
        healAmount: 25,
        targetSelector: () =>
          state
            .getAllActors()
            .filter((a) => a.team === 'A')
            .map((a) => a.toRef()),
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(3); // healer, ally1, ally2
    });
  });

  describe('治疗事件属性', () => {
    it('应该包含来源和目标信息', () => {
      const healer = createInkMonActor(createFireInkMon(), 'A');
      const target = createInkMonActor(createWaterInkMon(), 'A');
      const { ctx } = createSimpleBattleContext(healer, target);

      const action = createHealAction({
        healAmount: 50,
        targetSelector: () => [target.toRef()],
      });

      const result = action.execute(ctx);

      expect(result.success).toBe(true);
      const healEvent = result.events![0] as {
        sourceActorId?: string;
        targetActorId?: string;
      };
      expect(healEvent.sourceActorId).toBe(healer.id);
      expect(healEvent.targetActorId).toBe(target.id);
    });
  });
});
