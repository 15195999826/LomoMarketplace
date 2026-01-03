/**
 * 六边形战斗实例
 */

import {
  GameplayInstance,
  type GameEventBase,
  setDebugLogHandler,
} from '@lomo/logic-game-framework';

import { HexGridModel, axial, hexNeighbors, type AxialCoord } from '@lomo/hex-grid';

import { CharacterActor } from '../actors/CharacterActor.js';
import { createActionUseEvent } from '../skills/SkillAbilities.js';
import { BattleLogger } from '../logger/BattleLogger.js';

/** 战斗上下文 */
export type BattleContext = {
  grid: HexGridModel;
  leftTeam: CharacterActor[];
  rightTeam: CharacterActor[];
};

import type { ActorRef } from '@lomo/logic-game-framework';

/** AI 决策结果 */
type ActionDecision = {
  type: 'move' | 'skill';
  /** 要激活的 Ability 实例 ID */
  abilityInstanceId: string;
  /** 目标 Actor（单体技能用） */
  target?: ActorRef;
  /** 目标坐标（移动/范围技能用） */
  targetCoord?: AxialCoord;
};

export class HexBattle extends GameplayInstance {
  readonly type = 'HexBattle';

  private tickCount = 0;
  private _context!: BattleContext;
  private _logger!: BattleLogger;

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
    // 初始化日志系统
    this._logger = new BattleLogger(this.id);
    setDebugLogHandler((category, message, context) => {
      this._logger.handleFrameworkLog(category, message, context);
    });

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

    // 注册角色到日志系统
    for (const actor of [...leftTeam, ...rightTeam]) {
      this._logger.registerActor(actor.id, actor.displayName);
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

    this._logger.log('✅ 战斗开始');
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

    this._logger.tick(this.tickCount, this.logicTime);

    for (const actor of this.aliveActors) {
      // 检查该角色是否正在执行行动
      if (this.isActorExecuting(actor)) {
        // 正在执行：驱动执行实例，不累积 ATB
        actor.abilitySet.tickExecutions(dt);
      } else {
        // 空闲：累积 ATB
        actor.accumulateATB(dt);

        // 检查是否可以行动
        if (actor.canAct) {
          this.startActorAction(actor);
        }
      }
    }

    // 检查战斗是否结束（简化：100 tick 后结束）
    if (this.tickCount >= 100) {
      this._logger.log('\n✅ 战斗结束（达到最大回合数）');
      this._logger.save();
      this.end();
    }

    return [];
  }

  /** 检查角色是否正在执行行动 */
  private isActorExecuting(actor: CharacterActor): boolean {
    for (const ability of actor.abilitySet.getAbilities()) {
      if (ability.getExecutingInstances().length > 0) {
        return true;
      }
    }
    return false;
  }

  /** 开始角色行动 */
  private startActorAction(actor: CharacterActor): void {
    this._logger.actorReady(actor.id, actor.displayName, actor.atbGauge);

    // AI 决策
    const decision = this.decideAction(actor);
    const decisionText = decision.type === 'move' ? '移动' : '使用技能';
    this._logger.aiDecision(actor.id, actor.displayName, decisionText);

    // 记录执行前的实例数量
    const beforeInstances = new Set<string>();
    for (const ability of actor.abilitySet.getAbilities()) {
      for (const inst of ability.getExecutingInstances()) {
        beforeInstances.add(inst.id);
      }
    }

    // 创建事件并广播
    const event = createActionUseEvent(
      this.logicTime,
      decision.abilityInstanceId,
      actor.id,
      { target: decision.target, targetCoord: decision.targetCoord }
    );

    // 广播给该角色的 AbilitySet（触发 ActivateInstanceComponent 创建执行实例）
    actor.abilitySet.receiveEvent(event, this);

    // 找出新创建的执行实例，记录到日志
    for (const ability of actor.abilitySet.getAbilities()) {
      for (const inst of ability.getExecutingInstances()) {
        if (!beforeInstances.has(inst.id)) {
          this._logger.executionStart(
            inst.id,
            actor.id,
            actor.displayName,
            ability.displayName ?? ability.configId,
            ability.configId
          );
        }
      }
    }

    // 重置 ATB
    actor.resetATB();
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
        // 治疗：随机选择友方（使用 ActorRef）
        const targetActor = allies[Math.floor(Math.random() * allies.length)];
        return {
          type: 'skill',
          abilityInstanceId: skill.id,
          target: { id: targetActor.id },
        };
      } else {
        // 攻击：随机选择敌方（使用 ActorRef）
        const targetActor = enemies[Math.floor(Math.random() * enemies.length)];
        return {
          type: 'skill',
          abilityInstanceId: skill.id,
          target: { id: targetActor.id },
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
            abilityInstanceId: actor.moveAbility.id,
            targetCoord,
          };
        }
      }

      // 无法移动时使用技能
      if (enemies.length > 0) {
        const targetActor = enemies[Math.floor(Math.random() * enemies.length)];
        return {
          type: 'skill',
          abilityInstanceId: actor.skillAbility.id,
          target: { id: targetActor.id },
        };
      }

      // 兜底：移动到原地
      return {
        type: 'move',
        abilityInstanceId: actor.moveAbility.id,
        targetCoord: myPos,
      };
    }
  }
}
