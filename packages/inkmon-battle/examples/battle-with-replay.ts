/**
 * 战斗回放示例
 *
 * 演示使用新的 InkMonBattle API 进行战斗并导出回放
 *
 * 新版本使用实时战斗模式（与 HexBattle 一致）：
 * - ATB 由 Actor 内部管理
 * - AI 决策在 tick() 中自动执行
 * - 使用 runInkMonBattle() 一次性运行完整战斗
 */

import type { InkMon } from "@inkmon/core";
import {
  runInkMonBattle,
  ReplayLogPrinter,
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

function runBattleWithReplay(): void {
  console.log("🎮 运行 InkMon 战斗...\n");

  // 使用 runInkMonBattle 一次性运行完整战斗
  // AI 决策在 tick() 中自动执行（实时战斗模式）
  const replay = runInkMonBattle(
    // 队伍 A
    [mockFireFox, mockGrassSnake],
    // 队伍 B
    [mockWaterTurtle, mockDragonfly],
    // 配置
    {
      mapWidth: 9,
      mapHeight: 9,
      maxTurns: 50,
      deterministicMode: false,
      tickInterval: 100,
    }
  );

  console.log(`\n🎥 回放数据:`);
  console.log(`   战斗 ID: ${replay.meta.battleId}`);
  console.log(`   总帧数: ${replay.meta.totalFrames}`);
  console.log(`   初始单位数: ${replay.initialActors.length}`);
  console.log(`   时间线条目数: ${replay.timeline.length}`);
  console.log(`   结束原因: ${replay.meta.result ?? 'N/A'}`);

  // 打印回放日志摘要
  console.log("\n📋 回放日志摘要:");
  console.log("-".repeat(50));
  const log = ReplayLogPrinter.print(replay);
  const lines = log.split("\n");
  // 只打印前 30 行
  const preview = lines.slice(0, 30).join("\n");
  console.log(preview);
  if (lines.length > 30) {
    console.log(`\n... (共 ${lines.length} 行)`);
  }

  // 输出回放 JSON（前 2000 字符）
  console.log("\n📦 回放 JSON 预览:");
  console.log("-".repeat(50));
  const json = JSON.stringify(replay, null, 2);
  console.log(json.slice(0, 2000));
  if (json.length > 2000) {
    console.log(`\n... (共 ${json.length} 字符)`);
  }

  console.log("\n✅ 战斗完成！");
}

// 运行
runBattleWithReplay();
