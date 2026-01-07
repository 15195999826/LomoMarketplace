/**
 * 3v3 完整战斗测试
 *
 * 演示六边形网格 ATB 战斗系统
 */

import type { InkMon } from "@inkmon/core";
import { resetIdCounter } from "@lomo/logic-game-framework";
import {
  HexBattleInstance,
  createInkMonUnit,
  SimpleAI,
  axial,
} from "../src/index.js";

// ========== Mock InkMon 数据 ==========

const mockFireFox: InkMon = {
  name: "烈焰狐",
  name_en: "Flamefox",
  dex_number: 1,
  description: "火属性的小狐狸",
  elements: { primary: "fire", secondary: null },
  stats: {
    hp: 75,
    attack: 90,
    defense: 60,
    sp_attack: 110,
    sp_defense: 70,
    speed: 100,
    bst: 505,
  },
  design: {
    base_animal: "fox",
    features: ["flame tail"],
    color_palette: ["#FF4500", "#FFD700", "#FFA500", "#FF6347", "#DC143C"],
  },
  evolution: {
    stage: "mature",
    evolves_from: null,
    evolves_to: [],
    evolution_method: null,
  },
  ecology: {
    habitat: "volcano",
    diet: "omnivore",
    predators: [],
    prey: [],
  },
  image_prompts: {
    design:
      "low poly faceted sharp edges ink sketch texture non-reflective surface",
  },
};

const mockWaterTurtle: InkMon = {
  name: "碧波龟",
  name_en: "Aquaturtle",
  dex_number: 2,
  description: "水属性的乌龟",
  elements: { primary: "water", secondary: null },
  stats: {
    hp: 100,
    attack: 70,
    defense: 120,
    sp_attack: 80,
    sp_defense: 110,
    speed: 50,
    bst: 530,
  },
  design: {
    base_animal: "turtle",
    features: ["water shell"],
    color_palette: ["#00BFFF", "#1E90FF", "#4169E1", "#0000CD", "#00008B"],
  },
  evolution: {
    stage: "mature",
    evolves_from: null,
    evolves_to: [],
    evolution_method: null,
  },
  ecology: {
    habitat: "ocean",
    diet: "herbivore",
    predators: [],
    prey: [],
  },
  image_prompts: {
    design:
      "low poly faceted sharp edges ink sketch texture non-reflective surface",
  },
};

const mockGrassSnake: InkMon = {
  name: "翠叶蛇",
  name_en: "Vinesnake",
  dex_number: 3,
  description: "草属性的蛇",
  elements: { primary: "grass", secondary: null },
  stats: {
    hp: 80,
    attack: 85,
    defense: 70,
    sp_attack: 95,
    sp_defense: 75,
    speed: 90,
    bst: 495,
  },
  design: {
    base_animal: "snake",
    features: ["leaf pattern"],
    color_palette: ["#228B22", "#32CD32", "#7CFC00", "#ADFF2F", "#006400"],
  },
  evolution: {
    stage: "mature",
    evolves_from: null,
    evolves_to: [],
    evolution_method: null,
  },
  ecology: {
    habitat: "forest",
    diet: "carnivore",
    predators: [],
    prey: [],
  },
  image_prompts: {
    design:
      "low poly faceted sharp edges ink sketch texture non-reflective surface",
  },
};

const mockElectricMouse: InkMon = {
  name: "雷电鼠",
  name_en: "Sparkmouse",
  dex_number: 4,
  description: "电属性的老鼠",
  elements: { primary: "electric", secondary: null },
  stats: {
    hp: 65,
    attack: 75,
    defense: 55,
    sp_attack: 100,
    sp_defense: 65,
    speed: 110,
    bst: 470,
  },
  design: {
    base_animal: "mouse",
    features: ["electric cheeks"],
    color_palette: ["#FFD700", "#FFA500", "#FF8C00", "#FFE4B5", "#FFFF00"],
  },
  evolution: {
    stage: "mature",
    evolves_from: null,
    evolves_to: [],
    evolution_method: null,
  },
  ecology: {
    habitat: "power plant",
    diet: "omnivore",
    predators: [],
    prey: [],
  },
  image_prompts: {
    design:
      "low poly faceted sharp edges ink sketch texture non-reflective surface",
  },
};

const mockIceBear: InkMon = {
  name: "冰霜熊",
  name_en: "Frostbear",
  dex_number: 5,
  description: "冰属性的熊",
  elements: { primary: "ice", secondary: null },
  stats: {
    hp: 110,
    attack: 100,
    defense: 90,
    sp_attack: 70,
    sp_defense: 80,
    speed: 45,
    bst: 495,
  },
  design: {
    base_animal: "bear",
    features: ["ice crystals"],
    color_palette: ["#E0FFFF", "#B0E0E6", "#87CEEB", "#ADD8E6", "#AFEEEE"],
  },
  evolution: {
    stage: "mature",
    evolves_from: null,
    evolves_to: [],
    evolution_method: null,
  },
  ecology: {
    habitat: "arctic",
    diet: "carnivore",
    predators: [],
    prey: [],
  },
  image_prompts: {
    design:
      "low poly faceted sharp edges ink sketch texture non-reflective surface",
  },
};

const mockDragonfly: InkMon = {
  name: "烈焰翼龙",
  name_en: "Infernodrake",
  dex_number: 6,
  description: "龙火双属性的飞龙",
  elements: { primary: "dragon", secondary: "fire" },
  stats: {
    hp: 85,
    attack: 105,
    defense: 75,
    sp_attack: 95,
    sp_defense: 70,
    speed: 95,
    bst: 525,
  },
  design: {
    base_animal: "dragon",
    features: ["flame wings"],
    color_palette: ["#FF4500", "#8B0000", "#FF6347", "#DC143C", "#B22222"],
  },
  evolution: {
    stage: "adult",
    evolves_from: null,
    evolves_to: [],
    evolution_method: null,
  },
  ecology: {
    habitat: "mountain",
    diet: "carnivore",
    predators: [],
    prey: [],
  },
  image_prompts: {
    design:
      "low poly faceted sharp edges ink sketch texture non-reflective surface",
  },
};

// ========== 运行战斗 ==========

function runBattle(): void {
  // 重置 ID 计数器
  resetIdCounter();

  // 创建战斗实例
  const battle = new HexBattleInstance({
    gridWidth: 11,
    gridHeight: 11,
    maxTurns: 200,
    logLevel: "full",
  });

  // 创建队伍 A 单位
  const teamA = [
    createInkMonUnit(mockFireFox, "A", { level: 50 }),
    createInkMonUnit(mockGrassSnake, "A", { level: 50 }),
    createInkMonUnit(mockIceBear, "A", { level: 50 }),
  ];

  // 创建队伍 B 单位
  const teamB = [
    createInkMonUnit(mockWaterTurtle, "B", { level: 50 }),
    createInkMonUnit(mockElectricMouse, "B", { level: 50 }),
    createInkMonUnit(mockDragonfly, "B", { level: 50 }),
  ];

  // 放置队伍 A（左侧，中间区域）
  battle.addUnit(teamA[0], axial(2, 2));
  battle.addUnit(teamA[1], axial(2, 4));
  battle.addUnit(teamA[2], axial(2, 6));

  // 放置队伍 B（右侧，中间区域）
  battle.addUnit(teamB[0], axial(7, 2));
  battle.addUnit(teamB[1], axial(7, 4));
  battle.addUnit(teamB[2], axial(7, 6));

  // 开始战斗
  battle.start();

  // 创建 AI 并运行战斗
  const ai = new SimpleAI(battle);
  const steps = ai.runUntilEnd(500);

  // 输出战斗日志
  const log = battle.getFullLog();
  console.log(log);

  // 输出战斗统计
  console.log(`\n=== 战斗统计 ===`);
  console.log(`总回合数: ${battle.turnCount}`);
  console.log(`AI 执行步数: ${steps}`);
  console.log(`战斗结果: ${battle.result}`);
}

// 运行
runBattle();
