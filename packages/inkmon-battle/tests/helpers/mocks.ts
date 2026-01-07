/**
 * 测试辅助工具和 Mock 数据
 */

import type { InkMon, Element } from '@inkmon/core';
import {
  EventCollector,
  GameWorld,
  createExecutionContext,
  type ExecutionContext,
  type ActorRef,
} from '@lomo/logic-game-framework';

import { InkMonActor, createInkMonActor } from '../../src/actors/InkMonActor.js';

// ========== Mock InkMon 数据 ==========

/** 创建 Mock InkMon 数据 */
export function createMockInkMon(
  overrides: Partial<InkMon> & { name_en: string } = { name_en: 'TestMon' }
): InkMon {
  return {
    name: '测试怪',
    name_en: overrides.name_en,
    dex_number: 1,
    description: '测试用 InkMon',
    elements: {
      primary: 'fire',
      secondary: null,
      ...overrides.elements,
    },
    stats: {
      hp: 100,
      attack: 100,
      defense: 100,
      sp_attack: 100,
      sp_defense: 100,
      speed: 100,
      bst: 600,
      ...overrides.stats,
    },
    design: {
      base_animal: 'test',
      features: ['test'],
      color_palette: ['#FF0000'],
      ...overrides.design,
    },
    evolution: {
      stage: 'adult',
      evolves_from: null,
      evolves_to: [],
      evolution_method: null,
      ...overrides.evolution,
    },
    ecology: {
      habitat: 'test',
      diet: 'omnivore',
      predators: [],
      prey: [],
      ...overrides.ecology,
    },
    image_prompts: {
      design: 'test',
      ...overrides.image_prompts,
    },
    ...overrides,
  } as InkMon;
}

/** 火系 InkMon */
export function createFireInkMon(): InkMon {
  return createMockInkMon({
    name_en: 'Flamander',
    name: '火蜥蜴',
    elements: { primary: 'fire', secondary: null },
    stats: {
      hp: 80,
      attack: 120,
      defense: 80,
      sp_attack: 100,
      sp_defense: 80,
      speed: 100,
      bst: 560,
    },
  });
}

/** 水系 InkMon */
export function createWaterInkMon(): InkMon {
  return createMockInkMon({
    name_en: 'Aquadragon',
    name: '水龙',
    elements: { primary: 'water', secondary: null },
    stats: {
      hp: 100,
      attack: 80,
      defense: 100,
      sp_attack: 120,
      sp_defense: 100,
      speed: 80,
      bst: 580,
    },
  });
}

/** 草/飞双属性 InkMon */
export function createGrassFlyingInkMon(): InkMon {
  return createMockInkMon({
    name_en: 'Leafbird',
    name: '叶翼鸟',
    elements: { primary: 'grass', secondary: 'flying' },
    stats: {
      hp: 70,
      attack: 90,
      defense: 70,
      sp_attack: 110,
      sp_defense: 80,
      speed: 120,
      bst: 540,
    },
  });
}

/** 地面系 InkMon (电免疫) */
export function createGroundInkMon(): InkMon {
  return createMockInkMon({
    name_en: 'Sandmole',
    name: '沙鼹',
    elements: { primary: 'ground', secondary: null },
    stats: {
      hp: 110,
      attack: 100,
      defense: 120,
      sp_attack: 60,
      sp_defense: 80,
      speed: 70,
      bst: 540,
    },
  });
}

/** 钢系 InkMon (毒免疫) */
export function createSteelInkMon(): InkMon {
  return createMockInkMon({
    name_en: 'Ironbeast',
    name: '铁兽',
    elements: { primary: 'steel', secondary: null },
    stats: {
      hp: 90,
      attack: 100,
      defense: 140,
      sp_attack: 60,
      sp_defense: 100,
      speed: 50,
      bst: 540,
    },
  });
}

// ========== Mock GameplayState ==========

/**
 * Mock GameplayState - 模拟战斗状态
 */
export class MockGameplayState {
  private actors: Map<string, InkMonActor> = new Map();

  addActor(actor: InkMonActor): void {
    this.actors.set(actor.id, actor);
  }

  getActor(id: string): InkMonActor | undefined {
    return this.actors.get(id);
  }

  get aliveActors(): InkMonActor[] {
    return Array.from(this.actors.values()).filter((a) => a.hp > 0);
  }

  getAllActors(): InkMonActor[] {
    return Array.from(this.actors.values());
  }
}

// ========== Test Context Helpers ==========

/**
 * 初始化测试环境
 * 在每个测试文件的 beforeEach 中调用
 */
export function setupTestEnvironment(): void {
  // 确保 GameWorld 已初始化
  try {
    GameWorld.getInstance();
  } catch {
    GameWorld.init({ debug: false });
  }
}

/**
 * 清理测试环境
 * 在每个测试文件的 afterEach 中调用
 */
export function cleanupTestEnvironment(): void {
  GameWorld.destroy();
}

/**
 * 创建测试用 ExecutionContext
 */
export function createTestContext(options: {
  gameplayState: MockGameplayState;
  ability?: {
    id: string;
    configId: string;
    owner: ActorRef;
    source: ActorRef;
  };
}): ExecutionContext {
  const eventCollector = new EventCollector();

  return createExecutionContext({
    eventChain: [{ kind: 'test_trigger' }],
    gameplayState: options.gameplayState,
    eventCollector,
    ability: options.ability,
  });
}

/**
 * 创建简单的测试上下文（带攻击者和目标）
 */
export function createSimpleBattleContext(
  attacker: InkMonActor,
  target: InkMonActor
): { ctx: ExecutionContext; state: MockGameplayState } {
  const state = new MockGameplayState();
  state.addActor(attacker);
  state.addActor(target);

  const ctx = createTestContext({
    gameplayState: state,
    ability: {
      id: 'test-ability',
      configId: 'test-ability-config',
      owner: attacker.toRef(),
      source: attacker.toRef(),
    },
  });

  return { ctx, state };
}
