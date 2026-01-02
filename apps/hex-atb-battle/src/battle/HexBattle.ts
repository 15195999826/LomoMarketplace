/**
 * 六边形战斗实例
 */

import {
  GameplayInstance,
  type GameEventBase,
} from '@lomo/logic-game-framework';

import { HexGridModel, axial, type AxialCoord } from '@lomo/hex-grid';

import { CharacterActor } from '../actors/CharacterActor.js';
import type { CharacterClass } from '../config/ClassConfig.js';

/** 战斗上下文 */
export type BattleContext = {
  grid: HexGridModel;
  leftTeam: CharacterActor[];
  rightTeam: CharacterActor[];
};

export class HexBattle extends GameplayInstance {
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
    // 创建左方队伍（牧师、战士、弓箭手）
    const leftTeam: CharacterActor[] = [
      this.createActor(() => new CharacterActor('Priest')),
      this.createActor(() => new CharacterActor('Warrior')),
      this.createActor(() => new CharacterActor('Archer')),
    ];

    // 创建右方队伍（法师、狂战士、刺客）
    const rightTeam: CharacterActor[] = [
      this.createActor(() => new CharacterActor('Mage')),
      this.createActor(() => new CharacterActor('Berserker')),
      this.createActor(() => new CharacterActor('Assassin')),
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
    this.printBattleInfo();
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
    }
  }

  /** 打印战斗信息 */
  private printBattleInfo(): void {
    console.log('\n📋 角色信息:');
    console.log('─'.repeat(70));

    const allActors = [...this._context.leftTeam, ...this._context.rightTeam];
    for (const actor of allActors) {
      const pos = this.getActorPosition(actor);
      const stats = actor.getStats();
      const skillAbility = actor.skillAbility;

      const teamLabel = actor.teamID === 0 ? '左方' : '右方';
      const posStr = pos ? `(${pos.q}, ${pos.r})` : '未放置';

      console.log(`  [${actor.id}] ${actor.displayName} (${teamLabel})`);
      console.log(`    位置: ${posStr}`);
      console.log(`    属性: HP=${stats.hp}/${stats.maxHp} ATK=${stats.atk} DEF=${stats.def} SPD=${stats.speed}`);
      if (skillAbility) {
        const tags = skillAbility.tags.join(', ');
        console.log(`    技能: ${skillAbility.displayName} [${tags}]`);
        console.log(`           ${skillAbility.description}`);
      }
      console.log('');
    }
    console.log('─'.repeat(70));
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
