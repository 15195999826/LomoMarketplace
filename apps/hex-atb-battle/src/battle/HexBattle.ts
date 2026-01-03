/**
 * 六边形战斗实例
 */

import {
  GameplayInstance,
  type GameEventBase,
} from '@lomo/logic-game-framework';

import { HexGridModel, axial, hexNeighbors, type AxialCoord } from '@lomo/hex-grid';

import { CharacterActor } from '../actors/CharacterActor.js';
import { createActionUseEvent } from '../skills/SkillAbilities.js';

/** 战斗上下文 */
export type BattleContext = {
  grid: HexGridModel;
  leftTeam: CharacterActor[];
  rightTeam: CharacterActor[];
};

/** AI 决策结果 */
type ActionDecision = {
  type: 'move' | 'skill';
  abilityId: string;
  targetId?: string;
  targetCoord?: AxialCoord;
};

export class HexBattle extends GameplayInstance {
  readonly type = 'HexBattle';

  private tickCount = 0;
  private _context!: BattleContext;

  // ========== 地图查询方法 ==========

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

  /** 获取所有角色 */
  get allActors(): CharacterActor[] {
    return [...this._context.leftTeam, ...this._context.rightTeam];
  }

  /** 获取存活角色 */
  get aliveActors(): CharacterActor[] {
    return this.allActors.filter(a => a.isActive);
  }

  protected override onStart(): void {
    // 创建左方队伍
    const leftTeam: CharacterActor[] = [
      this.createActor(() => new CharacterActor('Priest')),
      this.createActor(() => new CharacterActor('Warrior')),
      this.createActor(() => new CharacterActor('Archer')),
    ];

    // 创建右方队伍
    const rightTeam: CharacterActor[] = [
      this.createActor(() => new CharacterActor('Mage')),
      this.createActor(() => new CharacterActor('Berserker')),
      this.createActor(() => new CharacterActor('Assassin')),
    ];

    // 设置队伍 ID
    for (const actor of leftTeam) actor.setTeamID(0);
    for (const actor of rightTeam) actor.setTeamID(1);

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

    for (let i = 0; i < team.length && i < availableCoords.length; i++) {
      grid.placeOccupant(availableCoords[i], { id: team[i].id });
    }
  }

  /** 打印战斗信息 */
  private printBattleInfo(): void {
    console.log('\n📋 角色信息:');
    console.log('─'.repeat(70));

    for (const actor of this.allActors) {
      const pos = this.getActorPosition(actor);
      const stats = actor.getStats();
      const skill = actor.skillAbility;

      const teamLabel = actor.teamID === 0 ? '左方' : '右方';
      const posStr = pos ? `(${pos.q}, ${pos.r})` : '未放置';

      console.log(`  [${actor.id}] ${actor.displayName} (${teamLabel})`);
      console.log(`    位置: ${posStr}`);
      console.log(`    属性: HP=${stats.hp}/${stats.maxHp} ATK=${stats.atk} DEF=${stats.def} SPD=${stats.speed}`);
      console.log(`    技能: ${skill.displayName}`);
      console.log('');
    }
    console.log('─'.repeat(70));
  }

  // ========== 战斗主循环 ==========

  override tick(dt: number): GameEventBase[] {
    this.baseTick(dt);
    this.tickCount++;

    // 1. 累积所有角色的 ATB
    for (const actor of this.aliveActors) {
      actor.accumulateATB(dt);
    }

    // 2. 找到可以行动的角色（ATB 最高且 >= 100）
    const readyActor = this.getReadyActor();
    if (readyActor) {
      console.log(`\n⚡ [Tick ${this.tickCount}] ${readyActor.displayName} 获得行动机会 (ATB: ${readyActor.atbGauge.toFixed(1)})`);

      // 3. AI 决策
      const decision = this.decideAction(readyActor);
      console.log(`  🤖 决策: ${decision.type === 'move' ? '移动' : '使用技能'}`);

      // 4. 创建事件并广播
      const event = createActionUseEvent(
        this.logicTime,
        decision.abilityId,
        readyActor.id,
        { targetId: decision.targetId, targetCoord: decision.targetCoord }
      );

      // 广播给该角色的 AbilitySet
      readyActor.abilitySet.receiveEvent(event, this);

      // 5. 推进 Ability 执行（tick abilitySet）
      readyActor.abilitySet.tick(dt);

      // 6. 重置 ATB
      readyActor.resetATB();
    }

    // 检查战斗是否结束（简化：10 次行动后结束）
    if (this.tickCount >= 100) {
      console.log('\n✅ 战斗结束（达到最大回合数）');
      this.end();
    }

    return [];
  }

  /** 获取可以行动的角色 */
  private getReadyActor(): CharacterActor | undefined {
    const readyActors = this.aliveActors.filter(a => a.canAct);
    if (readyActors.length === 0) return undefined;

    // 返回 ATB 最高的
    return readyActors.reduce((a, b) => a.atbGauge > b.atbGauge ? a : b);
  }

  /** AI 决策（简化版：随机选择移动或攻击） */
  private decideAction(actor: CharacterActor): ActionDecision {
    const myPos = this.getActorPosition(actor);
    const enemies = this.aliveActors.filter(a => a.teamID !== actor.teamID);
    const allies = this.aliveActors.filter(a => a.teamID === actor.teamID && a.id !== actor.id);

    // 简化决策：50% 移动，50% 使用技能
    const useSkill = Math.random() > 0.5;

    if (useSkill && enemies.length > 0) {
      const skill = actor.skillAbility;
      const isHeal = skill.tags.includes('ally');

      if (isHeal && allies.length > 0) {
        // 治疗：随机选择友方
        const target = allies[Math.floor(Math.random() * allies.length)];
        return {
          type: 'skill',
          abilityId: skill.configId,
          targetId: target.id,
        };
      } else {
        // 攻击：随机选择敌方
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        return {
          type: 'skill',
          abilityId: skill.configId,
          targetId: target.id,
        };
      }
    } else {
      // 移动：随机选择相邻格子
      if (myPos) {
        const neighbors = hexNeighbors(myPos);
        const validNeighbors = neighbors.filter((n: AxialCoord) =>
          this._context.grid.hasTile(n) && !this._context.grid.isOccupied(n)
        );

        if (validNeighbors.length > 0) {
          const targetCoord = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
          return {
            type: 'move',
            abilityId: 'action_move',
            targetCoord,
          };
        }
      }

      // 无法移动时使用技能
      if (enemies.length > 0) {
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        return {
          type: 'skill',
          abilityId: actor.skillAbility.configId,
          targetId: target.id,
        };
      }

      // 兜底：移动到原地
      return {
        type: 'move',
        abilityId: 'action_move',
        targetCoord: myPos,
      };
    }
  }
}
