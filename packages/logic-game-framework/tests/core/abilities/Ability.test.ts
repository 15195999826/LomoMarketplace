/**
 * Ability 单元测试
 *
 * 测试内容：
 * - 构造函数（组件注入、owner/source）
 * - 生命周期（pending → granted → expired）
 * - Component 查询（getComponent、getComponents、hasComponent）
 * - tick 和 tickExecutions
 * - receiveEvent 事件分发
 * - applyEffects/removeEffects
 * - expire
 * - 执行实例管理
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Ability, type AbilityConfig } from '../../../src/core/abilities/Ability.js';
import {
  BaseAbilityComponent,
  ComponentTypes,
  type IAbilityComponent,
  type IAbilityForComponent,
  type ComponentLifecycleContext,
} from '../../../src/core/abilities/AbilityComponent.js';
import {
  TimelineRegistry,
  setTimelineRegistry,
  type TimelineAsset,
} from '../../../src/core/timeline/Timeline.js';
import { GameWorld } from '../../../src/core/world/GameWorld.js';
import type { IGameplayStateProvider } from '../../../src/core/world/IGameplayStateProvider.js';
import type { GameEventBase } from '../../../src/core/events/GameEvent.js';
import type { IAction, ActionResult } from '../../../src/core/actions/Action.js';
import type { Actor } from '../../../src/core/entity/Actor.js';

// ========== Mock Component ==========

class MockComponent extends BaseAbilityComponent {
  readonly type = 'mock';

  onApplyCalls: ComponentLifecycleContext[] = [];
  onRemoveCalls: ComponentLifecycleContext[] = [];
  onTickCalls: number[] = [];
  onEventCalls: Array<{ event: GameEventBase; gameplayState: unknown }> = [];

  onApply(context: ComponentLifecycleContext): void {
    this.onApplyCalls.push(context);
  }

  onRemove(context: ComponentLifecycleContext): void {
    this.onRemoveCalls.push(context);
  }

  onTick(dt: number): void {
    this.onTickCalls.push(dt);
  }

  onEvent(event: GameEventBase, _context: ComponentLifecycleContext, gameplayState: unknown): boolean {
    this.onEventCalls.push({ event, gameplayState });
    return true; // 表示响应了事件
  }

  serialize(): object {
    return { type: this.type };
  }
}

class DurationComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.TIME_DURATION;
  private elapsed = 0;
  private readonly duration: number;

  constructor(duration: number) {
    super();
    this.duration = duration;
  }

  onTick(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.ability?.expire('duration_expired');
    }
  }
}

/** 创建测试用 Timeline */
function createTestTimeline(id: string, duration: number, tags: Record<string, number>): TimelineAsset {
  return { id, totalDuration: duration, tags };
}

/** 创建 Mock Action */
function createMockAction(type: string): IAction & { executeCalls: number } {
  return {
    type,
    executeCalls: 0,
    execute() {
      (this as { executeCalls: number }).executeCalls++;
      return { success: true, events: [] };
    },
  };
}

/** 创建 Mock Context */
function createMockContext(ability: IAbilityForComponent): ComponentLifecycleContext {
  return {
    owner: { id: 'owner_1' },
    attributes: {
      addModifier: vi.fn(),
      removeModifier: vi.fn(),
      removeModifiersBySource: vi.fn(),
      getModifiers: vi.fn(() => []),
      hasModifier: vi.fn(() => false),
    },
    ability,
  };
}

/** 创建 Mock GameplayState */
function createMockGameplayState(): IGameplayStateProvider {
  return {
    aliveActors: [],
    getActor: vi.fn(() => undefined),
  };
}

// ========== 测试套件 ==========

describe('Ability', () => {
  let registry: TimelineRegistry;

  beforeEach(() => {
    registry = new TimelineRegistry();
    setTimelineRegistry(registry);

    // 初始化 GameWorld（如果尚未初始化）
    if (!GameWorld['_instance']) {
      GameWorld.init();
    }
  });

  afterEach(() => {
    // 清理：在每个测试后销毁 GameWorld
    GameWorld.destroy();
  });

  describe('构造函数', () => {
    it('应该正确初始化 Ability', () => {
      const component = new MockComponent();
      const config: AbilityConfig = {
        configId: 'fireball',
        components: [component],
        displayName: 'Fireball',
        description: 'A powerful fire spell',
        icon: 'icon_fireball',
        tags: ['fire', 'damage'],
      };

      const ability = new Ability(config, { id: 'player_1' });

      expect(ability.id).toMatch(/^ability_/);
      expect(ability.configId).toBe('fireball');
      expect(ability.displayName).toBe('Fireball');
      expect(ability.description).toBe('A powerful fire spell');
      expect(ability.icon).toBe('icon_fireball');
      expect(ability.tags).toEqual(['fire', 'damage']);
      expect(ability.state).toBe('pending');
    });

    it('owner 和 source 应该正确设置', () => {
      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
        { id: 'source_1' },
      );

      expect(ability.owner).toEqual({ id: 'owner_1' });
      expect(ability.source).toEqual({ id: 'source_1' });
    });

    it('source 默认为 owner', () => {
      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );

      expect(ability.source).toEqual({ id: 'owner_1' });
    });

    it('组件应该被初始化', () => {
      const component = new MockComponent();
      const initializeSpy = vi.spyOn(component, 'initialize');

      new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );

      expect(initializeSpy).toHaveBeenCalled();
    });

    it('tags 应该被冻结', () => {
      const ability = new Ability(
        { configId: 'test', components: [], tags: ['a', 'b'] },
        { id: 'owner_1' },
      );

      expect(Object.isFrozen(ability.tags)).toBe(true);
    });
  });

  describe('生命周期', () => {
    it('初始状态应该是 pending', () => {
      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );

      expect(ability.state).toBe('pending');
      expect(ability.isGranted).toBe(false);
      expect(ability.isExpired).toBe(false);
    });

    it('applyEffects 应该将状态改为 granted', () => {
      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );
      const context = createMockContext(ability);

      ability.applyEffects(context);

      expect(ability.state).toBe('granted');
      expect(ability.isGranted).toBe(true);
    });

    it('expire 应该将状态改为 expired', () => {
      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );
      const context = createMockContext(ability);
      ability.applyEffects(context);

      ability.expire('test_reason');

      expect(ability.state).toBe('expired');
      expect(ability.isExpired).toBe(true);
      expect(ability.expireReason).toBe('test_reason');
    });

    it('多次 expire 只记录第一个原因', () => {
      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );
      const context = createMockContext(ability);
      ability.applyEffects(context);

      ability.expire('first_reason');
      ability.expire('second_reason');

      expect(ability.expireReason).toBe('first_reason');
    });

    it('重复 applyEffects 应该被忽略', () => {
      const component = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );
      const context = createMockContext(ability);

      ability.applyEffects(context);
      ability.applyEffects(context);

      expect(component.onApplyCalls.length).toBe(1);
    });
  });

  describe('Component 查询', () => {
    it('getComponent 应该返回匹配的组件', () => {
      const mockComp = new MockComponent();
      const durationComp = new DurationComponent(1000);
      const ability = new Ability(
        { configId: 'test', components: [mockComp, durationComp] },
        { id: 'owner_1' },
      );

      const result = ability.getComponent(MockComponent);

      expect(result).toBe(mockComp);
    });

    it('getComponent 不存在时返回 undefined', () => {
      const ability = new Ability(
        { configId: 'test', components: [new MockComponent()] },
        { id: 'owner_1' },
      );

      const result = ability.getComponent(DurationComponent);

      expect(result).toBeUndefined();
    });

    it('getComponents 应该返回所有匹配的组件', () => {
      const mock1 = new MockComponent();
      const mock2 = new MockComponent();
      const duration = new DurationComponent(1000);
      const ability = new Ability(
        { configId: 'test', components: [mock1, duration, mock2] },
        { id: 'owner_1' },
      );

      const results = ability.getComponents(MockComponent);

      expect(results).toEqual([mock1, mock2]);
    });

    it('hasComponent 应该正确检查组件存在', () => {
      const ability = new Ability(
        { configId: 'test', components: [new MockComponent()] },
        { id: 'owner_1' },
      );

      expect(ability.hasComponent(MockComponent)).toBe(true);
      expect(ability.hasComponent(DurationComponent)).toBe(false);
    });

    it('getAllComponents 应该返回所有组件', () => {
      const components = [new MockComponent(), new DurationComponent(1000)];
      const ability = new Ability(
        { configId: 'test', components },
        { id: 'owner_1' },
      );

      expect(ability.getAllComponents()).toEqual(components);
    });
  });

  describe('tick', () => {
    it('应该分发 tick 到所有组件', () => {
      const comp1 = new MockComponent();
      const comp2 = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [comp1, comp2] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));

      ability.tick(100);

      expect(comp1.onTickCalls).toEqual([100]);
      expect(comp2.onTickCalls).toEqual([100]);
    });

    it('expired 状态下不应该 tick', () => {
      const component = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));
      ability.expire('test');

      ability.tick(100);

      expect(component.onTickCalls.length).toBe(0);
    });

    it('expired 的组件不应该收到 tick', () => {
      const component = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));
      component.markExpired();

      ability.tick(100);

      expect(component.onTickCalls.length).toBe(0);
    });

    it('组件可以在 tick 中触发过期', () => {
      const durationComp = new DurationComponent(500);
      const ability = new Ability(
        { configId: 'test', components: [durationComp] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));

      ability.tick(300);
      expect(ability.state).toBe('granted');

      ability.tick(300);
      expect(ability.state).toBe('expired');
      expect(ability.expireReason).toBe('duration_expired');
    });
  });

  describe('tickExecutions', () => {
    it('应该推进所有执行实例', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 300 });
      registry.register(timeline);

      const action = createMockAction('hit');
      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));

      // 创建执行实例
      ability.activateNewExecutionInstance({
        timelineId: 'test',
        tagActions: { hit: [action] },
        eventChain: [],
        gameplayState: createMockGameplayState(),
      });

      const triggered = ability.tickExecutions(400);

      expect(triggered).toEqual(['hit']);
      expect(action.executeCalls).toBe(1);
    });

    it('expired 状态下不应该 tickExecutions', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 100 });
      registry.register(timeline);

      const action = createMockAction('hit');
      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));
      ability.activateNewExecutionInstance({
        timelineId: 'test',
        tagActions: { hit: [action] },
        eventChain: [],
        gameplayState: createMockGameplayState(),
      });
      ability.expire('test');

      const triggered = ability.tickExecutions(200);

      expect(triggered).toEqual([]);
      expect(action.executeCalls).toBe(0);
    });

    it('完成的执行实例应该被自动清理', () => {
      const timeline = createTestTimeline('test', 100, {});
      registry.register(timeline);

      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));
      ability.activateNewExecutionInstance({
        timelineId: 'test',
        tagActions: {},
        eventChain: [],
        gameplayState: createMockGameplayState(),
      });

      expect(ability.getExecutingInstances().length).toBe(1);

      ability.tickExecutions(200); // 完成

      expect(ability.getExecutingInstances().length).toBe(0);
    });
  });

  describe('receiveEvent', () => {
    it('应该分发事件到所有组件', () => {
      const comp1 = new MockComponent();
      const comp2 = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [comp1, comp2] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));

      const event: GameEventBase = { kind: 'damage' };
      const gameplayState = createMockGameplayState();
      ability.receiveEvent(event, createMockContext(ability), gameplayState);

      expect(comp1.onEventCalls.length).toBe(1);
      expect(comp1.onEventCalls[0].event).toBe(event);
      expect(comp1.onEventCalls[0].gameplayState).toBe(gameplayState);
      expect(comp2.onEventCalls.length).toBe(1);
    });

    it('expired 状态下不应该接收事件', () => {
      const component = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));
      ability.expire('test');

      const event: GameEventBase = { kind: 'damage' };
      ability.receiveEvent(event, createMockContext(ability), createMockGameplayState());

      expect(component.onEventCalls.length).toBe(0);
    });

    it('expired 的组件不应该收到事件', () => {
      const component = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );
      ability.applyEffects(createMockContext(ability));
      component.markExpired();

      const event: GameEventBase = { kind: 'damage' };
      ability.receiveEvent(event, createMockContext(ability), createMockGameplayState());

      expect(component.onEventCalls.length).toBe(0);
    });
  });

  describe('applyEffects / removeEffects', () => {
    it('applyEffects 应该调用组件的 onApply', () => {
      const component = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );

      const context = createMockContext(ability);
      ability.applyEffects(context);

      expect(component.onApplyCalls.length).toBe(1);
      expect(component.onApplyCalls[0]).toBe(context);
    });

    it('removeEffects 应该调用组件的 onRemove', () => {
      const component = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );

      const context = createMockContext(ability);
      ability.applyEffects(context);
      ability.removeEffects();

      expect(component.onRemoveCalls.length).toBe(1);
    });

    it('expire 应该自动调用 removeEffects', () => {
      const component = new MockComponent();
      const ability = new Ability(
        { configId: 'test', components: [component] },
        { id: 'owner_1' },
      );

      ability.applyEffects(createMockContext(ability));
      ability.expire('test');

      expect(component.onRemoveCalls.length).toBe(1);
    });
  });

  describe('执行实例管理', () => {
    it('activateNewExecutionInstance 应该创建执行实例', () => {
      const timeline = createTestTimeline('test', 1000, {});
      registry.register(timeline);

      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );

      const instance = ability.activateNewExecutionInstance({
        timelineId: 'test',
        tagActions: {},
        eventChain: [],
        gameplayState: createMockGameplayState(),
      });

      expect(instance.id).toMatch(/^execution_/);
      expect(instance.timelineId).toBe('test');
      expect(instance.isExecuting).toBe(true);
    });

    it('getExecutingInstances 应该只返回正在执行的实例', () => {
      const timeline = createTestTimeline('test', 100, {});
      registry.register(timeline);

      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );

      ability.activateNewExecutionInstance({
        timelineId: 'test',
        tagActions: {},
        eventChain: [],
        gameplayState: createMockGameplayState(),
      });

      expect(ability.getExecutingInstances().length).toBe(1);

      ability.tickExecutions(200); // 完成
      // 注意：tickExecutions 会清理完成的实例
      expect(ability.getExecutingInstances().length).toBe(0);
    });

    it('cancelAllExecutions 应该取消所有执行实例', () => {
      const timeline = createTestTimeline('test', 1000, {});
      registry.register(timeline);

      const ability = new Ability(
        { configId: 'test', components: [] },
        { id: 'owner_1' },
      );

      ability.activateNewExecutionInstance({
        timelineId: 'test',
        tagActions: {},
        eventChain: [],
        gameplayState: createMockGameplayState(),
      });
      ability.activateNewExecutionInstance({
        timelineId: 'test',
        tagActions: {},
        eventChain: [],
        gameplayState: createMockGameplayState(),
      });

      expect(ability.getAllExecutionInstances().length).toBe(2);

      ability.cancelAllExecutions();

      expect(ability.getAllExecutionInstances().length).toBe(0);
    });
  });

  describe('标签操作', () => {
    it('hasTag 应该正确检查标签', () => {
      const ability = new Ability(
        { configId: 'test', components: [], tags: ['fire', 'damage'] },
        { id: 'owner_1' },
      );

      expect(ability.hasTag('fire')).toBe(true);
      expect(ability.hasTag('ice')).toBe(false);
    });
  });

  describe('serialize', () => {
    it('应该正确序列化', () => {
      const component = new MockComponent();
      const ability = new Ability(
        {
          configId: 'fireball',
          components: [component],
          displayName: 'Fireball',
          tags: ['fire'],
        },
        { id: 'owner_1' },
        { id: 'source_1' },
      );

      const serialized = ability.serialize() as Record<string, unknown>;

      expect(serialized.configId).toBe('fireball');
      expect(serialized.displayName).toBe('Fireball');
      expect(serialized.tags).toEqual(['fire']);
      expect(serialized.state).toBe('pending');
      expect(serialized.owner).toEqual({ id: 'owner_1' });
      expect(serialized.source).toEqual({ id: 'source_1' });
      expect((serialized.components as object[]).length).toBe(1);
    });
  });
});
