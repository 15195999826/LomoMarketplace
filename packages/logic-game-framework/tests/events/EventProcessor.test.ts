/**
 * EventProcessor 测试
 *
 * 测试 Pre/Post 双阶段事件处理系统
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EventProcessor,
  createEventProcessor,
  createMutableEvent,
  passIntent,
  cancelIntent,
  modifyIntent,
  type PreHandlerRegistration,
  type GameEventBase,
  type MutableEvent,
  type PreEventHandlerContext,
} from '../../src/core/events/index.js';

// 测试用事件类型
interface PreDamageEvent extends GameEventBase {
  kind: 'pre_damage';
  sourceId: string;
  targetId: string;
  damage: number;
  damageType: string;
}

describe('MutableEvent', () => {
  it('should create mutable event from original', () => {
    const original: PreDamageEvent = {
      kind: 'pre_damage',
      
      sourceId: 'attacker',
      targetId: 'defender',
      damage: 100,
      damageType: 'physical',
    };

    const mutable = createMutableEvent(original, 'pre');

    expect(mutable.original).toBe(original);
    expect(mutable.phase).toBe('pre');
    expect(mutable.cancelled).toBe(false);
    expect(mutable.modifications).toHaveLength(0);
  });

  it('should get original value when no modifications', () => {
    const original: PreDamageEvent = {
      kind: 'pre_damage',
      
      sourceId: 'attacker',
      targetId: 'defender',
      damage: 100,
      damageType: 'physical',
    };

    const mutable = createMutableEvent(original, 'pre');

    expect(mutable.getCurrentValue('damage')).toBe(100);
    expect(mutable.getCurrentValue('damageType')).toBe('physical');
  });

  it('should apply add modification', () => {
    const original: PreDamageEvent = {
      kind: 'pre_damage',
      
      sourceId: 'attacker',
      targetId: 'defender',
      damage: 100,
      damageType: 'physical',
    };

    const mutable = createMutableEvent(original, 'pre');
    mutable.addModification({ field: 'damage', operation: 'add', value: -20 });

    expect(mutable.getCurrentValue('damage')).toBe(80);
  });

  it('should apply multiply modification', () => {
    const original: PreDamageEvent = {
      kind: 'pre_damage',
      
      sourceId: 'attacker',
      targetId: 'defender',
      damage: 100,
      damageType: 'physical',
    };

    const mutable = createMutableEvent(original, 'pre');
    mutable.addModification({ field: 'damage', operation: 'multiply', value: 0.7 });

    expect(mutable.getCurrentValue('damage')).toBe(70);
  });

  it('should apply set modification', () => {
    const original: PreDamageEvent = {
      kind: 'pre_damage',
      
      sourceId: 'attacker',
      targetId: 'defender',
      damage: 100,
      damageType: 'physical',
    };

    const mutable = createMutableEvent(original, 'pre');
    mutable.addModification({ field: 'damage', operation: 'set', value: 50 });

    expect(mutable.getCurrentValue('damage')).toBe(50);
  });

  it('should apply modifications in correct order: set -> add -> multiply', () => {
    const original: PreDamageEvent = {
      kind: 'pre_damage',
      
      sourceId: 'attacker',
      targetId: 'defender',
      damage: 100,
      damageType: 'physical',
    };

    const mutable = createMutableEvent(original, 'pre');

    // 添加顺序不影响计算顺序
    mutable.addModification({ field: 'damage', operation: 'multiply', value: 0.5 }); // 最后应用
    mutable.addModification({ field: 'damage', operation: 'add', value: 20 }); // 第二应用
    mutable.addModification({ field: 'damage', operation: 'set', value: 80 }); // 第一应用

    // 计算：80 (set) + 20 (add) = 100, 100 * 0.5 (multiply) = 50
    expect(mutable.getCurrentValue('damage')).toBe(50);
  });

  it('should generate final event with modifications', () => {
    const original: PreDamageEvent = {
      kind: 'pre_damage',
      
      sourceId: 'attacker',
      targetId: 'defender',
      damage: 100,
      damageType: 'physical',
    };

    const mutable = createMutableEvent(original, 'pre');
    mutable.addModification({ field: 'damage', operation: 'multiply', value: 0.7 });

    const final = mutable.toFinalEvent();

    expect(final.damage).toBe(70);
    expect(final.damageType).toBe('physical'); // 未修改的字段保持原值
    expect(final.sourceId).toBe('attacker');
  });
});

describe('EventProcessor', () => {
  let processor: EventProcessor;

  beforeEach(() => {
    processor = createEventProcessor({ maxDepth: 10, traceLevel: 2 });
  });

  describe('Pre Event Processing', () => {
    it('should process pre event without handlers', () => {
      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = processor.processPreEvent(event, {});

      expect(mutable.cancelled).toBe(false);
      expect(mutable.getCurrentValue('damage')).toBe(100);
    });

    it('should apply modifications from handler', () => {
      // 注册减伤处理器
      const registration: PreHandlerRegistration = {
        id: 'armor_buff',
        name: '护甲减伤',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_armor',
        configId: 'buff_armor',
        filter: (event) => (event as PreDamageEvent).targetId === 'defender',
        handler: (event, ctx) =>
          modifyIntent(ctx.abilityId, [{ field: 'damage', operation: 'multiply', value: 0.7 }]),
      };

      processor.registerPreHandler(registration);

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = processor.processPreEvent(event, {});

      expect(mutable.cancelled).toBe(false);
      expect(mutable.getCurrentValue('damage')).toBe(70);
    });

    it('should cancel event when handler returns cancel intent', () => {
      // 注册免疫处理器
      const registration: PreHandlerRegistration = {
        id: 'immune_buff',
        name: '免疫伤害',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_immune',
        configId: 'buff_immune',
        filter: (event) => (event as PreDamageEvent).targetId === 'defender',
        handler: (event, ctx) => cancelIntent(ctx.abilityId, '免疫伤害'),
      };

      processor.registerPreHandler(registration);

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = processor.processPreEvent(event, {});

      expect(mutable.cancelled).toBe(true);
      expect(mutable.cancelReason).toBe('免疫伤害');
      expect(mutable.cancelledBy).toBe('ability_immune');
    });

    it('should process multiple handlers in order', () => {
      // 处理器 1：减伤 30%
      processor.registerPreHandler({
        id: 'armor_buff',
        name: '护甲',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_armor',
        configId: 'buff_armor',
        handler: () => modifyIntent('ability_armor', [{ field: 'damage', operation: 'multiply', value: 0.7 }]),
      });

      // 处理器 2：固定减伤 10
      processor.registerPreHandler({
        id: 'shield_buff',
        name: '护盾',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_shield',
        configId: 'buff_shield',
        handler: () => modifyIntent('ability_shield', [{ field: 'damage', operation: 'add', value: -10 }]),
      });

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = processor.processPreEvent(event, {});

      // 计算：100 + (-10) = 90, 90 * 0.7 = 63
      expect(mutable.getCurrentValue('damage')).toBeCloseTo(63);
    });

    it('should skip handlers that do not match filter', () => {
      processor.registerPreHandler({
        id: 'armor_buff',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_armor',
        configId: 'buff_armor',
        // 只对物理伤害生效
        filter: (event) => (event as PreDamageEvent).damageType === 'physical',
        handler: () => modifyIntent('ability_armor', [{ field: 'damage', operation: 'multiply', value: 0.5 }]),
      });

      // 魔法伤害不触发减伤
      const magicEvent: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'magic',
      };

      const mutable = processor.processPreEvent(magicEvent, {});

      expect(mutable.getCurrentValue('damage')).toBe(100); // 未减伤
    });

    it('should stop processing after cancel', () => {
      let secondHandlerCalled = false;

      // 处理器 1：取消
      processor.registerPreHandler({
        id: 'immune_buff',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_immune',
        configId: 'buff_immune',
        handler: () => cancelIntent('ability_immune', '免疫'),
      });

      // 处理器 2：不应该被调用
      processor.registerPreHandler({
        id: 'armor_buff',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_armor',
        configId: 'buff_armor',
        handler: () => {
          secondHandlerCalled = true;
          return passIntent();
        },
      });

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      processor.processPreEvent(event, {});

      expect(secondHandlerCalled).toBe(false);
    });
  });

  describe('Handler Registration', () => {
    it('should unregister handler', () => {
      const unregister = processor.registerPreHandler({
        id: 'armor_buff',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_armor',
        configId: 'buff_armor',
        handler: () => modifyIntent('ability_armor', [{ field: 'damage', operation: 'multiply', value: 0.5 }]),
      });

      // 注销处理器
      unregister();

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = processor.processPreEvent(event, {});

      expect(mutable.getCurrentValue('damage')).toBe(100); // 未减伤
    });

    it('should remove handlers by ability id', () => {
      processor.registerPreHandler({
        id: 'armor_buff_1',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_armor',
        configId: 'buff_armor',
        handler: () => modifyIntent('ability_armor', [{ field: 'damage', operation: 'multiply', value: 0.5 }]),
      });

      processor.registerPreHandler({
        id: 'shield_buff',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_shield',
        configId: 'buff_shield',
        handler: () => modifyIntent('ability_shield', [{ field: 'damage', operation: 'add', value: -10 }]),
      });

      // 移除 ability_armor 的所有处理器
      processor.removeHandlersByAbilityId('ability_armor');

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = processor.processPreEvent(event, {});

      // 只有 shield 生效：100 - 10 = 90
      expect(mutable.getCurrentValue('damage')).toBe(90);
    });
  });

  describe('Tracing', () => {
    it('should record traces when enabled', () => {
      processor.registerPreHandler({
        id: 'armor_buff',
        name: '护甲',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_armor',
        configId: 'buff_armor',
        handler: () => modifyIntent('ability_armor', [{ field: 'damage', operation: 'multiply', value: 0.7 }]),
      });

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      processor.processPreEvent(event, {});

      const traces = processor.getTraces();
      expect(traces).toHaveLength(1);

      const trace = traces[0];
      expect(trace.eventKind).toBe('pre_damage');
      expect(trace.phase).toBe('pre');
      expect(trace.cancelled).toBe(false);
      expect(trace.intents).toHaveLength(1);
    });

    it('should export trace log', () => {
      processor.registerPreHandler({
        id: 'armor_buff',
        name: '护甲',
        eventKind: 'pre_damage',
        ownerId: 'defender',
        abilityId: 'ability_armor',
        configId: 'buff_armor',
        handler: () => modifyIntent('ability_armor', [{ field: 'damage', operation: 'multiply', value: 0.7 }]),
      });

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      processor.processPreEvent(event, {});

      const log = processor.exportTraceLog();
      expect(log).toContain('pre_damage');
      expect(log).toContain('护甲');
      expect(log).toContain('modify');
    });

    it('should clear traces', () => {
      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      processor.processPreEvent(event, {});

      expect(processor.getTraces()).toHaveLength(1);

      processor.clearTraces();

      expect(processor.getTraces()).toHaveLength(0);
    });
  });

  describe('Depth Limiting', () => {
    it('should limit recursion depth', () => {
      const shallowProcessor = createEventProcessor({ maxDepth: 2, traceLevel: 0 });

      let depth = 0;
      const maxObservedDepth = { value: 0 };

      // 注册一个会递归调用的处理器
      shallowProcessor.registerPreHandler({
        id: 'recursive',
        eventKind: 'pre_damage',
        ownerId: 'test',
        abilityId: 'test',
        configId: 'test',
        handler: (event, ctx) => {
          depth++;
          maxObservedDepth.value = Math.max(maxObservedDepth.value, shallowProcessor.getCurrentDepth());

          // 尝试递归处理（会被深度限制阻止）
          if (depth < 10) {
            shallowProcessor.processPreEvent(event.original, ctx.gameplayState);
          }

          return passIntent();
        },
      });

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        
        sourceId: 'attacker',
        targetId: 'defender',
        damage: 100,
        damageType: 'physical',
      };

      shallowProcessor.processPreEvent(event, {});

      // 深度应该被限制在 maxDepth
      expect(maxObservedDepth.value).toBeLessThanOrEqual(2);
    });
  });
});
