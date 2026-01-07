/**
 * Auto Turn-Based Battle - 入口文件
 *
 * 运行方式:
 * - pnpm dev     (watch 模式，文件改变自动重启)
 * - pnpm start   (单次运行)
 * - F5           (VS Code 调试)
 *
 * 回合制自走棋战斗演示：
 * - 所有角色由 AI 驱动
 * - 按速度决定行动顺序
 * - 每回合每个角色可执行多次行动（受行动点限制）
 */

import { configureDebugLog } from "@lomo/logic-game-framework";

import { TurnBasedBattleGameWorld } from "./world/index.js";
import { TurnBasedBattle } from "./battle/index.js";
import { BattleUnit } from "./actors/index.js";
import type { UnitClass } from "./config/index.js";

// ============================================================
// 配置
// ============================================================

// 开启框架调试日志
configureDebugLog({ enabled: false, categories: [] });

// ============================================================
// 辅助函数
// ============================================================

/**
 * 创建单位并设置位置
 */
function createUnit(
  unitClass: UnitClass,
  name: string,
  position: { x: number; y: number },
): BattleUnit {
  const unit = new BattleUnit(unitClass, name);
  unit.setGridPosition(position);
  return unit;
}

/**
 * 睡眠函数
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// 主程序
// ============================================================

console.log("=".repeat(60));
console.log("Auto Turn-Based Battle - Framework Demo");
console.log("回合制自走棋战斗演示");
console.log("=".repeat(60));
console.log("");

// 初始化 GameWorld
const world = TurnBasedBattleGameWorld.init({
  debug: true,
  defaultMaxRounds: 50,
  enableBattleLog: true,
});

// 创建战斗实例
const battle = world.createInstance(
  () =>
    new TurnBasedBattle("demo-battle", {
      maxRounds: 50,
      enableLog: true,
      verboseLog: true,
    }),
);

// ============================================================
// 配置队伍
// ============================================================

// 队伍 A（玩家方）- 左侧
// 配置说明：法师在前排，敌人聚集在一起，方便测试 AOE 技能（火球术）
const teamAConfig: Array<{
  class: UnitClass;
  name: string;
  pos: { x: number; y: number };
}> = [
  { class: "Mage", name: "法师-阿尔法", pos: { x: 2, y: 2 } }, // 法师在前，速度90
  { class: "Archer", name: "弓箭手-贝塔", pos: { x: 0, y: 1 } },
  { class: "Priest", name: "牧师-伽马", pos: { x: 0, y: 3 } },
];

// 队伍 B（敌方）- 右侧
// 配置说明：敌人聚集在一起（相邻格子），方便测试 AOE 伤害
const teamBConfig: Array<{
  class: UnitClass;
  name: string;
  pos: { x: number; y: number };
}> = [
  { class: "Warrior", name: "战士-德尔塔", pos: { x: 5, y: 2 } }, // 中心位置
  { class: "Warrior", name: "战士-艾普西隆", pos: { x: 5, y: 3 } }, // 相邻（AOE 半径 1）
  { class: "Archer", name: "弓箭手-泽塔", pos: { x: 6, y: 2 } }, // 相邻（AOE 半径 1）
];

// 创建并添加单位
console.log("📦 创建战斗单位...");

for (const config of teamAConfig) {
  const unit = createUnit(config.class, config.name, config.pos);
  battle.addToTeamA(unit);
}

for (const config of teamBConfig) {
  const unit = createUnit(config.class, config.name, config.pos);
  battle.addToTeamB(unit);
}

console.log(`   🔵 队伍 A: ${teamAConfig.length} 个单位`);
console.log(`   🔴 队伍 B: ${teamBConfig.length} 个单位`);
console.log("");

// ============================================================
// 开始战斗
// ============================================================

battle.start();

// ============================================================
// 游戏主循环
// ============================================================

const TICK_INTERVAL = 100; // 每 tick 100ms 逻辑时间
const SLEEP_MS = 10; // 每帧实际等待时间（加快演示速度）

console.log("🎮 开始战斗循环\n");

while (world.hasRunningInstances) {
  world.tickAll(TICK_INTERVAL);
  await sleep(SLEEP_MS);
}

// ============================================================
// 战斗结束
// ============================================================

console.log("");
console.log("=".repeat(60));
console.log("📊 战斗统计");
console.log("=".repeat(60));
console.log(`   总回合数: ${battle.round}`);
console.log(`   战斗结果: ${battle.battleResult}`);
console.log(
  `   队伍 A 存活: ${battle.teamA.filter((u) => u.hp > 0).length}/${battle.teamA.length}`,
);
console.log(
  `   队伍 B 存活: ${battle.teamB.filter((u) => u.hp > 0).length}/${battle.teamB.length}`,
);
console.log("");

// 输出存活单位详情
const aliveA = battle.teamA.filter((u) => u.hp > 0);
const aliveB = battle.teamB.filter((u) => u.hp > 0);

if (aliveA.length > 0) {
  console.log("🔵 队伍 A 存活者:");
  for (const unit of aliveA) {
    console.log(`   - ${unit.displayName}: HP ${unit.hp}/${unit.maxHp}`);
  }
}

if (aliveB.length > 0) {
  console.log("🔴 队伍 B 存活者:");
  for (const unit of aliveB) {
    console.log(`   - ${unit.displayName}: HP ${unit.hp}/${unit.maxHp}`);
  }
}

console.log("");
console.log("=".repeat(60));
console.log("🏁 演示结束");
console.log("=".repeat(60));

// 清理
TurnBasedBattleGameWorld.destroy();
