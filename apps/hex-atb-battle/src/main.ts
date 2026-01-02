/**
 * Hex ATB Battle - 入口文件
 *
 * 运行方式:
 * - pnpm dev     (watch 模式，文件改变自动重启)
 * - pnpm start   (单次运行)
 * - F5           (VS Code 调试)
 */

/**
 *  ts语法笔记
 * 1. readonly 用于赋值一次后不应再改变的值
 * 2. 声明成员变量时, !: 中间不要有空格
 */

import {
  AbilitySet,
  Actor,
  ActorRef,
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

  readonly attributeSet: AttributeSet<typeof CharacterAttributeSet>;
  readonly abilitySet: AbilitySet;

  private _teamID: number = -1;

  constructor(name: string) {
    super();

    this._displayName = name;
    this.attributeSet = defineAttributes(CharacterAttributeSet);

    // 创建能力集（需要传入 ActorRef 和属性集）
    this.abilitySet = createAbilitySet(this.toRef(), this.attributeSet._modifierTarget);
  }

  setTeamID(id: number) {
    this._teamID = id;
  }

  get teamID(): number {
    return this._teamID;
  }
}

type BattleContext = {
  leftTeam: CharacterActor[];
  rightTeam: CharacterActor[];
};

class HexBattle extends GameplayInstance {
  // 必须定义 type
  readonly type = 'HexBattle';

  private tickCount = 0;

  // ! 表示"我保证用之前会赋值
  private _context!: BattleContext;

  protected override onStart(): void {
    const leftTeam = [
      this.createActor(() => new CharacterActor('我方角色0')),
      this.createActor(() => new CharacterActor('我方角色1')),
      this.createActor(() => new CharacterActor('我方角色2'))
    ];

    const rightTeam = [
      this.createActor(() => new CharacterActor('敌方角色0')),
      this.createActor(() => new CharacterActor('敌方角色1')),
      this.createActor(() => new CharacterActor('敌方角色2'))
    ];

    // 设置队伍ID
    for (const actor of leftTeam) {
      actor.setTeamID(0);
    }

    for (const actor of rightTeam) {
      actor.setTeamID(1);
    }

    this._context = { leftTeam, rightTeam };
    console.log('✅ 战斗开始');
  }

  override tick(dt: number): GameEventBase[] {
    this.baseTick(dt);
    
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

    return [];
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

while (world.hasRunningInstances) {
  world.tickAll(TICK_INTERVAL);
}

console.log(`\n📊 Final: ${battle.logicTime}ms total`);
console.log(`📊 World instances: ${world.instanceCount}`);

// 清理
GameWorld.destroy();
