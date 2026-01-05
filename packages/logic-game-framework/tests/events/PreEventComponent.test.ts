/**
 * PreEventComponent 测试
 *
 * 测试 Pre 阶段事件处理组件的注册、触发、Intent 返回等功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PreEventComponent,
  Ability,
  AbilitySet,
  type AbilityConfig,
} from '../../src/core/abilities/index.js';
import {
  EventProcessor,
  passIntent,
  cancelIntent,
  modifyIntent,
  type GameEventBase,
} from '../../src/core/events/index.js';
import type { ActorRef } from '../../src/core/types/common.js';
import type { IAttributeModifierTarget } from '../../src/core/attributes/defineAttributes.js';
import { GameWorld } from '../../src/core/world/GameWorld.js';

// 测试用事件类型
interface PreDamageEvent extends GameEventBase {
  kind: 'pre_damage';
  sourceId: string;
  targetId: string;
  damage: number;
  damageType: string;
}

// Mock AttributeModifierTarget
const createMockModifierTarget = (): IAttributeModifierTarget => ({
  addModifier: () => 'mod-1',
  removeModifier: () => true,
  hasModifier: () => false,
  getModifierCount: () => 0,
});

describe('PreEventComponent', () => {
  let eventProcessor: EventProcessor;
  let owner: ActorRef;
  let modifierTarget: IAttributeModifierTarget;
  let abilitySet: AbilitySet;

  beforeEach(() => {
    // 初始化 GameWorld（EventProcessor 在其中创建）
    GameWorld.init({ eventProcessor: { maxDepth: 10, traceLevel: 2 } });
    eventProcessor = GameWorld.getInstance().eventProcessor;
    owner = { id: 'unit-1', displayName: 'Test Unit' };
    modifierTarget = createMockModifierTarget();
    abilitySet = new AbilitySet({
      owner,
      modifierTarget,
    });
  });

  afterEach(() => {
    GameWorld.destroy();
  });

  describe('Registration', () => {
    it('should register preHandler when ability is granted', () => {
      const config: AbilityConfig = {
        configId: 'buff_armor',
        displayName: '护甲',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              filter: (e, ctx) => e.targetId === ctx.owner.id,
              handler: (mutable, ctx) =>
                modifyIntent(ctx.ability.id, [
                  { field: 'damage', operation: 'multiply', value: 0.7 },
                ]),
            }),
        ],
      };

      const ability = new Ability(config, owner);
      abilitySet.grantAbility(ability);

      // 发送事件验证处理器已注册
      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = eventProcessor.processPreEvent(event, {});

      expect(mutable.cancelled).toBe(false);
      expect(mutable.getCurrentValue('damage')).toBe(70); // 100 * 0.7
    });

    it('should unregister preHandler when ability is revoked', () => {
      const config: AbilityConfig = {
        configId: 'buff_armor',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              handler: () =>
                modifyIntent('test', [
                  { field: 'damage', operation: 'multiply', value: 0.5 },
                ]),
            }),
        ],
      };

      const ability = new Ability(config, owner);
      abilitySet.grantAbility(ability);

      // 移除能力
      abilitySet.revokeAbility(ability.id);

      // 发送事件验证处理器已注销
      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = eventProcessor.processPreEvent(event, {});

      expect(mutable.getCurrentValue('damage')).toBe(100); // 未减伤
    });
  });

  describe('Intent Handling', () => {
    it('should cancel event when handler returns cancel intent', () => {
      const config: AbilityConfig = {
        configId: 'buff_immune',
        displayName: '免疫',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              filter: (e, ctx) => e.targetId === ctx.owner.id,
              handler: (mutable, ctx) => cancelIntent(ctx.ability.id, '免疫伤害'),
            }),
        ],
      };

      const ability = new Ability(config, owner);
      abilitySet.grantAbility(ability);

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = eventProcessor.processPreEvent(event, {});

      expect(mutable.cancelled).toBe(true);
      expect(mutable.cancelReason).toBe('免疫伤害');
    });

    it('should pass through when handler returns pass intent', () => {
      const config: AbilityConfig = {
        configId: 'buff_observer',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              handler: () => passIntent(),
            }),
        ],
      };

      const ability = new Ability(config, owner);
      abilitySet.grantAbility(ability);

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = eventProcessor.processPreEvent(event, {});

      expect(mutable.cancelled).toBe(false);
      expect(mutable.getCurrentValue('damage')).toBe(100);
    });
  });

  describe('Filter', () => {
    it('should only trigger for matching events', () => {
      const config: AbilityConfig = {
        configId: 'buff_armor',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              // 只对物理伤害生效
              filter: (e) => e.damageType === 'physical',
              handler: () =>
                modifyIntent('test', [
                  { field: 'damage', operation: 'multiply', value: 0.5 },
                ]),
            }),
        ],
      };

      const ability = new Ability(config, owner);
      abilitySet.grantAbility(ability);

      // 物理伤害 - 应该减伤
      const physicalEvent: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      const mutable1 = eventProcessor.processPreEvent(physicalEvent, {});
      expect(mutable1.getCurrentValue('damage')).toBe(50);

      // 魔法伤害 - 不应该减伤
      const magicEvent: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'magic',
      };

      const mutable2 = eventProcessor.processPreEvent(magicEvent, {});
      expect(mutable2.getCurrentValue('damage')).toBe(100);
    });
  });

  describe('Multiple Components', () => {
    it('should process multiple PreEventComponents from different abilities', () => {
      // 护甲 Buff: 减伤 30%
      const armorConfig: AbilityConfig = {
        configId: 'buff_armor',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              name: '护甲',
              handler: () =>
                modifyIntent('armor', [
                  { field: 'damage', operation: 'multiply', value: 0.7 },
                ]),
            }),
        ],
      };

      // 护盾 Buff: 固定减伤 10
      const shieldConfig: AbilityConfig = {
        configId: 'buff_shield',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              name: '护盾',
              handler: () =>
                modifyIntent('shield', [
                  { field: 'damage', operation: 'add', value: -10 },
                ]),
            }),
        ],
      };

      abilitySet.grantAbility(new Ability(armorConfig, owner));
      abilitySet.grantAbility(new Ability(shieldConfig, owner));

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = eventProcessor.processPreEvent(event, {});

      // 计算：100 + (-10) = 90, 90 * 0.7 = 63
      expect(mutable.getCurrentValue('damage')).toBeCloseTo(63);
    });
  });

  describe('Context Access', () => {
    it('should have access to owner and ability info in handler', () => {
      let capturedOwnerId: string | undefined;
      let capturedAbilityConfigId: string | undefined;

      const config: AbilityConfig = {
        configId: 'buff_test',
        displayName: 'Test Buff',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              handler: (mutable, ctx) => {
                capturedOwnerId = ctx.owner.id;
                capturedAbilityConfigId = ctx.ability.configId;
                return passIntent();
              },
            }),
        ],
      };

      const ability = new Ability(config, owner);
      abilitySet.grantAbility(ability);

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      eventProcessor.processPreEvent(event, {});

      expect(capturedOwnerId).toBe('unit-1');
      expect(capturedAbilityConfigId).toBe('buff_test');
    });
  });

  describe('Error Handling', () => {
    it('should record error in trace when handler throws', () => {
      const config: AbilityConfig = {
        configId: 'buff_error',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              name: 'ErrorHandler',
              handler: () => {
                throw new Error('Test error message');
              },
            }),
        ],
      };

      const ability = new Ability(config, owner);
      abilitySet.grantAbility(ability);

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      // 应该不抛异常，返回 pass
      const mutable = eventProcessor.processPreEvent(event, {});
      expect(mutable.cancelled).toBe(false);
      expect(mutable.getCurrentValue('damage')).toBe(100);

      // 检查 trace 中有错误记录
      const traces = eventProcessor.getTraces();
      const lastTrace = traces[traces.length - 1];
      expect(lastTrace.intents.length).toBeGreaterThan(0);
      const errorIntent = lastTrace.intents.find((i) => i.error);
      expect(errorIntent).toBeDefined();
      expect(errorIntent?.error?.message).toBe('Test error message');
    });
  });

  describe('Computation Steps Tracking', () => {
    it('should track computation steps with source info', () => {
      // 护甲 Buff: 减伤 30%
      const armorConfig: AbilityConfig = {
        configId: 'buff_armor',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              name: '护甲',
              handler: () =>
                modifyIntent('armor', [
                  { field: 'damage', operation: 'multiply', value: 0.7 },
                ]),
            }),
        ],
      };

      // 护盾 Buff: 固定减伤 10
      const shieldConfig: AbilityConfig = {
        configId: 'buff_shield',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              name: '护盾',
              handler: () =>
                modifyIntent('shield', [
                  { field: 'damage', operation: 'add', value: -10 },
                ]),
            }),
        ],
      };

      abilitySet.grantAbility(new Ability(armorConfig, owner));
      abilitySet.grantAbility(new Ability(shieldConfig, owner));

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = eventProcessor.processPreEvent(event, {});

      // 获取计算步骤
      const impl = mutable as import('../../src/core/events/MutableEvent.js').MutableEventImpl<PreDamageEvent>;
      const steps = impl.getFieldComputationSteps('damage');

      expect(steps).not.toBeNull();
      expect(steps?.originalValue).toBe(100);
      expect(steps?.finalValue).toBeCloseTo(63);
      expect(steps?.steps.length).toBe(2);

      // 验证每个步骤都有来源信息
      for (const step of steps?.steps ?? []) {
        expect(step.sourceId).toBeDefined();
        expect(step.sourceName).toBeDefined();
      }
    });

    it('should format computation log for debugging', () => {
      const config: AbilityConfig = {
        configId: 'buff_test',
        components: [
          () =>
            new PreEventComponent<PreDamageEvent>({
              eventKind: 'pre_damage',
              name: 'TestBuff',
              handler: () =>
                modifyIntent('test', [
                  { field: 'damage', operation: 'add', value: -20 },
                  { field: 'damage', operation: 'multiply', value: 0.5 },
                ]),
            }),
        ],
      };

      abilitySet.grantAbility(new Ability(config, owner));

      const event: PreDamageEvent = {
        kind: 'pre_damage',
        logicTime: 1000,
        sourceId: 'enemy-1',
        targetId: 'unit-1',
        damage: 100,
        damageType: 'physical',
      };

      const mutable = eventProcessor.processPreEvent(event, {});
      const impl = mutable as import('../../src/core/events/MutableEvent.js').MutableEventImpl<PreDamageEvent>;
      const log = impl.formatComputationLog('damage');

      expect(log).toContain('damage: 100 → 40');
      expect(log).toContain('-20');
      expect(log).toContain('×0.5');
    });
  });
});
