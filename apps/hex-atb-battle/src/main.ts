/**
 * Hex ATB Battle - 入口文件
 *
 * 运行方式:
 * - pnpm dev     (watch 模式，文件改变自动重启)
 * - pnpm start   (单次运行)
 * - F5           (VS Code 调试)
 */

import {
  AbilitySet,
  Actor,
  AttributeSet,
  GameWorld,
  GameplayInstance,
  createAbilitySet,
  defineAttributes,
  type GameEventBase,
} from '@lomo/logic-game-framework';

// ============================================================
// 1. 创建自定义的 GameplayInstance 子类
// ============================================================
const CharacterAttributeSet = {
  hp: { baseValue: 100, minValue: 0 },
  maxHp: { baseValue: 100, minValue: 1 },
  atk: { baseValue: 50 },
  def: { baseValue: 30 },
  speed: { baseValue: 100 },
} as const;


class CharacterActor extends Actor {
  readonly type = 'Character';

  readonly attributeSet: AttributeSet<typeof CharacterAttributeSet>
  readonly abilitySet: AbilitySet<typeof CharacterAttributeSet>

  constructor(name: string) {
    super();

    this._displayName = name;
    this.attributeSet = defineAttributes(CharacterAttributeSet);

    // 创建能力集（需要传入 ActorRef 和属性集）
    this.abilitySet = createAbilitySet(this.toRef(), this.attributeSet);
  }
}

class HexBattle extends GameplayInstance {
  // 必须定义 type
  readonly type = 'HexBattle';

  private tickCount = 0;

  // 必须实现 advance 方法
  advance(dt: number): GameEventBase[] {
    // 调用基类实现（更新 logicTime、执行 System、Actor tick）
    const events = this.baseAdvance(dt);

    this.tickCount++;
    console.log(`[Tick ${this.tickCount}] logicTime: ${this.logicTime}ms`);

    // 每 5 tick 输出一次
    if (this.tickCount % 5 === 0) {
      console.log(`  -> 每 5 tick 触发一次`);
    }

    // 10 tick 后结束
    if (this.tickCount >= 10) {
      console.log('\n✅ 战斗结束');
      this.end();
    }

    return events;
  }
}



// ============================================================
// 2. 主程序
// ============================================================

console.log('='.repeat(50));
console.log('Hex ATB Battle - Framework Demo');
console.log('='.repeat(50));
console.log('');

// 初始化 GameWorld（单例模式，用 init 而不是 new）
const world = GameWorld.init({ debug: true });

// 创建战斗实例
const battle = world.createInstance(() => new HexBattle('battle-001'));

// 开始战斗
battle.start();

// 游戏主循环
const TICK_INTERVAL = 100; // 每 tick 100ms

console.log('🎮 Game Loop Started\n');

while (battle.isRunning) {
  battle.advance(TICK_INTERVAL);
}

console.log(`\n📊 Final: ${battle.logicTime}ms total`);
console.log(`📊 World instances: ${world.instanceCount}`);

// 清理
GameWorld.destroy();
