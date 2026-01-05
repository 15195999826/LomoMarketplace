/**
 * Hex ATB Battle - 入口文件
 *
 * 运行方式:
 * - pnpm dev     (watch 模式，文件改变自动重启)
 * - pnpm start   (单次运行)
 * - F5           (VS Code 调试)
 */

import { getTimelineRegistry, configureDebugLog } from '@lomo/logic-game-framework';
import { HexAtbBattleGameWorld } from './world/index.js';

// 开启调试日志（日志通过 BattleLogger 处理，需要启用框架日志）
configureDebugLog({ enabled: true, categories: [] });
import { HexBattle } from './battle/HexBattle.js';
import { SKILL_TIMELINES } from './skills/index.js';

// ============================================================
// 主程序
// ============================================================

console.log('='.repeat(50));
console.log('Hex ATB Battle - Framework Demo');
console.log('='.repeat(50));
console.log('');

// 注册技能 Timeline
getTimelineRegistry().registerAll(SKILL_TIMELINES);
console.log(`📦 已注册 ${SKILL_TIMELINES.length} 个技能 Timeline\n`);

// 初始化 GameWorld（单例模式，用 init 而不是 new）
const world = HexAtbBattleGameWorld.init({ debug: true });

// 创建战斗实例
const battle = world.createInstance(() => new HexBattle('battle-001'));

// 开始战斗
battle.start();

// 游戏主循环
const TICK_INTERVAL = 100; // 每 tick 100ms
const SLEEP_MS = 33;      // 每帧间隔

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🎮 Game Loop Started\n');

while (world.hasRunningInstances) {
  world.tickAll(TICK_INTERVAL);
  await sleep(SLEEP_MS);
}

console.log(`\n📊 Final: ${battle.logicTime}ms total`);
console.log(`📊 World instances: ${world.instanceCount}`);

// 清理
HexAtbBattleGameWorld.destroy();
