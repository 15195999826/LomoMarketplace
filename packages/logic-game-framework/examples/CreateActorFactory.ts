/**
 * createActor 工厂方法示例
 *
 * 展示如何使用 createActor 便捷地创建并注册 Actor。
 *
 * 要点：
 * 1. createActor 将 new + addActor 合为一步
 * 2. factory 函数立即执行，闭包捕获是安全的
 * 3. 返回正确的类型，无需类型断言
 *
 * 运行方式（需要先 build）：
 * ```bash
 * pnpm build
 * node --experimental-strip-types --no-warnings examples/CreateActorFactory.ts
 * ```
 */

// 使用编译后的 dist 路径，以便直接运行 .ts 文件
import { Actor } from '../dist/core/entity/Actor.js';
import { GameplayInstance } from '../dist/core/world/GameplayInstance.js';
import type { GameEventBase } from '../dist/core/events/GameEvent.js';

// ============================================================
// 定义一个简单的 BattleUnit
// ============================================================

class BattleUnit extends Actor {
  readonly type = 'BattleUnit';
  name: string;
  level: number;
  hp: number;
  atk: number;

  constructor(name: string, level: number = 1) {
    super();
    this.name = name;
    this.level = level;
    this.hp = 100 + level * 10;
    this.atk = 10 + level * 2;
    this._displayName = name;
  }
}

// ============================================================
// 定义一个简单的 GameplayInstance
// ============================================================

class SimpleBattle extends GameplayInstance {
  readonly type = 'SimpleBattle';

  tick(dt: number): GameEventBase[] {
    return this.baseTick(dt);
  }
}

// ============================================================
// 示例用法
// ============================================================

function example() {
  const battle = new SimpleBattle();
  battle.start();

  // ----------------------------------------
  // 基础用法：创建单个 Actor
  // ----------------------------------------
  const hero = battle.createActor(() => new BattleUnit('勇者', 10));

  console.log('=== 基础用法 ===');
  console.log(`创建了: ${hero.name}, Lv.${hero.level}, HP:${hero.hp}`);
  // TypeScript 正确推断 hero 是 BattleUnit 类型

  // ----------------------------------------
  // 带配置：在 factory 中设置属性
  // ----------------------------------------
  const boss = battle.createActor(() => {
    const unit = new BattleUnit('魔王', 50);
    unit.team = 'enemy';
    unit.position = { x: 10, y: 0 };
    return unit;
  });

  console.log('\n=== 带配置 ===');
  console.log(`创建了: ${boss.name}, 队伍:${boss.team}, 位置:`, boss.position);

  // ----------------------------------------
  // 闭包捕获：使用外部变量
  // ----------------------------------------
  const names = ['哥布林', '兽人', '巨魔'];
  const levels = [3, 5, 8];

  console.log('\n=== 闭包捕获 ===');
  names.forEach((name, index) => {
    const level = levels[index];
    const enemy = battle.createActor(() => {
      const unit = new BattleUnit(name, level);
      unit.team = 'enemy';
      return unit;
    });
    console.log(`创建了: ${enemy.name}, Lv.${enemy.level}`);
  });

  // ----------------------------------------
  // 批量创建：使用 map
  // ----------------------------------------
  interface UnitConfig {
    name: string;
    level: number;
    team: string;
  }

  const configs: UnitConfig[] = [
    { name: '战士', level: 5, team: 'player' },
    { name: '法师', level: 5, team: 'player' },
    { name: '牧师', level: 5, team: 'player' },
  ];

  const party = configs.map((config) =>
    battle.createActor(() => {
      const unit = new BattleUnit(config.name, config.level);
      unit.team = config.team;
      return unit;
    })
  );

  console.log('\n=== 批量创建 ===');
  party.forEach((unit) => {
    console.log(`队伍成员: ${unit.name}, 队伍:${unit.team}`);
  });

  // ----------------------------------------
  // 验证所有 Actor 都已注册
  // ----------------------------------------
  console.log('\n=== 已注册的 Actor ===');
  console.log(`总数: ${battle.actorCount}`);
  battle.getActors().forEach((actor) => {
    console.log(`  - ${actor.displayName} (${actor.team ?? 'no team'})`);
  });

  battle.end();
}

// 运行示例
example();
