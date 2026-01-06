/**
 * ActivateInstanceComponent 单元测试
 *
 * 测试内容：
 * - 构造函数
 * - onEvent 事件匹配
 * - triggerMode - any/all 模式
 * - filter - 自定义过滤器
 * - activateExecution - 创建执行实例
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ActivateInstanceComponent,
  createEventTrigger,
  type ActivateInstanceComponentConfig,
} from '../../../src/core/abilities/ActivateInstanceComponent.js';
import type {
  IAbilityForComponent,
  IAbilityExecutionInstance,
  ActivateExecutionConfig,
  ComponentLifecycleContext,
} from '../../../src/core/abilities/AbilityComponent.js';
import type { GameEventBase } from '../../../src/core/events/GameEvent.js';
import type { IAction } from '../../../src/core/actions/Action.js';

// ========== Mock 类型定义 ==========

/** 测试用事件类型 */
interface InputActionEvent extends GameEventBase {
  kind: 'inputAction';
  actionId: string;
}

interface DamageEvent extends GameEventBase {
  kind: 'damage';
  damage: number;
}

/** 创建 Mock Action */
function createMockAction(type: string): IAction {
  return {
    type,
    execute: vi.fn(() => ({ events: [] })),
  };
}

/** 创建 Mock Ability */
function createMockAbility(): IAbilityForComponent & {
  activatedConfigs: ActivateExecutionConfig[];
} {
  const activatedConfigs: ActivateExecutionConfig[] = [];
  let instanceCounter = 0;

  return {
    id: 'ability_test',
    configId: 'test_config',
    activatedConfigs,
    expire: vi.fn(),
    activateNewExecutionInstance(config: ActivateExecutionConfig): IAbilityExecutionInstance {
      activatedConfigs.push(config);
      instanceCounter++;
      return {
        id: `exec_${instanceCounter}`,
        timelineId: config.timelineId,
        elapsed: 0,
        state: 'executing',
        isExecuting: true,
        cancel: vi.fn(),
      };
    },
    getExecutingInstances: () => [],
  };
}

/** 创建 Mock ComponentLifecycleContext */
function createMockContext(ability: IAbilityForComponent): ComponentLifecycleContext {
  return {
    owner: { id: 'owner_1' },
    attributes: {
      addModifier: vi.fn(),
      removeModifier: vi.fn(),
      removeModifiersBySource: vi.fn(),
    },
    ability,
  };
}

/** 创建测试配置 */
function createTestConfig(
  overrides: Partial<ActivateInstanceComponentConfig> = {},
): ActivateInstanceComponentConfig {
  return {
    triggers: [{ eventKind: 'inputAction' }],
    timelineId: 'test_timeline',
    tagActions: {},
    ...overrides,
  };
}

// ========== 测试套件 ==========

describe('ActivateInstanceComponent', () => {
  let mockAbility: ReturnType<typeof createMockAbility>;
  let mockContext: ComponentLifecycleContext;

  beforeEach(() => {
    mockAbility = createMockAbility();
    mockContext = createMockContext(mockAbility);
  });

  describe('构造函数', () => {
    it('应该正确初始化组件', () => {
      const config = createTestConfig({
        triggers: [{ eventKind: 'inputAction' }, { eventKind: 'damage' }],
        triggerMode: 'all',
        timelineId: 'fireball',
        tagActions: {
          hit: [createMockAction('damage')],
        },
      });

      const component = new ActivateInstanceComponent(config);

      expect(component.type).toBe('timelineExecution');
      expect(component.state).toBe('active');
    });

    it('triggerMode 默认为 any', () => {
      const config = createTestConfig();
      const component = new ActivateInstanceComponent(config);

      component.initialize(mockAbility);

      // 测试默认 any 模式 - 单个触发器匹配即可
      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs.length).toBe(1);
    });
  });

  describe('onEvent 事件匹配', () => {
    it('匹配的事件应该激活执行实例', () => {
      const component = new ActivateInstanceComponent(createTestConfig());
      component.initialize(mockAbility);

      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs.length).toBe(1);
      expect(mockAbility.activatedConfigs[0].timelineId).toBe('test_timeline');
    });

    it('不匹配的事件不应该激活执行实例', () => {
      const component = new ActivateInstanceComponent(createTestConfig());
      component.initialize(mockAbility);

      const event: DamageEvent = { kind: 'damage',  damage: 100 };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs.length).toBe(0);
    });

    it('空 triggers 不应该激活', () => {
      const component = new ActivateInstanceComponent(
        createTestConfig({ triggers: [] }),
      );
      component.initialize(mockAbility);

      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs.length).toBe(0);
    });

    it('多次事件应该创建多个执行实例', () => {
      const component = new ActivateInstanceComponent(createTestConfig());
      component.initialize(mockAbility);

      const event1: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      const event2: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };

      component.onEvent(event1, mockContext, {});
      component.onEvent(event2, mockContext, {});

      expect(mockAbility.activatedConfigs.length).toBe(2);
    });
  });

  describe('triggerMode', () => {
    describe('any 模式', () => {
      it('任一触发器匹配即可激活', () => {
        const component = new ActivateInstanceComponent(
          createTestConfig({
            triggers: [{ eventKind: 'inputAction' }, { eventKind: 'damage' }],
            triggerMode: 'any',
          }),
        );
        component.initialize(mockAbility);

        // 只匹配第一个触发器
        const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
        component.onEvent(event, mockContext, {});

        expect(mockAbility.activatedConfigs.length).toBe(1);
      });

      it('所有触发器都不匹配时不激活', () => {
        const component = new ActivateInstanceComponent(
          createTestConfig({
            triggers: [{ eventKind: 'inputAction' }, { eventKind: 'damage' }],
            triggerMode: 'any',
          }),
        );
        component.initialize(mockAbility);

        // 不匹配任何触发器
        const event: GameEventBase = { kind: 'heal' };
        component.onEvent(event, mockContext, {});

        expect(mockAbility.activatedConfigs.length).toBe(0);
      });
    });

    describe('all 模式', () => {
      it('所有触发器都匹配才激活', () => {
        // 使用相同 eventKind 但不同 filter 来测试 all 模式
        const component = new ActivateInstanceComponent(
          createTestConfig({
            triggers: [
              { eventKind: 'inputAction' },
              {
                eventKind: 'inputAction',
                filter: (e) => (e as InputActionEvent).actionId === 'skill_special',
              },
            ],
            triggerMode: 'all',
          }),
        );
        component.initialize(mockAbility);

        // 事件匹配第一个触发器，但 filter 不通过
        const event1: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_normal' };
        component.onEvent(event1, mockContext, {});
        expect(mockAbility.activatedConfigs.length).toBe(0);

        // 事件同时满足两个触发器
        const event2: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_special' };
        component.onEvent(event2, mockContext, {});
        expect(mockAbility.activatedConfigs.length).toBe(1);
      });

      it('部分触发器不匹配时不激活', () => {
        const component = new ActivateInstanceComponent(
          createTestConfig({
            triggers: [{ eventKind: 'inputAction' }, { eventKind: 'damage' }],
            triggerMode: 'all',
          }),
        );
        component.initialize(mockAbility);

        // 只能匹配一个 eventKind
        const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
        component.onEvent(event, mockContext, {});

        expect(mockAbility.activatedConfigs.length).toBe(0);
      });
    });
  });

  describe('filter 自定义过滤器', () => {
    it('filter 返回 true 时应该激活', () => {
      const component = new ActivateInstanceComponent(
        createTestConfig({
          triggers: [
            {
              eventKind: 'inputAction',
              filter: (e) => (e as InputActionEvent).actionId === 'skill_1',
            },
          ],
        }),
      );
      component.initialize(mockAbility);

      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs.length).toBe(1);
    });

    it('filter 返回 false 时不应该激活', () => {
      const component = new ActivateInstanceComponent(
        createTestConfig({
          triggers: [
            {
              eventKind: 'inputAction',
              filter: (e) => (e as InputActionEvent).actionId === 'skill_1',
            },
          ],
        }),
      );
      component.initialize(mockAbility);

      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_2' };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs.length).toBe(0);
    });

    it('filter 可以访问 context', () => {
      let capturedContext: ComponentLifecycleContext | undefined;

      const component = new ActivateInstanceComponent(
        createTestConfig({
          triggers: [
            {
              eventKind: 'inputAction',
              filter: (_e, ctx) => {
                capturedContext = ctx;
                return true;
              },
            },
          ],
        }),
      );
      component.initialize(mockAbility);

      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, {});

      expect(capturedContext).toBe(mockContext);
    });
  });

  describe('activateExecution 配置传递', () => {
    it('应该正确传递 timelineId', () => {
      const component = new ActivateInstanceComponent(
        createTestConfig({ timelineId: 'fireball_timeline' }),
      );
      component.initialize(mockAbility);

      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs[0].timelineId).toBe('fireball_timeline');
    });

    it('应该正确传递 tagActions', () => {
      const hitAction = createMockAction('hit');
      const endAction = createMockAction('end');

      const component = new ActivateInstanceComponent(
        createTestConfig({
          tagActions: {
            hit: [hitAction],
            end: [endAction],
          },
        }),
      );
      component.initialize(mockAbility);

      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs[0].tagActions).toEqual({
        hit: [hitAction],
        end: [endAction],
      });
    });

    it('应该将触发事件放入 eventChain', () => {
      const component = new ActivateInstanceComponent(createTestConfig());
      component.initialize(mockAbility);

      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, {});

      expect(mockAbility.activatedConfigs[0].eventChain).toEqual([event]);
    });

    it('应该传递 gameplayState', () => {
      const component = new ActivateInstanceComponent(createTestConfig());
      component.initialize(mockAbility);

      const gameplayState = { battleId: 'battle_1', turn: 5 };
      const event: InputActionEvent = { kind: 'inputAction',  actionId: 'skill_1' };
      component.onEvent(event, mockContext, gameplayState);

      expect(mockAbility.activatedConfigs[0].gameplayState).toBe(gameplayState);
    });
  });

  describe('createEventTrigger 工厂函数', () => {
    it('应该创建简单触发器', () => {
      const trigger = createEventTrigger<InputActionEvent>('inputAction');

      expect(trigger.eventKind).toBe('inputAction');
      expect(trigger.filter).toBeUndefined();
    });

    it('应该创建带 filter 的触发器', () => {
      const filter = (e: InputActionEvent) => e.actionId === 'skill_1';
      const trigger = createEventTrigger<InputActionEvent>('inputAction', { filter });

      expect(trigger.eventKind).toBe('inputAction');
      expect(trigger.filter).toBe(filter);
    });
  });

  describe('serialize()', () => {
    it('应该正确序列化', () => {
      const component = new ActivateInstanceComponent(
        createTestConfig({
          triggers: [{ eventKind: 'a' }, { eventKind: 'b' }],
          triggerMode: 'all',
          timelineId: 'my_timeline',
          tagActions: {
            hit: [createMockAction('hit')],
            end: [createMockAction('end')],
          },
        }),
      );

      const serialized = component.serialize();

      expect(serialized).toEqual({
        triggersCount: 2,
        triggerMode: 'all',
        timelineId: 'my_timeline',
        tagActionsCount: 2,
      });
    });
  });

  describe('组件状态', () => {
    it('初始化后状态应该为 active', () => {
      const component = new ActivateInstanceComponent(createTestConfig());
      component.initialize(mockAbility);

      expect(component.state).toBe('active');
    });

    it('markExpired 后状态应该为 expired', () => {
      const component = new ActivateInstanceComponent(createTestConfig());
      component.initialize(mockAbility);
      component.markExpired();

      expect(component.state).toBe('expired');
      expect(component.isExpired()).toBe(true);
    });
  });
});
