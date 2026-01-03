/**
 * HexBattleInstance - 六边形网格战斗实例
 *
 * 整合 HexGridModel、ATB 系统、类型相克和战斗日志
 */

import { GameplayInstance, EventCollector, type GameEventBase } from '@lomo/logic-game-framework';
import {
  HexGridModel,
  type AxialCoord,
  type HexGridConfig,
  hexDistance,
  hexNeighbors,
} from '@lomo/hex-grid';
import type { Element } from '@inkmon/core';
import { ATBSystem, type ATBConfig } from './atb/index.js';
import { InkMonUnit } from './InkMonUnit.js';
import { TypeSystem } from './systems/TypeSystem.js';
import { BattleLogger, type LogLevel } from './logger/BattleLogger.js';
import type {
  BattleStartEvent,
  BattleEndEvent,
  TurnStartEvent,
  MoveEvent,
  AttackEvent,
  DamageEvent,
  DeathEvent,
  SkipEvent,
  InkMonBattleEvent,
} from './types/BattleEvents.js';
import { getEffectivenessLevel, type EffectivenessLevel } from './types/TypeEffectiveness.js';

/**
 * 战斗结果
 */
export type BattleResult = 'ongoing' | 'teamA_win' | 'teamB_win' | 'draw';

/**
 * 六边形战斗配置
 */
export type HexBattleConfig = {
  /** 网格宽度（默认 11） */
  gridWidth?: number;
  /** 网格高度（默认 11） */
  gridHeight?: number;
  /** ATB 配置 */
  atbConfig?: ATBConfig;
  /** 最大回合数（默认 100） */
  maxTurns?: number;
  /** 日志级别 */
  logLevel?: LogLevel;
  /** 禁用随机性（用于测试） */
  deterministicMode?: boolean;
};

/**
 * 行动结果
 */
export type ActionResult = {
  success: boolean;
  events: InkMonBattleEvent[];
  message?: string;
};

/**
 * 伤害计算结果
 */
export interface DamageCalcResult {
  readonly damage: number;
  readonly element: Element;
  readonly effectiveness: EffectivenessLevel;
  readonly typeMultiplier: number;
  readonly stabMultiplier: number;
  readonly isCritical: boolean;
  readonly isSTAB: boolean;
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

  /** 战斗日志器 */
  readonly logger: BattleLogger;

  /** 事件收集器 */
  readonly eventCollector: EventCollector;

  /** 回合计数 */
  private _turnCount: number = 0;

  /** 最大回合数 */
  private readonly maxTurns: number;

  /** 战斗结果 */
  private _result: BattleResult = 'ongoing';

  /** 单位列表 */
  private units: InkMonUnit[] = [];

  /** 确定性模式（禁用随机） */
  private readonly deterministicMode: boolean;

  /** 暴击率 */
  private readonly critRate: number = 0.1;

  constructor(config: HexBattleConfig = {}) {
    super();

    // 初始化网格模型
    const gridConfig: HexGridConfig = {
      width: config.gridWidth ?? 11,
      height: config.gridHeight ?? 11,
    };
    this.gridModel = new HexGridModel(gridConfig);

    // 初始化 ATB 系统
    this.atbSystem = new ATBSystem(config.atbConfig);

    // 初始化日志器
    this.logger = new BattleLogger(config.logLevel ?? 'full');

    // 初始化事件收集器
    this.eventCollector = new EventCollector();

    this.maxTurns = config.maxTurns ?? 100;
    this.deterministicMode = config.deterministicMode ?? false;
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

  get logicTime(): number {
    return this._logicTime;
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
   * 获取所有存活单位
   */
  getAliveUnits(): InkMonUnit[] {
    return this.units.filter((u) => u.isActive);
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

  // ========== 伤害计算 ==========

  /**
   * 计算伤害
   *
   * 公式: BaseDamage = ((2 × Level / 5 + 2) × Power × Atk / Def) / 50 + 2
   * FinalDamage = BaseDamage × STAB × TypeMult × Crit × Random
   */
  calculateDamage(
    attacker: InkMonUnit,
    target: InkMonUnit,
    power: number,
    element: Element,
    category: 'physical' | 'special' = 'physical'
  ): DamageCalcResult {
    const level = attacker.level;
    const atkStat = category === 'physical' ? attacker.atk : attacker.spAtk;
    const defStat = category === 'physical' ? target.def : target.spDef;

    // 基础伤害
    const baseDamage = ((2 * level) / 5 + 2) * power * (atkStat / defStat) / 50 + 2;

    // STAB 加成
    const attackerElements = attacker.getElements();
    const stabMultiplier = TypeSystem.getSTABMultiplier(attackerElements, element);
    const isSTAB = stabMultiplier > 1;

    // 类型相克
    const defenderElements = target.getElements();
    const typeMultiplier = TypeSystem.calculateMultiplier(element, defenderElements);
    const effectiveness = getEffectivenessLevel(typeMultiplier);

    // 暴击判定
    const isCritical = this.deterministicMode ? false : Math.random() < this.critRate;
    const critMultiplier = isCritical ? 1.5 : 1.0;

    // 随机波动 (0.85 ~ 1.0)
    const randomMultiplier = this.deterministicMode
      ? 1.0
      : 0.85 + Math.random() * 0.15;

    // 最终伤害
    const finalDamage = Math.max(
      1,
      Math.floor(
        baseDamage * stabMultiplier * typeMultiplier * critMultiplier * randomMultiplier
      )
    );

    return {
      damage: finalDamage,
      element,
      effectiveness,
      typeMultiplier,
      stabMultiplier,
      isCritical,
      isSTAB,
    };
  }

  // ========== 行动执行 ==========

  /**
   * 执行移动行动
   */
  executeMove(unit: InkMonUnit, to: AxialCoord): ActionResult {
    const events: InkMonBattleEvent[] = [];

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

    // 记录日志
    this.logger.move(unit.displayName, from, to);

    // 发出移动事件
    const moveEvent: MoveEvent = {
      kind: 'move',
      logicTime: this._logicTime,
      unit: unit.toRef(),
      unitName: unit.displayName,
      from,
      to,
    };
    this.eventCollector.push(moveEvent);
    events.push(moveEvent);

    // 结束行动
    this.endTurn(unit);

    return { success: true, events };
  }

  /**
   * 执行攻击行动
   *
   * @param attacker 攻击者
   * @param target 目标
   * @param skillName 技能名称
   * @param power 技能威力（默认 40）
   * @param element 技能属性（默认使用攻击者主属性）
   * @param category 伤害类型（默认物理）
   */
  executeAttack(
    attacker: InkMonUnit,
    target: InkMonUnit,
    skillName: string = '普通攻击',
    power: number = 40,
    element?: Element,
    category: 'physical' | 'special' = 'physical'
  ): ActionResult {
    const events: InkMonBattleEvent[] = [];
    const attackElement = element ?? attacker.primaryElement;

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

    // 记录攻击日志
    this.logger.attack(attacker.displayName, target.displayName, skillName, attackElement);

    // 发出攻击事件
    const attackEvent: AttackEvent = {
      kind: 'attack',
      logicTime: this._logicTime,
      attacker: attacker.toRef(),
      attackerName: attacker.displayName,
      target: target.toRef(),
      targetName: target.displayName,
      skillName,
      element: attackElement,
    };
    this.eventCollector.push(attackEvent);
    events.push(attackEvent);

    // 计算伤害
    const damageResult = this.calculateDamage(
      attacker,
      target,
      power,
      attackElement,
      category
    );

    // 应用伤害
    const actualDamage = target.takeDamage(damageResult.damage);
    const remainingHp = target.hp;

    // 记录伤害日志
    this.logger.damage(attacker.displayName, target.displayName, actualDamage, {
      element: damageResult.element,
      effectiveness: damageResult.effectiveness,
      isCritical: damageResult.isCritical,
      isSTAB: damageResult.isSTAB,
      remainingHp,
      maxHp: target.maxHp,
    });

    // 发出伤害事件
    const damageEvent: DamageEvent = {
      kind: 'damage',
      logicTime: this._logicTime,
      source: attacker.toRef(),
      sourceName: attacker.displayName,
      target: target.toRef(),
      targetName: target.displayName,
      damage: actualDamage,
      element: damageResult.element,
      effectiveness: damageResult.effectiveness,
      isCritical: damageResult.isCritical,
      isSTAB: damageResult.isSTAB,
      remainingHp,
      maxHp: target.maxHp,
    };
    this.eventCollector.push(damageEvent);
    events.push(damageEvent);

    // 检查击杀
    if (!target.isActive) {
      // 记录死亡日志
      this.logger.death(target.displayName, attacker.displayName);

      // 从网格移除
      if (target.hexPosition) {
        this.gridModel.removeOccupant(target.hexPosition);
      }

      const deathEvent: DeathEvent = {
        kind: 'death',
        logicTime: this._logicTime,
        unit: target.toRef(),
        unitName: target.displayName,
        killer: attacker.toRef(),
        killerName: attacker.displayName,
        position: target.hexPosition!,
      };
      this.eventCollector.push(deathEvent);
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
    const events: InkMonBattleEvent[] = [];

    if (this.getCurrentUnit()?.id !== unit.id) {
      return { success: false, events, message: 'Not current unit turn' };
    }

    // 记录跳过日志
    this.logger.skip(unit.displayName);

    const skipEvent: SkipEvent = {
      kind: 'skip',
      logicTime: this._logicTime,
      unit: unit.toRef(),
      unitName: unit.displayName,
    };
    this.eventCollector.push(skipEvent);
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
      this.endBattle();
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
   * 推进战斗时间（符合基类签名）
   *
   * @returns 产生的事件列表
   */
  advance(dt: number): GameEventBase[] {
    this.advanceAndGetCurrentUnit(dt);
    return this.eventCollector.flush();
  }

  /**
   * 推进战斗时间并获取当前单位
   *
   * @returns 当前准备行动的单位（如果有）
   */
  advanceAndGetCurrentUnit(dt: number): InkMonUnit | null {
    if (!this.isOngoing) return null;
    if (this.state !== 'running') return null;

    // 更新逻辑时间
    this._logicTime += dt;

    // 更新 ATB
    this.atbSystem.tick(this.units, dt);

    // 获取当前可行动单位
    const currentUnit = this.getCurrentUnit();
    if (currentUnit && !currentUnit.isActing) {
      currentUnit.isActing = true;

      // 记录回合开始日志
      this.logger.turnStart(currentUnit.displayName, currentUnit.hp, currentUnit.maxHp);

      // 发出回合开始事件
      const turnStartEvent: TurnStartEvent = {
        kind: 'turn_start',
        logicTime: this._logicTime,
        turnNumber: this._turnCount + 1,
        unit: currentUnit.toRef(),
        unitName: currentUnit.displayName,
        hp: currentUnit.hp,
        maxHp: currentUnit.maxHp,
      };
      this.eventCollector.push(turnStartEvent);
    }

    return currentUnit;
  }

  /**
   * 检查战斗是否结束
   */
  private checkBattleEnd(): void {
    const aliveA = this.getAliveTeamUnits('A').length;
    const aliveB = this.getAliveTeamUnits('B').length;

    if (aliveA === 0 && aliveB === 0) {
      this._result = 'draw';
      this.endBattle();
    } else if (aliveA === 0) {
      this._result = 'teamB_win';
      this.endBattle();
    } else if (aliveB === 0) {
      this._result = 'teamA_win';
      this.endBattle();
    }
  }

  /**
   * 开始战斗
   */
  start(): void {
    super.start();

    // 记录战斗开始日志
    const teamA = this.getTeamUnits('A').map((u) => ({
      name: u.displayName,
      hp: u.hp,
      maxHp: u.maxHp,
    }));
    const teamB = this.getTeamUnits('B').map((u) => ({
      name: u.displayName,
      hp: u.hp,
      maxHp: u.maxHp,
    }));
    this.logger.battleStart(teamA, teamB);

    // 发出战斗开始事件
    const battleStartEvent: BattleStartEvent = {
      kind: 'battle_start',
      logicTime: this._logicTime,
      teamA: this.getTeamUnits('A').map((u) => u.toRef()),
      teamB: this.getTeamUnits('B').map((u) => u.toRef()),
    };
    this.eventCollector.push(battleStartEvent);
  }

  /**
   * 结束战斗
   */
  private endBattle(): void {
    // 记录战斗结束日志
    const survivors = this.getAliveUnits().map((u) => ({
      name: u.displayName,
      hp: u.hp,
      maxHp: u.maxHp,
    }));
    this.logger.battleEnd(this._result as 'teamA_win' | 'teamB_win' | 'draw', this._turnCount, survivors);

    // 发出战斗结束事件
    const battleEndEvent: BattleEndEvent = {
      kind: 'battle_end',
      logicTime: this._logicTime,
      result: this._result as 'teamA_win' | 'teamB_win' | 'draw',
      turnCount: this._turnCount,
      survivors: this.getAliveUnits().map((u) => u.toRef()),
    };
    this.eventCollector.push(battleEndEvent);

    // 调用父类 end
    this.end();

    // 清理
    this.gridModel.destroy();
  }

  /**
   * 获取完整战斗日志
   */
  getFullLog(): string {
    return this.logger.getFullLog();
  }

  /**
   * 打印战斗日志
   */
  printLog(): void {
    this.logger.print();
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
