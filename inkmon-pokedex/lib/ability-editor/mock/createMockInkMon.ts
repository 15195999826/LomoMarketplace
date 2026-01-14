import type { InkMon, Element } from '@inkmon/core';

export interface MockInkMonStats {
  hp?: number;
  attack?: number;
  defense?: number;
  spAttack?: number;
  spDefense?: number;
  speed?: number;
}

export interface CreateMockInkMonOptions {
  name: string;
  stats?: MockInkMonStats;
  primaryElement?: Element;
  secondaryElement?: Element | null;
}

const DEFAULT_STATS: Required<MockInkMonStats> = {
  hp: 100,
  attack: 100,
  defense: 50,
  spAttack: 100,
  spDefense: 50,
  speed: 100,
};

function calcBst(stats: Required<MockInkMonStats>): number {
  return stats.hp + stats.attack + stats.defense + stats.spAttack + stats.spDefense + stats.speed;
}

export function createMockInkMon(options: CreateMockInkMonOptions): InkMon {
  const { name, stats = {}, primaryElement = 'fire', secondaryElement = null } = options;

  const finalStats = {
    hp: stats.hp ?? DEFAULT_STATS.hp,
    attack: stats.attack ?? DEFAULT_STATS.attack,
    defense: stats.defense ?? DEFAULT_STATS.defense,
    spAttack: stats.spAttack ?? DEFAULT_STATS.spAttack,
    spDefense: stats.spDefense ?? DEFAULT_STATS.spDefense,
    speed: stats.speed ?? DEFAULT_STATS.speed,
  };

  return {
    dex_number: 0,
    name,
    name_en: name.replace(/\s+/g, ''),
    description: 'Test InkMon',
    elements: {
      primary: primaryElement,
      secondary: secondaryElement,
    },
    stats: {
      hp: finalStats.hp,
      attack: finalStats.attack,
      defense: finalStats.defense,
      sp_attack: finalStats.spAttack,
      sp_defense: finalStats.spDefense,
      speed: finalStats.speed,
      bst: calcBst(finalStats),
    },
    design: {
      base_animal: 'test',
      features: ['test'],
      color_palette: ['#FF0000'],
    },
    evolution: {
      stage: 'adult',
      evolves_from: null,
      evolves_to: [],
      evolution_method: null,
    },
    ecology: {
      habitat: 'test',
      diet: 'omnivore',
      predators: [],
      prey: [],
    },
    image_prompts: {
      design: 'test',
    },
  };
}

export function createCasterInkMon(
  stats?: MockInkMonStats,
  element?: Element
): InkMon {
  return createMockInkMon({
    name: 'Caster',
    stats: {
      hp: 1000,
      attack: 150,
      spAttack: 150,
      speed: 200,
      ...stats,
    },
    primaryElement: element ?? 'fire',
  });
}

export function createDummyInkMon(
  index: number,
  stats?: MockInkMonStats
): InkMon {
  return createMockInkMon({
    name: `Dummy${index + 1}`,
    stats: {
      hp: 500,
      defense: 30,
      spDefense: 30,
      speed: 10,
      ...stats,
    },
    primaryElement: 'water',
  });
}
