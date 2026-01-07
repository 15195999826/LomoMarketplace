/**
 * battleReplayReducer 单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  applyEvent,
  applyFrame,
  resetToInitial,
  applyToFrameIndex,
  stepForward,
  stepBackward,
} from '@/components/battle-replay/battleReplayReducer';
import {
  createInitialState,
  createActorState,
  getReplaySummary,
  type ReplayPlayerState,
  type ActorState,
} from '@/components/battle-replay/types';
import type { IBattleRecord, IActorInitData, IFrameData } from '@inkmon/battle';

// ========== Test Fixtures ==========

function createMockActorInitData(overrides: Partial<IActorInitData> = {}): IActorInitData {
  return {
    id: 'actor-1',
    configId: 'config-1',
    displayName: 'Test Actor',
    team: 'A',
    position: { hex: { q: 0, r: 0 } },
    attributes: { hp: 100, maxHp: 100 },
    abilities: [],
    tags: {},
    ...overrides,
  };
}

function createMockReplay(overrides: Partial<IBattleRecord> = {}): IBattleRecord {
  return {
    version: '2.0',
    meta: {
      battleId: 'battle-1',
      recordedAt: Date.now(),
      tickInterval: 100,
      totalFrames: 10,
      result: undefined,
    },
    configs: {},
    initialActors: [
      createMockActorInitData({ id: 'actor-a1', team: 'A', displayName: 'Actor A1' }),
      createMockActorInitData({ id: 'actor-b1', team: 'B', displayName: 'Actor B1' }),
    ],
    timeline: [],
    ...overrides,
  };
}

function createMockState(actors: Map<string, ActorState>): ReplayPlayerState {
  return {
    isPlaying: false,
    currentFrameIndex: 0,
    currentFrame: 0,
    speed: 1,
    actors,
    currentEvents: [],
    battleResult: null,
    turnNumber: 0,
    currentActorId: null,
  };
}

function createMockActorState(overrides: Partial<ActorState> = {}): ActorState {
  return {
    id: 'actor-1',
    displayName: 'Test Actor',
    team: 'A',
    hp: 100,
    maxHp: 100,
    position: { q: 0, r: 0 },
    isAlive: true,
    elements: [],
    ...overrides,
  };
}

// ========== createActorState Tests ==========

describe('createActorState', () => {
  it('should create actor state from init data', () => {
    const initData = createMockActorInitData({
      id: 'test-id',
      displayName: 'Test Name',
      team: 'A',
      position: { hex: { q: 1, r: 2 } },
      attributes: { hp: 80, maxHp: 100 },
    });

    const state = createActorState(initData);

    expect(state.id).toBe('test-id');
    expect(state.displayName).toBe('Test Name');
    expect(state.team).toBe('A');
    expect(state.hp).toBe(80);
    expect(state.maxHp).toBe(100);
    expect(state.position).toEqual({ q: 1, r: 2 });
    expect(state.isAlive).toBe(true);
  });

  it('should handle numeric team as B', () => {
    const initData = createMockActorInitData({ team: 2 });
    const state = createActorState(initData);
    expect(state.team).toBe('B');
  });

  it('should handle numeric team 1 as A', () => {
    const initData = createMockActorInitData({ team: 1 });
    const state = createActorState(initData);
    expect(state.team).toBe('A');
  });

  it('should default position to (0,0) when no hex provided', () => {
    const initData = createMockActorInitData({ position: undefined });
    const state = createActorState(initData);
    expect(state.position).toEqual({ q: 0, r: 0 });
  });

  it('should use hp as maxHp fallback', () => {
    const initData = createMockActorInitData({
      attributes: { hp: 50 },
    });
    const state = createActorState(initData);
    expect(state.maxHp).toBe(50);
  });
});

// ========== createInitialState Tests ==========

describe('createInitialState', () => {
  it('should create initial state from replay', () => {
    const replay = createMockReplay();
    const state = createInitialState(replay);

    expect(state.isPlaying).toBe(false);
    expect(state.currentFrameIndex).toBe(-1);
    expect(state.currentFrame).toBe(0);
    expect(state.speed).toBe(1);
    expect(state.actors.size).toBe(2);
    expect(state.currentEvents).toEqual([]);
    expect(state.battleResult).toBeNull();
    expect(state.turnNumber).toBe(0);
    expect(state.currentActorId).toBeNull();
  });

  it('should populate actors map correctly', () => {
    const replay = createMockReplay();
    const state = createInitialState(replay);

    expect(state.actors.has('actor-a1')).toBe(true);
    expect(state.actors.has('actor-b1')).toBe(true);
    expect(state.actors.get('actor-a1')?.team).toBe('A');
    expect(state.actors.get('actor-b1')?.team).toBe('B');
  });
});

// ========== getReplaySummary Tests ==========

describe('getReplaySummary', () => {
  it('should extract summary from replay', () => {
    const replay = createMockReplay({
      timeline: [
        { frame: 0, events: [] },
        { frame: 1, events: [] },
        { frame: 5, events: [] },
      ],
    });
    replay.meta.result = 'A wins';

    const summary = getReplaySummary(replay);

    expect(summary.version).toBe('2.0');
    expect(summary.battleId).toBe('battle-1');
    expect(summary.tickInterval).toBe(100);
    expect(summary.totalFrames).toBe(10);
    expect(summary.frameCount).toBe(3);
    expect(summary.actorCount).toBe(2);
    expect(summary.result).toBe('A wins');
  });
});

// ========== applyEvent Tests ==========

describe('applyEvent', () => {
  describe('move event', () => {
    it('should update actor position', () => {
      const actors = new Map([
        ['actor-1', createMockActorState({ id: 'actor-1', position: { q: 0, r: 0 } })],
      ]);
      const state = createMockState(actors);

      const newState = applyEvent(state, {
        kind: 'move',
        actorId: 'actor-1',
        fromHex: { q: 0, r: 0 },
        toHex: { q: 2, r: 3 },
      });

      expect(newState.actors.get('actor-1')?.position).toEqual({ q: 2, r: 3 });
    });

    it('should not crash for unknown actor', () => {
      const state = createMockState(new Map());
      const newState = applyEvent(state, {
        kind: 'move',
        actorId: 'unknown',
        fromHex: { q: 0, r: 0 },
        toHex: { q: 1, r: 1 },
      });
      expect(newState.actors.size).toBe(0);
    });
  });

  describe('damage event', () => {
    it('should reduce actor HP', () => {
      const actors = new Map([
        ['actor-1', createMockActorState({ id: 'actor-1', hp: 100, maxHp: 100 })],
      ]);
      const state = createMockState(actors);

      const newState = applyEvent(state, {
        kind: 'damage',
        targetActorId: 'actor-1',
        damage: 30,
        element: 'Fire',
        damageCategory: 'physical',
        effectiveness: 'normal',
        typeMultiplier: 1,
        isCritical: false,
        isSTAB: false,
      });

      expect(newState.actors.get('actor-1')?.hp).toBe(70);
    });

    it('should not reduce HP below 0', () => {
      const actors = new Map([
        ['actor-1', createMockActorState({ id: 'actor-1', hp: 20, maxHp: 100 })],
      ]);
      const state = createMockState(actors);

      const newState = applyEvent(state, {
        kind: 'damage',
        targetActorId: 'actor-1',
        damage: 50,
        element: 'Fire',
        damageCategory: 'physical',
        effectiveness: 'normal',
        typeMultiplier: 1,
        isCritical: false,
        isSTAB: false,
      });

      expect(newState.actors.get('actor-1')?.hp).toBe(0);
    });
  });

  describe('heal event', () => {
    it('should increase actor HP', () => {
      const actors = new Map([
        ['actor-1', createMockActorState({ id: 'actor-1', hp: 50, maxHp: 100 })],
      ]);
      const state = createMockState(actors);

      const newState = applyEvent(state, {
        kind: 'heal',
        targetActorId: 'actor-1',
        healAmount: 30,
      });

      expect(newState.actors.get('actor-1')?.hp).toBe(80);
    });

    it('should not exceed maxHp', () => {
      const actors = new Map([
        ['actor-1', createMockActorState({ id: 'actor-1', hp: 80, maxHp: 100 })],
      ]);
      const state = createMockState(actors);

      const newState = applyEvent(state, {
        kind: 'heal',
        targetActorId: 'actor-1',
        healAmount: 50,
      });

      expect(newState.actors.get('actor-1')?.hp).toBe(100);
    });
  });

  describe('death event', () => {
    it('should set isAlive to false', () => {
      const actors = new Map([
        ['actor-1', createMockActorState({ id: 'actor-1', isAlive: true })],
      ]);
      const state = createMockState(actors);

      const newState = applyEvent(state, {
        kind: 'death',
        actorId: 'actor-1',
      });

      expect(newState.actors.get('actor-1')?.isAlive).toBe(false);
    });
  });

  describe('turnStart event', () => {
    it('should update turn number and current actor', () => {
      const state = createMockState(new Map());

      const newState = applyEvent(state, {
        kind: 'turnStart',
        turnNumber: 5,
        actorId: 'actor-1',
      });

      expect(newState.turnNumber).toBe(5);
      expect(newState.currentActorId).toBe('actor-1');
    });
  });

  describe('battleEnd event', () => {
    it('should set battle result', () => {
      const state = createMockState(new Map());

      const newState = applyEvent(state, {
        kind: 'battleEnd',
        result: 'Team A wins',
        turnCount: 10,
        survivorIds: ['actor-a1'],
      });

      expect(newState.battleResult).toBe('Team A wins');
    });
  });

  describe('unknown event', () => {
    it('should return state unchanged', () => {
      const actors = new Map([
        ['actor-1', createMockActorState({ id: 'actor-1', hp: 100 })],
      ]);
      const state = createMockState(actors);

      const newState = applyEvent(state, {
        kind: 'unknownEventType',
        someData: 'test',
      });

      expect(newState.actors.get('actor-1')?.hp).toBe(100);
    });
  });
});

// ========== applyFrame Tests ==========

describe('applyFrame', () => {
  it('should apply all events in frame', () => {
    const actors = new Map([
      ['actor-1', createMockActorState({ id: 'actor-1', hp: 100, position: { q: 0, r: 0 } })],
    ]);
    const state = createMockState(actors);

    const frameData: IFrameData = {
      frame: 5,
      events: [
        { kind: 'move', actorId: 'actor-1', fromHex: { q: 0, r: 0 }, toHex: { q: 1, r: 1 } },
        { kind: 'damage', targetActorId: 'actor-1', damage: 20, element: 'Fire', damageCategory: 'physical', effectiveness: 'normal', typeMultiplier: 1, isCritical: false, isSTAB: false },
      ] as any,
    };

    const newState = applyFrame(state, frameData);

    expect(newState.currentFrame).toBe(5);
    expect(newState.currentEvents).toHaveLength(2);
    expect(newState.actors.get('actor-1')?.position).toEqual({ q: 1, r: 1 });
    expect(newState.actors.get('actor-1')?.hp).toBe(80);
  });

  it('should update currentFrame to frame number', () => {
    const state = createMockState(new Map());
    const frameData: IFrameData = { frame: 42, events: [] };

    const newState = applyFrame(state, frameData);

    expect(newState.currentFrame).toBe(42);
  });
});

// ========== resetToInitial Tests ==========

describe('resetToInitial', () => {
  it('should reset state to initial', () => {
    const replay = createMockReplay();
    const state = resetToInitial(replay);

    expect(state.currentFrameIndex).toBe(-1);
    expect(state.currentFrame).toBe(0);
    expect(state.battleResult).toBeNull();
    expect(state.actors.size).toBe(2);
  });
});

// ========== applyToFrameIndex Tests ==========

describe('applyToFrameIndex', () => {
  it('should apply all frames up to target index', () => {
    const replay = createMockReplay({
      initialActors: [
        createMockActorInitData({ id: 'actor-1', attributes: { hp: 100, maxHp: 100 } }),
      ],
      timeline: [
        { frame: 0, events: [{ kind: 'damage', targetActorId: 'actor-1', damage: 10 }] as any },
        { frame: 1, events: [{ kind: 'damage', targetActorId: 'actor-1', damage: 20 }] as any },
        { frame: 2, events: [{ kind: 'damage', targetActorId: 'actor-1', damage: 30 }] as any },
      ],
    });

    const state = applyToFrameIndex(replay, 1);

    expect(state.currentFrameIndex).toBe(1);
    expect(state.currentFrame).toBe(1);
    expect(state.actors.get('actor-1')?.hp).toBe(70); // 100 - 10 - 20
  });

  it('should handle target index 0', () => {
    const replay = createMockReplay({
      initialActors: [
        createMockActorInitData({ id: 'actor-1', attributes: { hp: 100, maxHp: 100 } }),
      ],
      timeline: [
        { frame: 0, events: [{ kind: 'damage', targetActorId: 'actor-1', damage: 25 }] as any },
      ],
    });

    const state = applyToFrameIndex(replay, 0);

    expect(state.currentFrameIndex).toBe(0);
    expect(state.actors.get('actor-1')?.hp).toBe(75);
  });
});

// ========== stepForward Tests ==========

describe('stepForward', () => {
  it('should advance to next frame', () => {
    const replay = createMockReplay({
      timeline: [
        { frame: 0, events: [] },
        { frame: 1, events: [] },
      ],
    });
    const initialState = createInitialState(replay);

    const state1 = stepForward(replay, initialState);
    expect(state1.currentFrameIndex).toBe(0);

    const state2 = stepForward(replay, state1);
    expect(state2.currentFrameIndex).toBe(1);
  });

  it('should stop at end of timeline', () => {
    const replay = createMockReplay({
      timeline: [{ frame: 0, events: [] }],
    });
    const state = { ...createInitialState(replay), currentFrameIndex: 0 };

    const newState = stepForward(replay, state);

    expect(newState.currentFrameIndex).toBe(0);
    expect(newState.isPlaying).toBe(false);
  });

  it('should apply frame events when stepping', () => {
    const replay = createMockReplay({
      initialActors: [
        createMockActorInitData({ id: 'actor-1', attributes: { hp: 100, maxHp: 100 } }),
      ],
      timeline: [
        { frame: 0, events: [{ kind: 'damage', targetActorId: 'actor-1', damage: 15 }] as any },
      ],
    });
    const initialState = createInitialState(replay);

    const state = stepForward(replay, initialState);

    expect(state.actors.get('actor-1')?.hp).toBe(85);
  });
});

// ========== stepBackward Tests ==========

describe('stepBackward', () => {
  it('should go back to previous frame', () => {
    const replay = createMockReplay({
      initialActors: [
        createMockActorInitData({ id: 'actor-1', attributes: { hp: 100, maxHp: 100 } }),
      ],
      timeline: [
        { frame: 0, events: [{ kind: 'damage', targetActorId: 'actor-1', damage: 10 }] as any },
        { frame: 1, events: [{ kind: 'damage', targetActorId: 'actor-1', damage: 20 }] as any },
      ],
    });

    const stateAtFrame1 = applyToFrameIndex(replay, 1);
    expect(stateAtFrame1.actors.get('actor-1')?.hp).toBe(70);

    const stateAtFrame0 = stepBackward(replay, stateAtFrame1);
    expect(stateAtFrame0.currentFrameIndex).toBe(0);
    expect(stateAtFrame0.actors.get('actor-1')?.hp).toBe(90);
  });

  it('should reset to initial when at frame 0', () => {
    const replay = createMockReplay({
      timeline: [{ frame: 0, events: [] }],
    });
    const state = { ...createInitialState(replay), currentFrameIndex: 0 };

    const newState = stepBackward(replay, state);

    expect(newState.currentFrameIndex).toBe(-1);
  });

  it('should reset to initial when at frame -1', () => {
    const replay = createMockReplay();
    const state = createInitialState(replay);

    const newState = stepBackward(replay, state);

    expect(newState.currentFrameIndex).toBe(-1);
  });
});
