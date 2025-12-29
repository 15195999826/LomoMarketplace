/**
 * HexBattleInstance - 六边形网格战斗实例
 *
 * 整合 HexGridModel 和 ATB 系统的战斗实例
 */

import {
  GameplayInstance,
  type BattleEvent,
} from '@lomo/logic-game-framework';
import {
  HexGridModel,
  type AxialCoord,
  type HexGridConfig,
  hexDistance,
  hexNeighbors,
} from '@lomo/hex-grid';
import { ATBSystem, type ATBConfig } from './atb/index.js';
import { InkMonUnit } from './InkMonUnit.js';

/**
 * 战斗结果
 */
export type BattleResult = 'ongoing' | 'teamA_win' | 'teamB_win' | 'draw';

/**
 * 六边形战斗配置
 */
export interface HexBattleConfig {
  /** 网格宽度（默认 15） */
  gridWidth?: number;
  /** 网格高度（默认 15） */
  gridHeight?: number;
  /** ATB 配置 */
  atbConfig?: ATBConfig;
  /** 最大回合数（默认 100） */
  maxTurns?: number;
}

/**
 * 行动类型
 */
export type ActionType = 'move' | 'attack' | 'skip';

/**
 * 行动结果
 */
export interface ActionResult {
  success: boolean;
  events: BattleEvent[];
  message?: string;
}

/**
 * HexBattleInstance - 六边形战斗实例
 */
export class HexBattleInstance extends GameplayInstance {
  readonly type = 'HexBattle';

  /** 六边形网格模型 */
  readonly gridModel: HexGridModel;

  /** ATB 系统 */
  private readonly atbSystem: ATBSystem;

  /** 回合计数 */
  private _turnCount: number = 0;

  /** 最大回合数 */
  private readonly maxTurns: number;

  /** 战斗结果 */
  private _result: BattleResult = 'ongoing';

  /** 单位列表 */
  private units: InkMonUnit[] = [];

  constructor(config: HexBattleConfig = {}) {
    super();

    // 初始化网格模型
    const gridConfig: HexGridConfig = {
      width: config.gridWidth ?? 15,
      height: config.gridHeight ?? 15,
    };
    this.gridModel = new HexGridModel(gridConfig);

    // 初始化 ATB 系统
    this.atbSystem = new ATBSystem(config.atbConfig);

    this.maxTurns = config.maxTurns ?? 100;
  }

  // ========== 属性访问 ==========

  get turnCount(): number {
    return this._turnCount;
  }

  get result(): BattleResult {
    return this._result;
  }

  get isOngoing(): boolean {
    return this._result === 'ongoing';
  }

  // ========== 单位管理 ==========

  /**
   * 添加战斗单位并放置到网格
   */
  addUnit(unit: InkMonUnit, position: AxialCoord): boolean {
    // 检查位置是否可用
    if (!this.gridModel.isPassable(position)) {
      return false;
    }

    // 添加到单位列表
    this.units.push(unit);
    this.addActor(unit);

    // 放置到网格
    const placed = this.gridModel.placeOccupant(position, { id: unit.id });
    if (placed) {
      unit.setPosition(position);
    }

    return placed;
  }

  /**
   * 移除战斗单位
   */
  removeUnit(unit: InkMonUnit): void {
    // 从网格移除
    if (unit.hexPosition) {
      this.gridModel.removeOccupant(unit.hexPosition);
    }

    // 从单位列表移除
    this.units = this.units.filter((u) => u.id !== unit.id);
    this.removeActor(unit.id);
  }

  /**
   * 获取所有单位
   */
  getUnits(): InkMonUnit[] {
    return this.units;
  }

  /**
   * 获取指定队伍的单位
   */
  getTeamUnits(team: 'A' | 'B'): InkMonUnit[] {
    return this.units.filter((u) => u.team === team);
  }

  /**
   * 获取存活的队伍单位
   */
  getAliveTeamUnits(team: 'A' | 'B'): InkMonUnit[] {
    return this.getTeamUnits(team).filter((u) => u.isActive);
  }

  /**
   * 通过 ID 获取单位
   */
  getUnitById(id: string): InkMonUnit | undefined {
    return this.units.find((u) => u.id === id);
  }

  // ========== ATB 和行动 ==========

  /**
   * 获取当前可行动的单位
   */
  getCurrentUnit(): InkMonUnit | null {
    const unitId = this.atbSystem.getCurrentUnitId();
    if (!unitId) return null;
    return this.getUnitById(unitId) ?? null;
  }

  /**
   * 获取 ATB 进度
   */
  getATBProgress(): Map<string, number> {
    return this.atbSystem.getATBProgress(this.units);
  }

  /**
   * 执行移动行动
   */
  executeMove(unit: InkMonUnit, to: AxialCoord): ActionResult {
    const events: BattleEvent[] = [];

    // 检查是否是当前行动单位
    if (this.getCurrentUnit()?.id !== unit.id) {
      return { success: false, events, message: 'Not current unit turn' };
    }

    // 检查目标位置
    if (!unit.hexPosition) {
      return { success: false, events, message: 'Unit has no position' };
    }

    // 检查距离（只能移动 1 格）
    const distance = hexDistance(unit.hexPosition, to);
    if (distance !== 1) {
      return { success: false, events, message: 'Can only move 1 hex' };
    }

    // 检查目标是否可通行
    if (!this.gridModel.isPassable(to)) {
      return { success: false, events, message: 'Target position is blocked' };
    }

    // 执行移动
    const from = unit.hexPosition;
    const moved = this.gridModel.moveOccupant(from, to);
    if (!moved) {
      return { success: false, events, message: 'Move failed' };
    }

    unit.setPosition(to);

    // 发出移动事件
    const moveEvent = this.eventCollector.emit('move', {
      unitId: unit.id,
      from,
      to,
    }, this.logicTime);
    events.push(moveEvent);

    // 结束行动
    this.endTurn(unit);

    return { success: true, events };
  }

  /**
   * 执行攻击行动
   */
  executeAttack(attacker: InkMonUnit, target: InkMonUnit): ActionResult {
    const events: BattleEvent[] = [];

    // 检查是否是当前行动单位
    if (this.getCurrentUnit()?.id !== attacker.id) {
      return { success: false, events, message: 'Not current unit turn' };
    }

    // 检查位置
    if (!attacker.hexPosition || !target.hexPosition) {
      return { success: false, events, message: 'Units must have positions' };
    }

    // 检查攻击范围
    const distance = hexDistance(attacker.hexPosition, target.hexPosition);
    if (distance > attacker.attackRange) {
      return { success: false, events, message: 'Target out of range' };
    }

    // 检查目标是否存活
    if (!target.isActive) {
      return { success: false, events, message: 'Target is dead' };
    }

    // 检查是否是敌人
    if (attacker.team === target.team) {
      return { success: false, events, message: 'Cannot attack ally' };
    }

    // 计算伤害（简单公式）
    const baseDamage = Math.max(1, attacker.atk - target.def / 2);
    const actualDamage = target.takeDamage(baseDamage);

    // 发出伤害事件
    const damageEvent = this.eventCollector.emit('damage', {
      sourceId: attacker.id,
      targetId: target.id,
      damage: actualDamage,
      damageType: 'physical',
    }, this.logicTime);
    events.push(damageEvent);

    // 检查击杀
    if (!target.isActive) {
      // 从网格移除
      if (target.hexPosition) {
        this.gridModel.removeOccupant(target.hexPosition);
      }

      const deathEvent = this.eventCollector.emit('death', {
        unitId: target.id,
        killerId: attacker.id,
      }, this.logicTime);
      events.push(deathEvent);

      // 检查战斗结束
      this.checkBattleEnd();
    }

    // 结束行动
    this.endTurn(attacker);

    return { success: true, events };
  }

  /**
   * 跳过行动
   */
  executeSkip(unit: InkMonUnit): ActionResult {
    const events: BattleEvent[] = [];

    if (this.getCurrentUnit()?.id !== unit.id) {
      return { success: false, events, message: 'Not current unit turn' };
    }

    const skipEvent = this.eventCollector.emit('skip', {
      unitId: unit.id,
    }, this.logicTime);
    events.push(skipEvent);

    this.endTurn(unit);

    return { success: true, events };
  }

  /**
   * 结束当前单位的回合
   */
  private endTurn(unit: InkMonUnit): void {
    // 重置 ATB
    unit.atbGauge = 0;
    unit.isActing = false;

    // 消耗行动权
    this.atbSystem.consumeAction();

    // 增加回合计数
    this._turnCount++;

    // 检查回合上限
    if (this._turnCount >= this.maxTurns) {
      this._result = 'draw';
      this.end();
    }
  }

  // ========== 范围查询 ==========

  /**
   * 获取单位可移动到的位置
   */
  getMovablePositions(unit: InkMonUnit): AxialCoord[] {
    if (!unit.hexPosition) return [];

    // 只能移动 1 格
    return hexNeighbors(unit.hexPosition).filter((coord) =>
      this.gridModel.isPassable(coord)
    );
  }

  /**
   * 获取单位可攻击的目标
   */
  getAttackableTargets(unit: InkMonUnit): InkMonUnit[] {
    if (!unit.hexPosition) return [];

    const enemies = this.getAliveTeamUnits(unit.team === 'A' ? 'B' : 'A');

    return enemies.filter((enemy) => {
      if (!enemy.hexPosition) return false;
      const distance = hexDistance(unit.hexPosition!, enemy.hexPosition);
      return distance <= unit.attackRange;
    });
  }

  // ========== 战斗流程 ==========

  /**
   * 推进战斗时间
   */
  advance(dt: number): BattleEvent[] {
    if (!this.isOngoing) return [];
    if (this.state !== 'running') return [];

    // 更新逻辑时间
    this._logicTime += dt;

    // 更新 ATB
    this.atbSystem.tick(this.units, dt);

    return this.eventCollector.flush();
  }

  /**
   * 检查战斗是否结束
   */
  private checkBattleEnd(): void {
    const aliveA = this.getAliveTeamUnits('A').length;
    const aliveB = this.getAliveTeamUnits('B').length;

    if (aliveA === 0 && aliveB === 0) {
      this._result = 'draw';
      this.end();
    } else if (aliveA === 0) {
      this._result = 'teamB_win';
      this.end();
    } else if (aliveB === 0) {
      this._result = 'teamA_win';
      this.end();
    }
  }

  /**
   * 开始战斗
   */
  start(): void {
    super.start();

    // 发出战斗开始事件
    this.eventCollector.emit('battle_start', {
      teamA: this.getTeamUnits('A').map((u) => u.id),
      teamB: this.getTeamUnits('B').map((u) => u.id),
    }, this.logicTime);
  }

  /**
   * 结束战斗
   */
  end(): void {
    super.end();

    // 发出战斗结束事件
    this.eventCollector.emit('battle_end', {
      result: this._result,
      turnCount: this._turnCount,
    }, this.logicTime);

    // 清理
    this.gridModel.destroy();
  }

  // ========== 序列化 ==========

  serialize(): object {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      logicTime: this.logicTime,
      turnCount: this._turnCount,
      result: this._result,
      grid: this.gridModel.serialize(),
      units: this.units.map((u) => u.serialize()),
    };
  }
}
