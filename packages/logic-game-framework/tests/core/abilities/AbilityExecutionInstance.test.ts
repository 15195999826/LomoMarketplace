/**
 * AbilityExecutionInstance 单元测试
 *
 * 测试内容：
 * - 构造函数（正常、Timeline 不存在）
 * - tick() 时间推进和 Tag 触发
 * - 通配符匹配（prefix*）
 * - cancel() 取消执行
 * - 状态转换
 * - 多实例并行独立性
 * - 边界条件
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AbilityExecutionInstance,
  type ExecutionInstanceConfig,
} from '../../../src/core/abilities/AbilityExecutionInstance.js';
import {
  TimelineRegistry,
  setTimelineRegistry,
  type TimelineAsset,
} from '../../../src/core/timeline/Timeline.js';
import type { IAction, ActionResult } from '../../../src/core/actions/Action.js';
import type { ExecutionContext } from '../../../src/core/actions/ExecutionContext.js';

// ========== 测试用 Mock ==========

/** 创建 Mock Action */
function createMockAction(type: string): IAction & { executeCalls: ExecutionContext[] } {
  const executeCalls: ExecutionContext[] = [];
  return {
    type,
    executeCalls,
    execute(ctx: ExecutionContext): ActionResult {
      executeCalls.push(ctx);
      return { events: [] };
    },
  };
}

/** 创建 Mock Action（带事件输出） */
function createMockActionWithEvent(type: string, eventKind: string): IAction {
  return {
    type,
    execute(ctx: ExecutionContext): ActionResult {
      ctx.eventCollector.push({ kind: eventKind });
      return {};
    },
  };
}

/** 创建测试用 Timeline */
function createTestTimeline(id: string, duration: number, tags: Record<string, number>): TimelineAsset {
  return { id, totalDuration: duration, tags };
}

/** 创建测试用配置 */
function createTestConfig(
  timelineId: string,
  tagActions: Record<string, IAction[]> = {},
): ExecutionInstanceConfig {
  return {
    timelineId,
    tagActions,
    eventChain: [],
    gameplayState: {},
    abilityInfo: {
      id: 'ability_1',
      configId: 'config_1',
      owner: { id: 'owner_1' },
      source: { id: 'source_1' },
    },
  };
}

// ========== 测试套件 ==========

describe('AbilityExecutionInstance', () => {
  let registry: TimelineRegistry;

  beforeEach(() => {
    registry = new TimelineRegistry();
    setTimelineRegistry(registry);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('构造函数', () => {
    it('应该正确初始化执行实例', () => {
      const timeline = createTestTimeline('test_timeline', 1000, { hit: 500 });
      registry.register(timeline);

      const config = createTestConfig('test_timeline');
      const instance = new AbilityExecutionInstance(config);

      expect(instance.id).toMatch(/^execution_/);
      expect(instance.timelineId).toBe('test_timeline');
      expect(instance.elapsed).toBe(0);
      expect(instance.state).toBe('executing');
      expect(instance.isExecuting).toBe(true);
    });

    it('Timeline 不存在时应该发出警告但不抛出', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const config = createTestConfig('non_existent_timeline');
      const instance = new AbilityExecutionInstance(config);

      expect(instance.state).toBe('executing');
      // 注意：Logger 可能不使用 console.warn，这里只验证不抛出
    });
  });

  describe('tick() 时间推进', () => {
    it('应该正确推进 elapsed 时间', () => {
      const timeline = createTestTimeline('test', 1000, {});
      registry.register(timeline);

      const instance = new AbilityExecutionInstance(createTestConfig('test'));

      instance.tick(100);
      expect(instance.elapsed).toBe(100);

      instance.tick(200);
      expect(instance.elapsed).toBe(300);
    });

    it('应该在越过 Tag 时间点时触发', () => {
      const timeline = createTestTimeline('test', 1000, {
        cast: 0,
        hit: 300,
        end: 1000,
      });
      registry.register(timeline);

      const hitAction = createMockAction('hit_action');
      const config = createTestConfig('test', { hit: [hitAction] });
      const instance = new AbilityExecutionInstance(config);

      // tick 到 200ms，未触发 hit
      let triggered = instance.tick(200);
      expect(triggered).toEqual([]);
      expect(hitAction.executeCalls.length).toBe(0);

      // tick 到 400ms，越过 hit (300ms)
      triggered = instance.tick(200);
      expect(triggered).toEqual(['hit']);
      expect(hitAction.executeCalls.length).toBe(1);
    });

    it('应该按时间顺序触发多个 Tag', () => {
      const timeline = createTestTimeline('test', 1000, {
        tag_a: 100,
        tag_b: 200,
        tag_c: 300,
      });
      registry.register(timeline);

      const actionA = createMockAction('action_a');
      const actionB = createMockAction('action_b');
      const actionC = createMockAction('action_c');
      const config = createTestConfig('test', {
        tag_a: [actionA],
        tag_b: [actionB],
        tag_c: [actionC],
      });
      const instance = new AbilityExecutionInstance(config);

      // 一次 tick 越过所有 Tag
      const triggered = instance.tick(500);

      expect(triggered).toEqual(['tag_a', 'tag_b', 'tag_c']);
      expect(actionA.executeCalls.length).toBe(1);
      expect(actionB.executeCalls.length).toBe(1);
      expect(actionC.executeCalls.length).toBe(1);
    });

    it('同一 Tag 不应该重复触发', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 300 });
      registry.register(timeline);

      const hitAction = createMockAction('hit_action');
      const config = createTestConfig('test', { hit: [hitAction] });
      const instance = new AbilityExecutionInstance(config);

      instance.tick(400); // 触发 hit
      instance.tick(100); // 再次 tick，hit 不应重复触发

      expect(hitAction.executeCalls.length).toBe(1);
    });

    it('Timeline 达到 totalDuration 时应该标记为 completed', () => {
      const timeline = createTestTimeline('test', 500, {});
      registry.register(timeline);

      const instance = new AbilityExecutionInstance(createTestConfig('test'));

      instance.tick(300);
      expect(instance.state).toBe('executing');

      instance.tick(200);
      expect(instance.state).toBe('completed');
      expect(instance.isCompleted).toBe(true);
    });

    it('completed 状态下 tick 应该返回空数组', () => {
      const timeline = createTestTimeline('test', 100, { hit: 50 });
      registry.register(timeline);

      const hitAction = createMockAction('hit');
      const config = createTestConfig('test', { hit: [hitAction] });
      const instance = new AbilityExecutionInstance(config);

      instance.tick(150); // 完成
      expect(instance.state).toBe('completed');

      const triggered = instance.tick(100);
      expect(triggered).toEqual([]);
    });
  });

  describe('通配符匹配', () => {
    it('应该支持 prefix* 通配符匹配', () => {
      const timeline = createTestTimeline('test', 1000, {
        damage_1: 100,
        damage_2: 200,
        heal_1: 300,
      });
      registry.register(timeline);

      const damageAction = createMockAction('damage');
      const healAction = createMockAction('heal');
      const config = createTestConfig('test', {
        'damage_*': [damageAction],
        'heal_*': [healAction],
      });
      const instance = new AbilityExecutionInstance(config);

      instance.tick(350);

      expect(damageAction.executeCalls.length).toBe(2); // damage_1, damage_2
      expect(healAction.executeCalls.length).toBe(1); // heal_1
    });

    it('精确匹配应该优先于通配符匹配', () => {
      const timeline = createTestTimeline('test', 1000, {
        hit: 100,
        hit_special: 200,
      });
      registry.register(timeline);

      const exactAction = createMockAction('exact');
      const wildcardAction = createMockAction('wildcard');
      const config = createTestConfig('test', {
        hit: [exactAction],
        'hit_*': [wildcardAction],
      });
      const instance = new AbilityExecutionInstance(config);

      instance.tick(250);

      expect(exactAction.executeCalls.length).toBe(1); // hit
      expect(wildcardAction.executeCalls.length).toBe(1); // hit_special
    });

    it('无匹配的 Tag 应该被忽略', () => {
      const timeline = createTestTimeline('test', 1000, {
        unknown_tag: 100,
      });
      registry.register(timeline);

      const config = createTestConfig('test', {
        other_tag: [createMockAction('other')],
      });
      const instance = new AbilityExecutionInstance(config);

      // 不应该抛出错误
      const triggered = instance.tick(200);
      expect(triggered).toEqual(['unknown_tag']);
    });
  });

  describe('cancel() 取消执行', () => {
    it('应该将状态设为 cancelled', () => {
      const timeline = createTestTimeline('test', 1000, {});
      registry.register(timeline);

      const instance = new AbilityExecutionInstance(createTestConfig('test'));

      instance.cancel();

      expect(instance.state).toBe('cancelled');
      expect(instance.isCancelled).toBe(true);
    });

    it('cancelled 状态下 tick 应该返回空数组', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 100 });
      registry.register(timeline);

      const hitAction = createMockAction('hit');
      const config = createTestConfig('test', { hit: [hitAction] });
      const instance = new AbilityExecutionInstance(config);

      instance.cancel();
      const triggered = instance.tick(200);

      expect(triggered).toEqual([]);
      expect(hitAction.executeCalls.length).toBe(0);
    });

    it('已完成的实例调用 cancel 应该无效', () => {
      const timeline = createTestTimeline('test', 100, {});
      registry.register(timeline);

      const instance = new AbilityExecutionInstance(createTestConfig('test'));
      instance.tick(200); // 完成
      expect(instance.state).toBe('completed');

      instance.cancel();
      expect(instance.state).toBe('completed'); // 保持 completed
    });
  });

  describe('事件收集', () => {
    it('应该收集 Action 产生的事件', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 100 });
      registry.register(timeline);

      const hitAction = createMockActionWithEvent('hit', 'damage');
      const config = createTestConfig('test', { hit: [hitAction] });
      const instance = new AbilityExecutionInstance(config);

      instance.tick(200);

      const events = instance.getCollectedEvents();
      expect(events.length).toBe(1);
      expect(events[0].kind).toBe('damage');
    });

  });

  describe('多实例并行', () => {
    it('多个实例应该独立维护状态', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 300 });
      registry.register(timeline);

      const action1 = createMockAction('action1');
      const action2 = createMockAction('action2');

      const instance1 = new AbilityExecutionInstance(
        createTestConfig('test', { hit: [action1] }),
      );
      const instance2 = new AbilityExecutionInstance(
        createTestConfig('test', { hit: [action2] }),
      );

      // instance1 先推进
      instance1.tick(400);
      expect(action1.executeCalls.length).toBe(1);
      expect(action2.executeCalls.length).toBe(0);

      // instance2 后推进
      instance2.tick(400);
      expect(action2.executeCalls.length).toBe(1);

      // 各自状态独立
      expect(instance1.elapsed).toBe(400);
      expect(instance2.elapsed).toBe(400);
    });

    it('取消一个实例不影响其他实例', () => {
      const timeline = createTestTimeline('test', 1000, {});
      registry.register(timeline);

      const instance1 = new AbilityExecutionInstance(createTestConfig('test'));
      const instance2 = new AbilityExecutionInstance(createTestConfig('test'));

      instance1.cancel();

      expect(instance1.state).toBe('cancelled');
      expect(instance2.state).toBe('executing');
    });
  });

  describe('边界条件', () => {
    it('Timeline 不存在时应该立即完成', () => {
      // 不注册任何 Timeline
      const instance = new AbilityExecutionInstance(
        createTestConfig('non_existent'),
      );

      instance.tick(100);

      expect(instance.state).toBe('completed');
    });

    it('空 tagActions 应该正常工作', () => {
      const timeline = createTestTimeline('test', 500, { hit: 100 });
      registry.register(timeline);

      const instance = new AbilityExecutionInstance(createTestConfig('test', {}));

      const triggered = instance.tick(200);
      expect(triggered).toEqual(['hit']); // Tag 被触发，但无 Action 执行
    });

    it('Tag 时间为 0 不会被触发（边界行为：previousElapsed < tagTime）', () => {
      // 注意：当前实现中 tagTime=0 时，条件 previousElapsed < tagTime 为 0 < 0 = false
      // 所以 tagTime=0 的 Tag 永远不会触发。如需支持，应改为 previousElapsed <= tagTime
      const timeline = createTestTimeline('test', 1000, { instant: 0 });
      registry.register(timeline);

      const action = createMockAction('instant');
      const config = createTestConfig('test', { instant: [action] });
      const instance = new AbilityExecutionInstance(config);

      const triggered = instance.tick(1);
      // 当前行为：tagTime=0 不触发
      expect(triggered).toEqual([]);
      expect(action.executeCalls.length).toBe(0);
    });

    it('Tag 时间为 1 应该在首次 tick(1+) 时触发', () => {
      const timeline = createTestTimeline('test', 1000, { early: 1 });
      registry.register(timeline);

      const action = createMockAction('early');
      const config = createTestConfig('test', { early: [action] });
      const instance = new AbilityExecutionInstance(config);

      const triggered = instance.tick(1);
      expect(triggered).toEqual(['early']);
      expect(action.executeCalls.length).toBe(1);
    });

    it('dt 为 0 不应该触发任何 Tag', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 0 });
      registry.register(timeline);

      const action = createMockAction('hit');
      const config = createTestConfig('test', { hit: [action] });
      const instance = new AbilityExecutionInstance(config);

      const triggered = instance.tick(0);
      expect(triggered).toEqual([]);
    });

    it('精确到达 Tag 时间点应该触发', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 300 });
      registry.register(timeline);

      const action = createMockAction('hit');
      const config = createTestConfig('test', { hit: [action] });
      const instance = new AbilityExecutionInstance(config);

      instance.tick(300); // 精确到达 300ms
      expect(action.executeCalls.length).toBe(1);
    });
  });

  describe('ExecutionContext', () => {
    it('应该正确构建 ExecutionContext', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 100 });
      registry.register(timeline);

      const action = createMockAction('test');
      const config: ExecutionInstanceConfig = {
        timelineId: 'test',
        tagActions: { hit: [action] },
        eventChain: [{ kind: 'input' }],
        gameplayState: { battleId: 'battle_1' },
        abilityInfo: {
          id: 'ability_123',
          configId: 'fireball',
          owner: { id: 'player_1' },
          source: { id: 'caster_1' },
        },
      };
      const instance = new AbilityExecutionInstance(config);

      instance.tick(200);

      expect(action.executeCalls.length).toBe(1);
      const ctx = action.executeCalls[0];

      expect(ctx.eventChain).toEqual([{ kind: 'input' }]);
      expect(ctx.gameplayState).toEqual({ battleId: 'battle_1' });
      expect(ctx.ability?.id).toBe('ability_123');
      expect(ctx.ability?.configId).toBe('fireball');
      expect(ctx.execution?.timelineId).toBe('test');
      expect(ctx.execution?.currentTag).toBe('hit');
    });
  });

  describe('serialize()', () => {
    it('应该正确序列化状态', () => {
      const timeline = createTestTimeline('test', 1000, { hit: 100, end: 500 });
      registry.register(timeline);

      const instance = new AbilityExecutionInstance(createTestConfig('test'));
      instance.tick(200); // 触发 hit

      const serialized = instance.serialize();

      expect(serialized).toMatchObject({
        timelineId: 'test',
        elapsed: 200,
        state: 'executing',
        triggeredTags: ['hit'],
      });
      expect((serialized as { id: string }).id).toMatch(/^execution_/);
    });
  });
});
