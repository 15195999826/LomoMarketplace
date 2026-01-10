/**
 * export-replay-json.ts - 导出战斗录像为 JSON 文件
 *
 * 运行: npx tsx debug/export-replay-json.ts [输出文件名]
 *
 * 示例:
 *   npx tsx debug/export-replay-json.ts           # 输出到 debug/replay.json
 *   npx tsx debug/export-replay-json.ts test.json # 输出到 debug/test.json
 */

import * as fs from "fs";
import * as path from "path";
import type { InkMon } from "@inkmon/core";
import { runInkMonBattle } from "../src/index.js";

// ========== Mock 数据 ==========

const mockFireFox: InkMon = {
  name: "烈焰狐",
  name_en: "Flamefox",
  dex_number: 1,
  description: "火属性的小狐狸",
  elements: { primary: "fire", secondary: null },
  stats: { hp: 75, attack: 90, defense: 60, sp_attack: 110, sp_defense: 70, speed: 100, bst: 505 },
  design: { base_animal: "fox", features: [], color_palette: [] },
  evolution: { stage: "mature", evolves_from: null, evolves_to: [], evolution_method: null },
  ecology: { habitat: "volcano", diet: "omnivore", predators: [], prey: [] },
  image_prompts: { design: "test" },
};

const mockWaterTurtle: InkMon = {
  name: "碧波龟",
  name_en: "Aquaturtle",
  dex_number: 2,
  description: "水属性的乌龟",
  elements: { primary: "water", secondary: null },
  stats: { hp: 100, attack: 70, defense: 120, sp_attack: 80, sp_defense: 110, speed: 50, bst: 530 },
  design: { base_animal: "turtle", features: [], color_palette: [] },
  evolution: { stage: "mature", evolves_from: null, evolves_to: [], evolution_method: null },
  ecology: { habitat: "ocean", diet: "herbivore", predators: [], prey: [] },
  image_prompts: { design: "test" },
};

// ========== 主程序 ==========

function main(): void {
  const outputFile = process.argv[2] ?? "replay.json";
  const outputPath = path.join(import.meta.dirname ?? __dirname, outputFile);

  console.log("🚀 开始运行战斗...\n");

  const replay = runInkMonBattle([mockFireFox], [mockWaterTurtle], {
    maxTurns: 30,
  });

  // 写入文件
  fs.writeFileSync(outputPath, JSON.stringify(replay, null, 2), "utf-8");

  console.log(`\n✅ 录像已导出到: ${outputPath}`);
  console.log(`   文件大小: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
  console.log(`   总帧数: ${replay.timeline.length}`);
  console.log(`   事件总数: ${replay.timeline.reduce((sum, f) => sum + f.events.length, 0)}`);
}

main();
