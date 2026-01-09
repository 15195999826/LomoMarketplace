/**
 * InkMonBattle - InkMon 战斗实例
 *
 * 基于 hex-atb-battle 架构的实时战斗系统，整合：
 * - BattleRecorder：战斗录像
 * - TypeSystem：类型相克
 * - HexGrid：六边形网格
 * - ATB：行动条系统（Actor 内部管理）
 *
 * ## 设计特点
 *
 * - 完全支持 Battle Replay Protocol v2
 * - 使用 InkMonActor 作为战斗单位
 * - 支持 14 种属性相克
 * - STAB 加成系统
 * - 实时战斗模式（与 HexBattle 一致）
 */

import {
  GameplayInstance,
  type GameEventBase,
  type AbilitySet,
  type IAbilitySetProvider,
  EventCollector,
  type IGameplayStateProvider,
  Actor,
  getTimelineRegistry,
  type ActorRef,
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
import { BattleLogger } from "./logger/BattleLogger.js";
import {
  createBattleStartEvent,
  createBattleEndEvent,
  createTurnStartEvent,
} from "./events/ReplayEvents.js";
import {
  INKMON_TIMELINES,
  ABILITY_CONFIG_ID,
  createActionUseEvent,
} from "./skills/index.js";
import { InkMonBattleGameWorld } from "./world/index.js";

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

/** AI 决策结果 */
type ActionDecision = {
  type: "move" | "attack";
  /** 要激活的 Ability 实例 ID */
  abilityInstanceId: string;
  /** 目标 Actor（攻击用） */
  target?: ActorRef;
  /** 目标坐标（移动用） */
  targetCoord?: AxialCoord;
  /** 技能属性（攻击用） */
  element?: Element;
  /** 技能威力（攻击用） */
  power?: number;
  /** 伤害类型（攻击用） */
  damageCategory?: "physical" | "special";
};

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

  // ========== 执行状态检查 ==========

  /**
   * 检查角色是否正在执行行动
   * 遍历该角色所有 Ability 的执行实例
   */
  private isActorExecuting(actor: InkMonActor): boolean {
    for (const ability of actor.abilitySet.getAbilities()) {
      if (ability.getExecutingInstances().length > 0) {
        return true;
      }
    }
    return false;
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

    // 放置队伍 - 使用确定性的位置分配，关于中心对称
    this.placeTeamDeterministically(teamA, -3, 3);  // 队伍A 放在左侧 (-3, 0)
    this.placeTeamDeterministically(teamB, 3, 3);   // 队伍B 放在右侧 (3, 0) - 对称

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
    // 开始录制（使用 grid.toMapConfig() 导出地图配置）
    this._recorder.startRecording(this.allActors, {
      map: this._context.grid.toMapConfig(),
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

  override tick(dt: number): void {
    this.baseTick(dt);
    this._tickCount++;

    for (const actor of this.aliveActors) {
      // 驱动 AbilitySet（Buff 计时、Tag 过期等）
      actor.abilitySet.tick(dt, this.logicTime);

      // 检查执行状态
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

    // 收集本帧事件
    const frameEvents = this.eventCollector.flush();

    // 调试：打印事件数量和类型
    if (frameEvents.length > 0) {
      const eventKinds = frameEvents.map(e => e.kind).join(', ');
      logMessage(`  [Tick ${this._tickCount}] 收集到 ${frameEvents.length} 个事件: ${eventKinds}`);
    }

    // 录制
    this._recorder.recordFrame(this._tickCount, frameEvents);

    // 检查战斗结束
    this.checkBattleEnd();

    // 检查回合数限制
    if (this._turnCount >= this._maxTurns && this._result === "ongoing") {
      this._result = "draw";
      this.endBattle();
    }
  }

  /**
   * 开始角色行动（异步，不等待执行完成）
   *
   * 与 HexBattle.startActorAction 保持一致：
   * - 行动开始时立即重置 ATB
   * - 不同步等待执行完成
   * - Timeline 由 tick() 中的 tickExecutions(dt) 逐帧推进
   */
  private startActorAction(actor: InkMonActor): void {
    this._turnCount++;

    // 产生回合开始事件
    const turnStartEvent = createTurnStartEvent(this._turnCount, actor.id);
    this.eventCollector.push(turnStartEvent);

    // 日志
    this.logger.turnStart(actor.displayName, actor.hp, actor.maxHp);

    // AI 决策
    const decision = this.decideAction(actor);

    // 创建事件并广播给 AbilitySet
    const event = createActionUseEvent(
      decision.abilityInstanceId,
      actor.id,
      {
        target: decision.target,
        targetCoord: decision.targetCoord,
        element: decision.element,
        power: decision.power,
        damageCategory: decision.damageCategory,
      }
    );

    // 广播给该角色的 AbilitySet（触发 Ability 创建执行实例）
    actor.abilitySet.receiveEvent(event, this);

    // 重置 ATB（行动开始时立即重置，不等执行完成）
    actor.resetATB();

    // 注意：执行实例在创建时已自动触发 dt=0 的 tick
    // Timeline 中 0ms 的 tags 会立即执行
    // 后续的 Timeline 推进由 tick() 中的 tickExecutions(dt) 完成
  }

  /**
   * AI 决策（优先攻击，否则移动）
   */
  private decideAction(actor: InkMonActor): ActionDecision {
    // 查找攻击目标
    const targets = this.getAttackableTargets(actor);

    if (targets.length > 0) {
      // 有可攻击目标 -> 攻击
      const target = this.selectBestTarget(actor, targets);
      const element = actor.getElements()[0] ?? "fire";

      // 查找普通攻击 Ability
      const attackAbility = actor.findAbilityByConfigId(ABILITY_CONFIG_ID.BASIC_ATTACK);
      if (!attackAbility) {
        throw new Error(`Actor ${actor.id} missing basic attack ability`);
      }

      return {
        type: "attack",
        abilityInstanceId: attackAbility.id,
        target: target.toRef(),
        element,
        power: 60,
        damageCategory: "physical",
      };
    } else {
      // 无可攻击目标 -> 尝试移动
      const moveTarget = this.findMoveTarget(actor);

      // 查找移动 Ability
      const moveAbility = actor.findAbilityByConfigId(ABILITY_CONFIG_ID.MOVE);
      if (!moveAbility) {
        throw new Error(`Actor ${actor.id} missing move ability`);
      }

      return {
        type: "move",
        abilityInstanceId: moveAbility.id,
        targetCoord: moveTarget,
      };
    }
  }

  /**
   * 寻找移动目标（向最近的敌人靠近）
   */
  private findMoveTarget(actor: InkMonActor): AxialCoord {
    const pos = actor.hexPosition;
    if (!pos) {
      // 无位置，返回原地
      return axial(0, 0);
    }

    const enemies = this.aliveActors.filter((a) => a.team !== actor.team);
    if (enemies.length === 0) {
      // 无敌人，返回原地
      return pos;
    }

    // 找最近的敌人
    let nearestEnemy: InkMonActor | undefined;
    let nearestDist = Infinity;
    for (const enemy of enemies) {
      const enemyPos = enemy.hexPosition;
      if (enemyPos) {
        const dist = hexDistance(pos, enemyPos);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }
    }

    if (!nearestEnemy || !nearestEnemy.hexPosition) {
      return pos;
    }

    // 找可移动的格子
    const movable = this.getMovablePositions(actor);
    if (movable.length === 0) {
      return pos;
    }

    // 选择最靠近敌人的格子
    let bestPos = movable[0];
    let bestDist = hexDistance(bestPos, nearestEnemy.hexPosition);
    for (const p of movable) {
      const d = hexDistance(p, nearestEnemy.hexPosition);
      if (d < bestDist) {
        bestDist = d;
        bestPos = p;
      }
    }

    // 只有更近才移动，否则原地
    if (bestDist < nearestDist) {
      return bestPos;
    }

    return pos;
  }

  /**
   * 选择最佳攻击目标（优先低血量）
   */
  private selectBestTarget(
    _attacker: InkMonActor,
    targets: InkMonActor[],
  ): InkMonActor {
    // 简单策略：选择血量最低的
    return targets.reduce((best, current) =>
      current.hp < best.hp ? current : best
    );
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

/**
 * 运行完整 InkMon 战斗并返回录像
 *
 * 遵循框架 GameWorld/GameplayInstance 设计：
 * 1. 初始化 GameWorld
 * 2. 创建战斗实例
 * 3. 同步 tick 循环直到结束（无 sleep，一帧跑完）
 * 4. 返回战斗录像
 * 5. 清理 GameWorld
 *
 * AI 决策逻辑在 InkMonBattle.tick() 内部处理
 */
export function runInkMonBattle(
  teamAInkmons: InkMon[],
  teamBInkmons: InkMon[],
  config?: InkMonBattleConfig,
): IBattleRecord {
  // 1. 初始化 GameWorld
  const world = InkMonBattleGameWorld.init();

  try {
    // 注册 Timeline
    const timelineRegistry = getTimelineRegistry();
    for (const timeline of INKMON_TIMELINES) {
      timelineRegistry.register(timeline);
    }

    // 2. 创建战斗实例
    const battle = world.createInstance(() => new InkMonBattle(config));
    battle.initialize(teamAInkmons, teamBInkmons);
    battle.start();

    const tickInterval = config?.tickInterval ?? 100;

    // 3. 同步 tick 循环（无 sleep，一帧跑完）
    while (world.hasRunningInstances) {
      world.tickAll(tickInterval);
    }

    // 4. 获取录像
    return battle.getReplay();
  } finally {
    // 5. 清理 GameWorld
    InkMonBattleGameWorld.destroy();
  }
}
