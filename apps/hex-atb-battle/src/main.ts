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

import { HexGridModel, axial, type AxialCoord } from '@lomo/hex-grid';

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
  grid: HexGridModel;
  leftTeam: CharacterActor[];
  rightTeam: CharacterActor[];
};

class HexBattle extends GameplayInstance {
  readonly type = 'HexBattle';

  private tickCount = 0;
  private _context!: BattleContext;

  // ========== 地图查询方法（供 System 使用）==========

  /** 根据坐标获取角色 */
  getActorAt(coord: AxialCoord): CharacterActor | undefined {
    const ref = this._context.grid.getOccupantAt(coord);
    if (!ref) return undefined;
    return this.getActor<CharacterActor>(ref.id);
  }

  /** 获取角色所在位置 */
  getActorPosition(actor: CharacterActor): AxialCoord | undefined {
    return this._context.grid.findOccupantPosition(actor.id);
  }

  /** 获取地图实例 */
  get grid(): HexGridModel {
    return this._context.grid;
  }

  /** 获取战斗上下文 */
  get context(): BattleContext {
    return this._context;
  }

  protected override onStart(): void {
    // 创建队伍
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

    // 设置队伍 ID
    for (const actor of leftTeam) {
      actor.setTeamID(0);
    }
    for (const actor of rightTeam) {
      actor.setTeamID(1);
    }

    // 初始化上下文
    this._context = {
      grid: new HexGridModel({ width: 9, height: 9 }),
      leftTeam,
      rightTeam,
    };

    // 随机放置角色
    this.placeTeamRandomly(leftTeam, { qMin: 0, qMax: 3, rMin: 0, rMax: 3 });
    this.placeTeamRandomly(rightTeam, { qMin: 5, qMax: 8, rMin: 5, rMax: 8 });

    console.log('✅ 战斗开始');
    this.printMap();
  }

  /** 在指定范围内随机放置队伍 */
  private placeTeamRandomly(
    team: CharacterActor[],
    range: { qMin: number; qMax: number; rMin: number; rMax: number }
  ): void {
    const grid = this._context.grid;

    // 收集范围内所有可用格子
    const availableCoords: AxialCoord[] = [];
    for (let q = range.qMin; q <= range.qMax; q++) {
      for (let r = range.rMin; r <= range.rMax; r++) {
        const coord = axial(q, r);
        if (grid.hasTile(coord) && !grid.isOccupied(coord)) {
          availableCoords.push(coord);
        }
      }
    }

    // 随机打乱
    for (let i = availableCoords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableCoords[i], availableCoords[j]] = [availableCoords[j], availableCoords[i]];
    }

    // 放置角色
    for (let i = 0; i < team.length && i < availableCoords.length; i++) {
      const coord = availableCoords[i];
      grid.placeOccupant(coord, { id: team[i].id });
      console.log(`  📍 ${team[i].displayName} 放置于 (${coord.q}, ${coord.r})`);
    }
  }

  /** 打印地图状态 */
  private printMap(): void {
    console.log('\n🗺️ 地图状态:');
    const allActors = [...this._context.leftTeam, ...this._context.rightTeam];
    for (const actor of allActors) {
      const pos = this.getActorPosition(actor);
      if (pos) {
        console.log(`  [${actor.id}] ${actor.displayName} [队伍${actor.teamID}] @ (${pos.q}, ${pos.r})`);
      }
    }
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
