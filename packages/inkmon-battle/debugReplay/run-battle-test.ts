/**
 * Debug test for runInkMonBattle
 *
 * 运行战斗测试并将录像保存到 debugReplay 目录
 *
 * 运行命令: pnpm debug:test
 * 或: cd packages/inkmon-battle && pnpm debug:test
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import type { InkMon } from '@inkmon/core';
import { runInkMonBattle } from '../src/InkMonBattle.js';

// ========== Mock InkMon 数据 ==========

/** 创建 Mock InkMon 数据 */
function createMockInkMon(overrides: Partial<InkMon> = {}): InkMon {
  return {
    name: '测试怪',
    name_en: overrides.name_en ?? 'TestMon',
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
function createFireInkMon(): InkMon {
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
function createWaterInkMon(): InkMon {
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

/** 草系 InkMon */
function createGrassInkMon(): InkMon {
  return createMockInkMon({
    name_en: 'Leafbug',
    name: '草虫',
    elements: { primary: 'grass', secondary: null },
    stats: {
      hp: 90,
      attack: 70,
      defense: 80,
      sp_attack: 110,
      sp_defense: 90,
      speed: 90,
      bst: 540,
    },
  });
}

/** 电系 InkMon */
function createElectricInkMon(): InkMon {
  return createMockInkMon({
    name_en: 'Sparkmouse',
    name: '电鼠',
    elements: { primary: 'electric', secondary: null },
    stats: {
      hp: 70,
      attack: 80,
      defense: 70,
      sp_attack: 120,
      sp_defense: 80,
      speed: 130,
      bst: 550,
    },
  });
}

// ========== 运行测试 ==========

async function main() {
  console.log('🎮 开始战斗测试...\n');

  // 创建队伍
  const teamA: InkMon[] = [
    createFireInkMon(),    // 火蜥蜴
    createElectricInkMon(), // 电鼠
  ];

  const teamB: InkMon[] = [
    createWaterInkMon(),   // 水龙
    createGrassInkMon(),   // 草虫
  ];

  console.log('🔵 队伍 A:');
  teamA.forEach(m => console.log(`  - ${m.name} (${m.name_en}) [${m.elements.primary}]`));

  console.log('\n🔴 队伍 B:');
  teamB.forEach(m => console.log(`  - ${m.name} (${m.name_en}) [${m.elements.primary}]`));

  console.log('\n⚔️  开始战斗...\n');

  // 运行战斗
  const replay = runInkMonBattle(teamA, teamB, {
    battleId: 'debug-test-' + Date.now(),
    mapWidth: 7,
    mapHeight: 7,
    maxTurns: 50,
    deterministicMode: false, // 启用随机
    tickInterval: 100,
  });

  // 输出结果
  console.log('📊 战斗结果:');
  console.log(`  战斗ID: ${replay.meta.battleId}`);
  console.log(`  结果: ${replay.meta.result}`);
  console.log(`  总帧数: ${replay.meta.totalFrames}`);
  console.log(`  总事件数: ${replay.timeline.reduce((sum, f) => sum + f.events.length, 0)}`);

  // 保存录像
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const outputDir = __dirname;
  const outputFile = join(outputDir, `replay-${Date.now()}.json`);

  // 确保目录存在
  await mkdir(outputDir, { recursive: true });

  // 写入文件
  await writeFile(outputFile, JSON.stringify(replay, null, 2), 'utf-8');

  console.log(`\n✅ 录像已保存到: ${outputFile}`);
}

main().catch(console.error);
