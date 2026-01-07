/**
 * InkMonBattle - InkMon 战斗实例
 *
 * 基于 hex-atb-battle 架构的战斗系统，整合：
 * - BattleRecorder：战斗录像
 * - ATBSystem：行动条系统
 * - TypeSystem：类型相克
 * - HexGrid：六边形网格
 *
 * ## 设计特点
 *
 * - 完全支持 Battle Replay Protocol v2
 * - 使用 InkMonActor 作为战斗单位
 * - 支持 14 种属性相克
 * - STAB 加成系统
 */

import {
  GameplayInstance,
  type GameEventBase,
  type AbilitySet,
  type IAbilitySetProvider,
  EventCollector,
  type IGameplayStateProvider,
  Actor,
} from "@lomo/logic-game-framework";

import {
  BattleRecorder,
  type IBattleRecord,
} from "@lomo/logic-game-framework/stdlib";

import {
  HexGridModel,
  axial,
  hexDistance,
  hexNeighbors,
  type AxialCoord,
} from "@lomo/hex-grid";

import type { InkMon, Element } from "@inkmon/core";

import { InkMonActor, createInkMonActor } from "./actors/InkMonActor.js";
import { ATBSystem } from "./atb/index.js";
import { BattleLogger } from "./logger/BattleLogger.js";
import {
  createBattleStartEvent,
  createBattleEndEvent,
  createTurnStartEvent,
  createMoveEvent,
  createDeathEvent,
  type DamageCategory,
} from "./events/ReplayEvents.js";
import {
  TYPE_CHART,
  getEffectivenessLevel,
} from "./types/TypeEffectiveness.js";

// ========== 辅助函数 ==========

/** 安全的 console.log */
function logMessage(message: string): void {
  (globalThis as { console?: { log: (msg: string) => void } }).console?.log(
    message,
  );
}

// ========== 类型定义 ==========

/** 战斗结果 */
export type BattleResult = "ongoing" | "teamA_win" | "teamB_win" | "draw";

/** 战斗配置 */
export interface InkMonBattleConfig {
  /** 战斗 ID（可选，自动生成） */
  battleId?: string;
  /** 地图宽度（默认 9） */
  mapWidth?: number;
  /** 地图高度（默认 9） */
  mapHeight?: number;
  /** 六边形尺寸（默认 100） */
  hexSize?: number;
  /** 最大回合数（默认 100） */
  maxTurns?: number;
  /** ATB 满值（默认 1000） */
  atbMaxGauge?: number;
  /** 是否确定性模式（禁用随机，用于测试） */
  deterministicMode?: boolean;
  /** 默认暴击率 */
  critRate?: number;
  /** Tick 间隔（毫秒，默认 100） */
  tickInterval?: number;
}

/** 行动结果 */
export interface ActionResult {
  success: boolean;
  message?: string;
  events?: GameEventBase[];
}

/** 伤害计算结果 */
export interface DamageCalcResult {
  /** 最终伤害 */
  damage: number;
  /** 类型相克倍率 */
  typeMultiplier: number;
  /** 效果等级 */
  effectiveness:
    | "super_effective"
    | "neutral"
    | "not_very_effective"
    | "immune";
  /** 是否暴击 */
  isCritical: boolean;
  /** 是否有 STAB */
  isSTAB: boolean;
}

/** 战斗上下文 */
interface BattleContext {
  grid: HexGridModel;
  teamA: InkMonActor[];
  teamB: InkMonActor[];
}

// ========== InkMonBattle ==========

/**
 * InkMonBattle - InkMon 战斗实例
 */
export class InkMonBattle
  extends GameplayInstance
  implements IAbilitySetProvider, IGameplayStateProvider
{
  readonly type = "InkMonBattle";

  /** 战斗上下文 */
  private _context!: BattleContext;

  /** ATB 系统 */
  private readonly _atbSystem: ATBSystem;

  /** 日志系统 */
  readonly logger: BattleLogger;

  /** 事件收集器 */
  readonly eventCollector: EventCollector;

  /** 战斗录制器 */
  private _recorder!: BattleRecorder;

  /** 回合数 */
  private _turnCount: number = 0;

  /** 最大回合数 */
  private readonly _maxTurns: number;

  /** 战斗结果 */
  private _result: BattleResult = "ongoing";

  /** 单位列表 */
  private _units: Map<string, InkMonActor> = new Map();

  /** 配置 */
  private readonly _config: Required<InkMonBattleConfig>;

  /** Tick 计数 */
  private _tickCount: number = 0;

  constructor(config: InkMonBattleConfig = {}) {
    super();

    // 填充默认配置
    this._config = {
      battleId: config.battleId ?? this.id,
      mapWidth: config.mapWidth ?? 9,
      mapHeight: config.mapHeight ?? 9,
      hexSize: config.hexSize ?? 100,
      maxTurns: config.maxTurns ?? 100,
      atbMaxGauge: config.atbMaxGauge ?? 1000,
      deterministicMode: config.deterministicMode ?? false,
      critRate: config.critRate ?? 0.0625,
      tickInterval: config.tickInterval ?? 100,
    };

    this._maxTurns = this._config.maxTurns;

    // 初始化 ATB 系统
    this._atbSystem = new ATBSystem({
      maxGauge: this._config.atbMaxGauge,
    });

    // 初始化日志系统
    this.logger = new BattleLogger("full");

    // 初始化事件收集器
    this.eventCollector = new EventCollector();
  }

  // ========== Getter ==========

  /** 获取回合数 */
  get turnCount(): number {
    return this._turnCount;
  }

  /** 获取战斗结果 */
  get result(): BattleResult {
    return this._result;
  }

  /** 战斗是否进行中 */
  get isOngoing(): boolean {
    return this._result === "ongoing";
  }

  /** 获取地图 */
  get grid(): HexGridModel {
    return this._context.grid;
  }

  /** 获取所有单位 */
  get allActors(): InkMonActor[] {
    return Array.from(this._units.values());
  }

  /** 获取存活单位 */
  get aliveActors(): InkMonActor[] {
    return this.allActors.filter((u) => u.isActive);
  }

  /** 获取配置 */
  get config(): Readonly<Required<InkMonBattleConfig>> {
    return this._config;
  }

  // ========== IAbilitySetProvider 实现 ==========

  getAbilitySetForActor(actorId: string): AbilitySet | undefined {
    const actor = this._units.get(actorId);
    return actor?.abilitySet;
  }

  // ========== 单位管理 ==========

  /**
   * 添加单位到战斗
   */
  addUnit(actor: InkMonActor, position?: AxialCoord): boolean {
    if (this._units.has(actor.id)) {
      return false;
    }

    this._units.set(actor.id, actor);

    // 放置到网格
    if (position) {
      const placed = this._context.grid.placeOccupant(position, {
        id: actor.id,
      });
      if (placed) {
        actor.setPosition(position);
      }
    }

    return true;
  }

  /**
   * 移除单位
   */
  removeUnit(actorId: string): boolean {
    const actor = this._units.get(actorId);
    if (!actor) return false;

    // 从网格移除
    if (actor.hexPosition) {
      this._context.grid.removeOccupant(actor.hexPosition);
    }

    this._units.delete(actorId);
    return true;
  }

  /**
   * 获取单位
   */
  getUnit(actorId: string): InkMonActor | undefined {
    return this._units.get(actorId);
  }

  /**
   * 同时也实现 getActor 便于兼容（覆盖基类的泛型方法）
   */
  override getActor<T extends Actor>(actorId: string): T | undefined {
    return this._units.get(actorId) as T | undefined;
  }

  /**
   * 获取队伍单位
   */
  getTeamUnits(team: "A" | "B"): InkMonActor[] {
    return this.allActors.filter((u) => u.team === team);
  }

  /**
   * 获取队伍存活单位
   */
  getAliveTeamUnits(team: "A" | "B"): InkMonActor[] {
    return this.aliveActors.filter((u) => u.team === team);
  }

  /**
   * 获取坐标处的单位
   */
  getActorAt(coord: AxialCoord): InkMonActor | undefined {
    const ref = this._context.grid.getOccupantAt(coord);
    if (!ref) return undefined;
    return this._units.get(ref.id);
  }

  /**
   * 获取单位位置
   */
  getActorPosition(actor: InkMonActor): AxialCoord | undefined {
    return this._context.grid.findOccupantPosition(actor.id);
  }

  // ========== ATB 系统 ==========

  /**
   * 获取当前可行动的单位
   */
  getCurrentUnit(): InkMonActor | undefined {
    const unitId = this._atbSystem.getCurrentUnitId();
    if (!unitId) return undefined;
    return this._units.get(unitId);
  }

  /**
   * 获取 ATB 进度
   */
  getATBProgress(): Map<string, number> {
    return this._atbSystem.getATBProgress(this.aliveActors);
  }

  // ========== 伤害计算 ==========

  /**
   * 计算伤害
   */
  calculateDamage(
    attacker: InkMonActor,
    defender: InkMonActor,
    basePower: number,
    element: Element,
    category: DamageCategory = "physical",
  ): DamageCalcResult {
    const level = attacker.level;

    // 攻击/防御属性
    const atkStat = category === "physical" ? attacker.atk : attacker.spAtk;
    const defStat = category === "physical" ? defender.def : defender.spDef;

    // 基础伤害公式（简化版宝可梦公式）
    const baseDamage = Math.floor(
      (((2 * level) / 5 + 2) * basePower * atkStat) / defStat / 50 + 2,
    );

    // STAB 加成
    const attackerElements = attacker.getElements();
    const isSTAB = attackerElements.includes(element);
    const stabMultiplier = isSTAB ? 1.5 : 1;

    // 类型相克
    const defenderElements = defender.getElements();
    let typeMultiplier = 1;
    for (const defElement of defenderElements) {
      const chart = TYPE_CHART[element];
      if (chart && chart[defElement] !== undefined) {
        typeMultiplier *= chart[defElement];
      }
    }

    const effectiveness = getEffectivenessLevel(typeMultiplier);

    // 暴击
    const isCritical =
      !this._config.deterministicMode && Math.random() < this._config.critRate;
    const critMultiplier = isCritical ? 1.5 : 1;

    // 随机波动（85%-100%）
    const randomMultiplier = this._config.deterministicMode
      ? 1
      : 0.85 + Math.random() * 0.15;

    // 最终伤害
    const finalDamage = Math.max(
      1,
      Math.floor(
        baseDamage *
          stabMultiplier *
          typeMultiplier *
          critMultiplier *
          randomMultiplier,
      ),
    );

    return {
      damage: finalDamage,
      typeMultiplier,
      effectiveness,
      isCritical,
      isSTAB,
    };
  }

  // ========== 行动执行 ==========

  /**
   * 执行移动
   */
  executeMove(actor: InkMonActor, targetCoord: AxialCoord): ActionResult {
    const events: GameEventBase[] = [];

    if (!actor.isActive) {
      return { success: false, message: "单位已死亡" };
    }

    const currentPos = actor.hexPosition;
    if (!currentPos) {
      return { success: false, message: "单位无位置" };
    }

    // 检查目标是否有效
    if (!this._context.grid.hasTile(targetCoord)) {
      return { success: false, message: "目标位置无效" };
    }

    if (this._context.grid.isOccupied(targetCoord)) {
      return { success: false, message: "目标位置已被占据" };
    }

    // 检查距离（最多移动 1 格）
    const distance = hexDistance(currentPos, targetCoord);
    if (distance > 1) {
      return { success: false, message: "移动距离过远" };
    }

    // 执行移动
    this._context.grid.removeOccupant(currentPos);
    this._context.grid.placeOccupant(targetCoord, { id: actor.id });
    actor.setPosition(targetCoord);

    // 产生移动事件
    const moveEvent = createMoveEvent(
      actor.id,
      { q: currentPos.q, r: currentPos.r },
      { q: targetCoord.q, r: targetCoord.r },
    );
    events.push(this.eventCollector.push(moveEvent));

    // 使用 BattleLogger 的 move 方法
    this.logger.move(actor.displayName, currentPos, targetCoord);

    return { success: true, events };
  }

  /**
   * 执行攻击
   */
  executeAttack(
    attacker: InkMonActor,
    target: InkMonActor,
    basePower: number,
    element: Element,
    category: DamageCategory = "physical",
  ): ActionResult {
    const events: GameEventBase[] = [];

    if (!attacker.isActive) {
      return { success: false, message: "攻击者已死亡" };
    }

    if (!target.isActive) {
      return { success: false, message: "目标已死亡" };
    }

    // 计算伤害
    const damageResult = this.calculateDamage(
      attacker,
      target,
      basePower,
      element,
      category,
    );

    // 如果免疫
    if (damageResult.typeMultiplier === 0) {
      logMessage(`❌ ${target.displayName} 免疫 ${element} 属性攻击`);
      return { success: true, events, message: "目标免疫" };
    }

    // 应用伤害
    const actualDamage = target.takeDamage(damageResult.damage);

    // 使用 BattleLogger 的 damage 方法
    this.logger.damage(attacker.displayName, target.displayName, actualDamage, {
      element,
      effectiveness: damageResult.effectiveness,
      isCritical: damageResult.isCritical,
      isSTAB: damageResult.isSTAB,
      remainingHp: target.hp,
      maxHp: target.maxHp,
    });

    // 检查死亡
    if (!target.isActive) {
      const deathEvent = createDeathEvent(target.id, attacker.id);
      events.push(this.eventCollector.push(deathEvent));

      // 使用 BattleLogger 的 death 方法
      this.logger.death(target.displayName, attacker.displayName);

      // 检查战斗是否结束
      this.checkBattleEnd();
    }

    return { success: true, events };
  }

  /**
   * 执行跳过
   */
  executeSkip(actor: InkMonActor): ActionResult {
    this.logger.skip(actor.displayName);
    return { success: true };
  }

  /**
   * 结束当前回合
   */
  endTurn(): void {
    const currentUnit = this.getCurrentUnit();
    if (currentUnit) {
      currentUnit.isActing = false;
      this._atbSystem.resetUnitATB(currentUnit);
      this._atbSystem.consumeAction();
    }
    this._turnCount++;
  }

  // ========== 查询方法 ==========

  /**
   * 获取可移动位置
   */
  getMovablePositions(actor: InkMonActor): AxialCoord[] {
    const pos = actor.hexPosition;
    if (!pos) return [];

    return hexNeighbors(pos).filter(
      (n: AxialCoord) =>
        this._context.grid.hasTile(n) && !this._context.grid.isOccupied(n),
    );
  }

  /**
   * 获取可攻击目标
   */
  getAttackableTargets(actor: InkMonActor): InkMonActor[] {
    const pos = actor.hexPosition;
    if (!pos) return [];

    const enemies = this.aliveActors.filter((u) => u.team !== actor.team);

    return enemies.filter((enemy) => {
      const enemyPos = enemy.hexPosition;
      if (!enemyPos) return false;
      const distance = hexDistance(pos, enemyPos);
      return distance <= actor.attackRange;
    });
  }

  // ========== 生命周期 ==========

  /**
   * 初始化战斗（在 start 之前调用）
   */
  initialize(teamAInkmons: InkMon[], teamBInkmons: InkMon[]): void {
    // 创建地图
    const grid = new HexGridModel({
      rows: this._config.mapHeight,
      columns: this._config.mapWidth,
      hexSize: this._config.hexSize,
      orientation: "flat",
    });

    // 创建队伍
    const teamA: InkMonActor[] = teamAInkmons.map((inkmon) =>
      this.createActor(() => createInkMonActor(inkmon, "A")),
    );

    const teamB: InkMonActor[] = teamBInkmons.map((inkmon) =>
      this.createActor(() => createInkMonActor(inkmon, "B")),
    );

    // 设置上下文
    this._context = { grid, teamA, teamB };

    // 添加到单位列表
    for (const actor of [...teamA, ...teamB]) {
      this._units.set(actor.id, actor);
    }

    // 放置队伍 - 使用确定性的位置分配，避免重叠
    this.placeTeamDeterministically(teamA, -3, 3);  // 队伍A 放在左侧区域
    this.placeTeamDeterministically(teamB, -3, 3);  // 队伍B 放在右侧区域

    // 初始化录制器
    this._recorder = new BattleRecorder({
      battleId: this._config.battleId,
      tickInterval: this._config.tickInterval,
    });
  }

  /**
   * 随机放置队伍
   */
  private placeTeamRandomly(
    team: InkMonActor[],
    range: { qMin: number; qMax: number; rMin: number; rMax: number },
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
      [availableCoords[i], availableCoords[j]] = [
        availableCoords[j],
        availableCoords[i],
      ];
    }

    // 放置
    for (let i = 0; i < team.length && i < availableCoords.length; i++) {
      const coord = availableCoords[i];
      grid.placeOccupant(coord, { id: team[i].id });
      team[i].setPosition(coord);
    }
  }

  /**
   * 确定性地放置队伍（按顺序排列，避免重叠）
   * @param team 队伍
   * @param baseQ 基础 q 坐标（队伍A用负数，队伍B用正数）
   * @param spacing 间隔
   */
  private placeTeamDeterministically(
    team: InkMonActor[],
    baseQ: number,
    spacing: number = 3,
  ): void {
    const grid = this._context.grid;

    for (let i = 0; i < team.length; i++) {
      // 队伍A放在左侧(q<0)，队伍B放在右侧(q>0)
      const q = baseQ + (i % spacing);
      const r = Math.floor(i / spacing);

      const coord = axial(q, r);
      if (grid.hasTile(coord) && !grid.isOccupied(coord)) {
        grid.placeOccupant(coord, { id: team[i].id });
        team[i].setPosition(coord);
      } else {
        // 如果首选位置被占用，查找附近空位
        const neighbors = hexNeighbors(coord);
        for (const neighbor of neighbors) {
          if (grid.hasTile(neighbor) && !grid.isOccupied(neighbor)) {
            grid.placeOccupant(neighbor, { id: team[i].id });
            team[i].setPosition(neighbor);
            break;
          }
        }
      }
    }
  }

  protected override onStart(): void {
    // 开始录制
    this._recorder.startRecording(this.allActors, {
      map: {
        type: "hex",
        rows: this._config.mapHeight,
        columns: this._config.mapWidth,
        hexSize: this._config.hexSize,
      },
    });

    // 产生战斗开始事件
    const teamAIds = this._context.teamA.map((a) => a.id);
    const teamBIds = this._context.teamB.map((a) => a.id);
    const startEvent = createBattleStartEvent(teamAIds, teamBIds);
    this.eventCollector.push(startEvent);

    // 使用 BattleLogger 的 battleStart 方法
    const teamAInfo = this._context.teamA.map((a) => ({
      name: a.displayName,
      hp: a.hp,
      maxHp: a.maxHp,
    }));
    const teamBInfo = this._context.teamB.map((a) => ({
      name: a.displayName,
      hp: a.hp,
      maxHp: a.maxHp,
    }));
    this.logger.battleStart(teamAInfo, teamBInfo);

    this.printBattleInfo();
  }

  /**
   * 打印战斗信息
   */
  private printBattleInfo(): void {
    logMessage("\n📋 角色信息:");
    logMessage("─".repeat(60));

    for (const actor of this.allActors) {
      const pos = actor.hexPosition;
      const teamLabel = actor.team === "A" ? "A队" : "B队";
      const posStr = pos ? `(${pos.q}, ${pos.r})` : "未放置";
      const elements = actor.getElements().join("/");

      logMessage(`  [${actor.id}] ${actor.displayName} (${teamLabel})`);
      logMessage(`    位置: ${posStr} | 属性: ${elements}`);
      logMessage(
        `    HP: ${actor.hp}/${actor.maxHp} | ATK: ${actor.atk} | DEF: ${actor.def} | SPD: ${actor.speed}`,
      );
      logMessage("");
    }
    logMessage("─".repeat(60));
  }

  // ========== Tick 循环 ==========

  override tick(dt: number): GameEventBase[] {
    const baseEvents = this.baseTick(dt);
    this._tickCount++;

    // 更新 ATB
    this._atbSystem.tick(this.aliveActors, dt);

    // 更新所有单位的 AbilitySet
    for (const actor of this.aliveActors) {
      actor.abilitySet.tick(dt, this.logicTime);
    }

    // 收集本帧事件
    const frameEvents = this.eventCollector.flush();

    // 录制
    this._recorder.recordFrame(this._tickCount, [
      ...baseEvents,
      ...frameEvents,
    ]);

    // 检查结束条件
    if (this._turnCount >= this._maxTurns && this._result === "ongoing") {
      this._result = "draw";
      this.endBattle();
    }

    return frameEvents;
  }

  /**
   * 推进到下一个行动单位
   */
  advanceToNextUnit(): InkMonActor | undefined {
    while (this._result === "ongoing") {
      this.tick(this._config.tickInterval);

      const currentUnit = this.getCurrentUnit();
      if (currentUnit) {
        currentUnit.isActing = true;
        this._turnCount++;

        // 产生回合开始事件
        const turnStartEvent = createTurnStartEvent(
          this._turnCount,
          currentUnit.id,
        );
        this.eventCollector.push(turnStartEvent);

        // 使用 BattleLogger 的 turnStart 方法
        this.logger.turnStart(
          currentUnit.displayName,
          currentUnit.hp,
          currentUnit.maxHp,
        );

        return currentUnit;
      }
    }

    return undefined;
  }

  // ========== 战斗结束 ==========

  /**
   * 检查战斗是否结束
   */
  private checkBattleEnd(): void {
    const aliveA = this.getAliveTeamUnits("A");
    const aliveB = this.getAliveTeamUnits("B");

    if (aliveA.length === 0 && aliveB.length === 0) {
      this._result = "draw";
      this.endBattle();
    } else if (aliveA.length === 0) {
      this._result = "teamB_win";
      this.endBattle();
    } else if (aliveB.length === 0) {
      this._result = "teamA_win";
      this.endBattle();
    }
  }

  /**
   * 结束战斗
   */
  private endBattle(): void {
    const survivors = this.aliveActors.map((a) => a.id);

    const endEvent = createBattleEndEvent(
      this._result as "teamA_win" | "teamB_win" | "draw",
      this._turnCount,
      survivors,
    );
    this.eventCollector.push(endEvent);

    // 使用 BattleLogger 的 battleEnd 方法
    const survivorInfo = this.aliveActors.map((a) => ({
      name: a.displayName,
      hp: a.hp,
      maxHp: a.maxHp,
    }));
    this.logger.battleEnd(
      this._result as "teamA_win" | "teamB_win" | "draw",
      this._turnCount,
      survivorInfo,
    );

    this.end();
  }

  // ========== 录像导出 ==========

  /**
   * 获取战斗录像
   */
  getReplay(): IBattleRecord {
    return this._recorder.stopRecording(
      this._result === "ongoing" ? "interrupted" : "completed",
    );
  }

  /**
   * 获取完整日志
   */
  getFullLog(): string {
    return this.logger.getFullLog();
  }

  /**
   * 打印日志
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
      units: this.allActors.map((u) => u.serialize()),
    };
  }
}

// ========== 工厂函数 ==========

/**
 * 创建 InkMon 战斗实例
 */
export function createInkMonBattle(
  teamAInkmons: InkMon[],
  teamBInkmons: InkMon[],
  config?: InkMonBattleConfig,
): InkMonBattle {
  const battle = new InkMonBattle(config);
  battle.initialize(teamAInkmons, teamBInkmons);
  return battle;
}
