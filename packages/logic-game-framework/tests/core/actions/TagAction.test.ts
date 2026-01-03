/**
 * TagAction 单元测试
 *
 * 测试内容：
 * - ApplyTagAction: 添加 LooseTag / AutoDurationTag
 * - RemoveTagAction: 移除 LooseTag
 * - HasTagAction: 条件分支执行
 */
import { describe, it, expect, vi } from 'vitest';
import {
  ApplyTagAction,
  RemoveTagAction,
  HasTagAction,
} from '../../../src/core/actions/TagAction.js';
import { createAbilitySet, type AbilitySet } from '../../../src/core/abilities/AbilitySet.js';
import type { ExecutionContext } from '../../../src/core/actions/ExecutionContext.js';
import type { IAction } from '../../../src/core/actions/Action.js';
import type { ActorRef } from '../../../src/core/types/common.js';

// ========== Test Helpers ==========

/** 创建 Mock IAttributeModifierTarget */
function createMockModifierTarget() {
  return {
    addModifier: vi.fn(),
    removeModifier: vi.fn(),
    removeModifiersBySource: vi.fn(),
  };
}

/** 创建 AbilitySet */
function createTestAbilitySet(ownerId: string): AbilitySet {
  return createAbilitySet({ id: ownerId }, createMockModifierTarget());
}

/** 创建 Mock Action，记录执行次数 */
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

/** 创建实现 IAbilitySetProvider 的 gameplayState */
function createGameplayState(abilitySets: Map<string, AbilitySet>, logicTime = 0) {
  return {
    logicTime,
    getAbilitySetForActor(id: string): AbilitySet | undefined {
      return abilitySets.get(id);
    },
  };
}

/** 创建 ExecutionContext */
function createExecutionContext(
  gameplayState: unknown,
  targets: ActorRef[] = []
): ExecutionContext {
  return {
    eventChain: [],
    gameplayState,
    eventCollector: { push: vi.fn(), flush: vi.fn(() => []) },
    ability: {
      id: 'ability_1',
      configId: 'test_ability',
      owner: { id: 'owner_1' },
      source: { id: 'owner_1' },
    },
    targets,
  };
}

// ========== ApplyTagAction Tests ==========

describe('ApplyTagAction', () => {
  describe('添加 LooseTag（无 duration）', () => {
    it('应该添加 LooseTag，默认 1 层', () => {
      const abilitySet = createTestAbilitySet('actor_1');
      const abilitySets = new Map([['actor_1', abilitySet]]);
      const gameplayState = createGameplayState(abilitySets);

      const action = new ApplyTagAction({
        targetSelector: () => [{ id: 'actor_1' }],
        tag: 'burning',
      });

      const ctx = createExecutionContext(gameplayState);
      action.execute(ctx);

      expect(abilitySet.hasTag('burning')).toBe(true);
      expect(abilitySet.getTagStacks('burning')).toBe(1);
      expect(abilitySet.hasLooseTag('burning')).toBe(true);
    });

    it('应该添加指定层数的 LooseTag', () => {
      const abilitySet = createTestAbilitySet('actor_1');
      const abilitySets = new Map([['actor_1', abilitySet]]);
      const gameplayState = createGameplayState(abilitySets);

      const action = new ApplyTagAction({
        targetSelector: () => [{ id: 'actor_1' }],
        tag: 'combo_point',
        stacks: 3,
      });

      const ctx = createExecutionContext(gameplayState);
      action.execute(ctx);

      expect(abilitySet.getTagStacks('combo_point')).toBe(3);
      expect(abilitySet.getLooseTagStacks('combo_point')).toBe(3);
    });

    it('多次添加应该累加层数', () => {
      const abilitySet = createTestAbilitySet('actor_1');
      const abilitySets = new Map([['actor_1', abilitySet]]);
      const gameplayState = createGameplayState(abilitySets);

      const action = new ApplyTagAction({
        targetSelector: () => [{ id: 'actor_1' }],
        tag: 'stack_tag',
        stacks: 2,
      });

      const ctx = createExecutionContext(gameplayState);
      action.execute(ctx);
      action.execute(ctx);

      expect(abilitySet.getTagStacks('stack_tag')).toBe(4);
    });
  });

  describe('添加 AutoDurationTag（有 duration）', () => {
    it('应该添加 AutoDurationTag', () => {
      const abilitySet = createTestAbilitySet('actor_1');
      const abilitySets = new Map([['actor_1', abilitySet]]);
      const gameplayState = createGameplayState(abilitySets, 1000);

      const action = new ApplyTagAction({
        targetSelector: () => [{ id: 'actor_1' }],
        tag: 'cooldown:fireball',
        duration: 5000,
      });

      const ctx = createExecutionContext(gameplayState);
      action.execute(ctx);

      expect(abilitySet.hasTag('cooldown:fireball')).toBe(true);
      // AutoDurationTag 不是 LooseTag
      expect(abilitySet.hasLooseTag('cooldown:fireball')).toBe(false);
    });

    it('AutoDurationTag 应该在 tick 后过期', () => {
      const abilitySet = createTestAbilitySet('actor_1');
      const abilitySets = new Map([['actor_1', abilitySet]]);
      const gameplayState = createGameplayState(abilitySets, 0);

      const action = new ApplyTagAction({
        targetSelector: () => [{ id: 'actor_1' }],
        tag: 'buff',
        duration: 1000,
      });

      const ctx = createExecutionContext(gameplayState);
      action.execute(ctx);

      expect(abilitySet.hasTag('buff')).toBe(true);

      // tick 到 1001ms，Tag 应该过期
      abilitySet.tick(0, 1001);

      expect(abilitySet.hasTag('buff')).toBe(false);
    });
  });

  describe('多目标', () => {
    it('应该对所有目标添加 Tag', () => {
      const abilitySet1 = createTestAbilitySet('actor_1');
      const abilitySet2 = createTestAbilitySet('actor_2');
      const abilitySets = new Map([
        ['actor_1', abilitySet1],
        ['actor_2', abilitySet2],
      ]);
      const gameplayState = createGameplayState(abilitySets);

      const action = new ApplyTagAction({
        targetSelector: () => [{ id: 'actor_1' }, { id: 'actor_2' }],
        tag: 'marked',
      });

      const ctx = createExecutionContext(gameplayState);
      action.execute(ctx);

      expect(abilitySet1.hasTag('marked')).toBe(true);
      expect(abilitySet2.hasTag('marked')).toBe(true);
    });
  });
});

// ========== RemoveTagAction Tests ==========

describe('RemoveTagAction', () => {
  it('应该移除 LooseTag（全部）', () => {
    const abilitySet = createTestAbilitySet('actor_1');
    abilitySet.addLooseTag('debuff', 5);
    const abilitySets = new Map([['actor_1', abilitySet]]);
    const gameplayState = createGameplayState(abilitySets);

    const action = new RemoveTagAction({
      targetSelector: () => [{ id: 'actor_1' }],
      tag: 'debuff',
    });

    const ctx = createExecutionContext(gameplayState);
    action.execute(ctx);

    expect(abilitySet.hasTag('debuff')).toBe(false);
    expect(abilitySet.getTagStacks('debuff')).toBe(0);
  });

  it('应该移除指定层数的 LooseTag', () => {
    const abilitySet = createTestAbilitySet('actor_1');
    abilitySet.addLooseTag('poison', 5);
    const abilitySets = new Map([['actor_1', abilitySet]]);
    const gameplayState = createGameplayState(abilitySets);

    const action = new RemoveTagAction({
      targetSelector: () => [{ id: 'actor_1' }],
      tag: 'poison',
      stacks: 2,
    });

    const ctx = createExecutionContext(gameplayState);
    action.execute(ctx);

    expect(abilitySet.hasTag('poison')).toBe(true);
    expect(abilitySet.getTagStacks('poison')).toBe(3);
  });

  it('不应该移除 AutoDurationTag', () => {
    const abilitySet = createTestAbilitySet('actor_1');
    abilitySet.addAutoDurationTag('cooldown', 5000);
    const abilitySets = new Map([['actor_1', abilitySet]]);
    const gameplayState = createGameplayState(abilitySets);

    const action = new RemoveTagAction({
      targetSelector: () => [{ id: 'actor_1' }],
      tag: 'cooldown',
    });

    const ctx = createExecutionContext(gameplayState);
    action.execute(ctx);

    // AutoDurationTag 不受 RemoveTagAction 影响
    expect(abilitySet.hasTag('cooldown')).toBe(true);
  });

  it('移除不存在的 Tag 应该静默处理', () => {
    const abilitySet = createTestAbilitySet('actor_1');
    const abilitySets = new Map([['actor_1', abilitySet]]);
    const gameplayState = createGameplayState(abilitySets);

    const action = new RemoveTagAction({
      targetSelector: () => [{ id: 'actor_1' }],
      tag: 'nonexistent',
    });

    const ctx = createExecutionContext(gameplayState);
    const result = action.execute(ctx);

    expect(result.success).toBe(true);
  });
});

// ========== HasTagAction Tests ==========

describe('HasTagAction', () => {
  it('有 Tag 时应该执行 then actions', () => {
    const abilitySet = createTestAbilitySet('actor_1');
    abilitySet.addLooseTag('ready');
    const abilitySets = new Map([['actor_1', abilitySet]]);
    const gameplayState = createGameplayState(abilitySets);

    const thenAction = createMockAction('then');
    const elseAction = createMockAction('else');

    const action = new HasTagAction({
      targetSelector: () => [{ id: 'actor_1' }],
      tag: 'ready',
      then: [thenAction],
      else: [elseAction],
    });

    const ctx = createExecutionContext(gameplayState);
    action.execute(ctx);

    expect(thenAction.executeCalls).toBe(1);
    expect(elseAction.executeCalls).toBe(0);
  });

  it('没有 Tag 时应该执行 else actions', () => {
    const abilitySet = createTestAbilitySet('actor_1');
    // 不添加任何 Tag
    const abilitySets = new Map([['actor_1', abilitySet]]);
    const gameplayState = createGameplayState(abilitySets);

    const thenAction = createMockAction('then');
    const elseAction = createMockAction('else');

    const action = new HasTagAction({
      targetSelector: () => [{ id: 'actor_1' }],
      tag: 'ready',
      then: [thenAction],
      else: [elseAction],
    });

    const ctx = createExecutionContext(gameplayState);
    action.execute(ctx);

    expect(thenAction.executeCalls).toBe(0);
    expect(elseAction.executeCalls).toBe(1);
  });

  it('没有 else 时，条件不满足应该什么都不做', () => {
    const abilitySet = createTestAbilitySet('actor_1');
    const abilitySets = new Map([['actor_1', abilitySet]]);
    const gameplayState = createGameplayState(abilitySets);

    const thenAction = createMockAction('then');

    const action = new HasTagAction({
      targetSelector: () => [{ id: 'actor_1' }],
      tag: 'missing',
      then: [thenAction],
      // 没有 else
    });

    const ctx = createExecutionContext(gameplayState);
    const result = action.execute(ctx);

    expect(thenAction.executeCalls).toBe(0);
    expect(result.success).toBe(true);
  });

  it('应该能检测 AutoDurationTag', () => {
    const abilitySet = createTestAbilitySet('actor_1');
    abilitySet.addAutoDurationTag('buff', 5000);
    const abilitySets = new Map([['actor_1', abilitySet]]);
    const gameplayState = createGameplayState(abilitySets);

    const thenAction = createMockAction('then');

    const action = new HasTagAction({
      targetSelector: () => [{ id: 'actor_1' }],
      tag: 'buff',
      then: [thenAction],
    });

    const ctx = createExecutionContext(gameplayState);
    action.execute(ctx);

    expect(thenAction.executeCalls).toBe(1);
  });

  describe('多目标行为（已知问题）', () => {
    it('当前实现：每个目标独立判断并执行', () => {
      // 注意：这是记录当前行为的测试，当前实现有问题
      // 每个 target 都会独立判断，可能导致 then/else 被多次执行
      const abilitySet1 = createTestAbilitySet('actor_1');
      const abilitySet2 = createTestAbilitySet('actor_2');
      abilitySet1.addLooseTag('buff'); // actor_1 有 tag
      // actor_2 没有 tag

      const abilitySets = new Map([
        ['actor_1', abilitySet1],
        ['actor_2', abilitySet2],
      ]);
      const gameplayState = createGameplayState(abilitySets);

      const thenAction = createMockAction('then');
      const elseAction = createMockAction('else');

      const action = new HasTagAction({
        targetSelector: () => [{ id: 'actor_1' }, { id: 'actor_2' }],
        tag: 'buff',
        then: [thenAction],
        else: [elseAction],
      });

      const ctx = createExecutionContext(gameplayState);
      action.execute(ctx);

      // 当前行为：actor_1 有 tag → 执行 then，actor_2 没有 tag → 执行 else
      // 所以 then 和 else 各执行 1 次
      expect(thenAction.executeCalls).toBe(1);
      expect(elseAction.executeCalls).toBe(1);
    });
  });
});

// ========== 边界情况 ==========

describe('边界情况', () => {
  it('目标没有 AbilitySet 时应该静默跳过', () => {
    const gameplayState = createGameplayState(new Map()); // 空的 map

    const action = new ApplyTagAction({
      targetSelector: () => [{ id: 'unknown_actor' }],
      tag: 'test',
    });

    const ctx = createExecutionContext(gameplayState);
    const result = action.execute(ctx);

    expect(result.success).toBe(true);
  });

  it('空目标列表应该正常处理', () => {
    const gameplayState = createGameplayState(new Map());

    const action = new ApplyTagAction({
      targetSelector: () => [],
      tag: 'test',
    });

    const ctx = createExecutionContext(gameplayState);
    const result = action.execute(ctx);

    expect(result.success).toBe(true);
  });
});
