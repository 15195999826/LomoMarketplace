/**
 * check-replay-events.ts - 检查录像中的事件类型
 *
 * 运行: npx tsx debug/check-replay-events.ts
 *
 * 功能:
 * - 统计录像中各事件类型的数量
 * - 按帧显示事件详情
 * - 验证事件结构是否正确
 */

import type { InkMon } from "@inkmon/core";
import type { IBattleRecord } from "@lomo/logic-game-framework/stdlib";
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

// ========== 分析函数 ==========

interface EventStats {
  kind: string;
  count: number;
  samples: unknown[];
}

function analyzeReplay(replay: IBattleRecord): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 录像事件分析");
  console.log("=".repeat(60));

  // 基本信息
  console.log(`\n📋 录像信息:`);
  console.log(`  版本: ${replay.version}`);
  console.log(`  战斗ID: ${replay.meta.battleId}`);
  console.log(`  总帧数: ${replay.meta.totalFrames}`);
  console.log(`  Tick间隔: ${replay.meta.tickInterval}ms`);
  console.log(`  结果: ${replay.meta.result}`);
  console.log(`  参战单位: ${replay.initialActors.length}`);

  // 统计事件类型
  const eventStats = new Map<string, EventStats>();

  replay.timeline.forEach((frame) => {
    frame.events.forEach((event) => {
      const kind = event.kind;
      if (!eventStats.has(kind)) {
        eventStats.set(kind, { kind, count: 0, samples: [] });
      }
      const stats = eventStats.get(kind)!;
      stats.count++;
      // 保留前3个样本
      if (stats.samples.length < 3) {
        stats.samples.push(event);
      }
    });
  });

  // 按数量排序输出
  console.log(`\n📈 事件类型统计:`);
  const sorted = Array.from(eventStats.values()).sort((a, b) => b.count - a.count);
  for (const stats of sorted) {
    console.log(`  ${stats.kind}: ${stats.count}`);
  }

  // 检查关键事件
  console.log(`\n🔍 关键事件检查:`);

  const hasStageCue = eventStats.has("stageCue");
  const hasExecutionActivated = eventStats.has("executionActivated");
  const hasAbilityTriggered = eventStats.has("abilityTriggered");
  const hasDamage = eventStats.has("damage");
  const hasMoveStart = eventStats.has("move_start");

  console.log(`  stageCue: ${hasStageCue ? "✅" : "❌"} (${eventStats.get("stageCue")?.count ?? 0}) ← 攻击动画提示`);
  console.log(`  executionActivated: ${hasExecutionActivated ? "✅" : "❌"} (${eventStats.get("executionActivated")?.count ?? 0})`);
  console.log(`  abilityTriggered: ${hasAbilityTriggered ? "✅" : "❌"} (${eventStats.get("abilityTriggered")?.count ?? 0})`);
  console.log(`  damage: ${hasDamage ? "✅" : "❌"} (${eventStats.get("damage")?.count ?? 0})`);
  console.log(`  move_start: ${hasMoveStart ? "✅" : "❌"} (${eventStats.get("move_start")?.count ?? 0})`);

  // 显示 stageCue 样本（最重要，用于触发动画）
  if (hasStageCue) {
    console.log(`\n📝 stageCue 样本（用于播放动画）:`);
    const samples = eventStats.get("stageCue")!.samples;
    samples.forEach((sample, i) => {
      console.log(`  [${i + 1}] ${JSON.stringify(sample, null, 2).split("\n").join("\n      ")}`);
    });
  }

  // 显示 executionActivated 样本
  if (hasExecutionActivated) {
    console.log(`\n📝 executionActivated 样本:`);
    const samples = eventStats.get("executionActivated")!.samples;
    samples.forEach((sample, i) => {
      console.log(`  [${i + 1}] ${JSON.stringify(sample, null, 2).split("\n").join("\n      ")}`);
    });
  }

  // 显示帧时间线摘要
  console.log(`\n⏱️ 帧时间线 (前20帧):`);
  const framesToShow = replay.timeline.slice(0, 20);
  for (const frame of framesToShow) {
    const eventKinds = frame.events.map((e) => e.kind).join(", ");
    console.log(`  帧 ${frame.frame}: ${eventKinds || "(空)"}`);
  }

  if (replay.timeline.length > 20) {
    console.log(`  ... 还有 ${replay.timeline.length - 20} 帧`);
  }

  console.log("\n" + "=".repeat(60));
}

// ========== 主程序 ==========

function main(): void {
  console.log("🚀 开始运行战斗...\n");

  const replay = runInkMonBattle([mockFireFox], [mockWaterTurtle], {
    maxTurns: 30,
  });

  analyzeReplay(replay);
}

main();
