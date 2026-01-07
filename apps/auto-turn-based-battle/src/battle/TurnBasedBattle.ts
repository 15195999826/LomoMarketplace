/**
 * 回合制战斗实例 - 核心状态机实现
 *
 * 参考 TurnBasedAutoChessInstance 设计：
 * - Stage（阶段）：GameStart → NewRound → CharacterGetTurn → ... → GameOver
 * - StageStatus（状态）：Enter → Idle → Pending
 * - WaitSignal（信号）：用于等待异步操作完成
 *
 * 所有角色由 AI 驱动，无需玩家输入
 */

import {
  GameplayInstance,
  type GameEventBase,
} from "@lomo/logic-game-framework";

import { BattleUnit } from "../actors/BattleUnit.js";
import { BattleContext, type BattleCommand } from "./BattleContext.js";
import {
  BattleStage,
  StageStatus,
  WaitSignal,
  BattleResult,
} from "./BattleStage.js";
import {
  BattleLogger,
  createBattleLogger,
  LogLevel,
} from "../logger/BattleLogger.js";
import { SimpleAI, createSimpleAI } from "../ai/SimpleAI.js";
import { SKILL_CONFIGS, type SkillType } from "../config/UnitConfig.js";

// 事件系统
import {
  BattleEventBus,
  createBattleEventBus,
  createBattleStartEvent,
  createBattleEndEvent,
  createRoundStartEvent,
  createRoundEndEvent,
  createTurnStartEvent,
  createTurnEndEvent,
  createSkipTurnEvent,
  createMoveEvent,
  type BattleEvent,
  type DamageEvent,
  type HealEvent,
  type DeathEvent,
  type SkillUseEvent,
  type CooldownEvent,
} from "../events/index.js";

// 技能系统
import {
  SkillExecutor,
  createSkillExecutor,
  SkillRegistry,
  type ITargetResolver,
} from "../skills/index.js";

// 回放系统
import {
  BattleReplayRecorder,
  createBattleReplayRecorder,
  ReplayFileManager,
  createReplayFileManager,
  type IBattleReplay,
} from "../replay/index.js";

/**
 * 回合制战斗配置
 */
export interface TurnBasedBattleConfig {
  /** 最大回合数（防止无限循环） */
  maxRounds: number;
  /** 是否启用日志 */
  enableLog: boolean;
  /** 是否详细日志 */
  verboseLog: boolean;
  /** 随机数种子（用于确定性测试） */
  seed?: number;
  /** 是否启用回放录制 */
  enableReplay?: boolean;
  /** 回放保存目录 */
  replayDirectory?: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: TurnBasedBattleConfig = {
  maxRounds: 100,
  enableLog: true,
  verboseLog: true,
  enableReplay: true,
  replayDirectory: "./Replays",
};

/**
 * 回合制战斗实例
 */
export class TurnBasedBattle extends GameplayInstance {
  readonly type = "TurnBasedBattle";

  // ========== 配置 ==========

  private _config: TurnBasedBattleConfig;

  // ========== 状态机 ==========

  /** 当前阶段 */
  private _stage: BattleStage = BattleStage.None;

  /** 阶段状态 */
  private _stageStatus: StageStatus = StageStatus.Idle;

  /** 等待信号列表 */
  private _waitSignals: Set<WaitSignal> = new Set();

  // ========== 战斗上下文 ==========

  /** 战斗上下文 */
  private _context: BattleContext;

  // ========== 组件 ==========

  /** 战斗日志器 */
  private _logger: BattleLogger;

  /** AI 决策系统 */
  private _ai: SimpleAI;

  /** 事件总线 */
  private _eventBus: BattleEventBus;

  /** 技能执行器 */
  private _skillExecutor: SkillExecutor;

  /** 目标解析器（实现 ITargetResolver） */
  private _targetResolver: ITargetResolver;

  // ========== 回放系统 ==========

  /** 回放录制器 */
  private _replayRecorder: BattleReplayRecorder | null = null;

  /** 回放文件管理器 */
  private _replayFileManager: ReplayFileManager | null = null;

  /** 随机数种子 */
  private _seed: number;

  // ========== 队伍管理 ==========

  /** 队伍 A（玩家/teamId=0） */
  private _teamA: BattleUnit[] = [];

  /** 队伍 B（敌方/teamId=1） */
  private _teamB: BattleUnit[] = [];

  constructor(battleId?: string, config: Partial<TurnBasedBattleConfig> = {}) {
    super(battleId);
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._context = new BattleContext();
    this._logger = createBattleLogger(this.id, {
      enabled: this._config.enableLog,
      verbose: this._config.verboseLog,
      minLevel: this._config.verboseLog ? LogLevel.Debug : LogLevel.Info,
    });
    this._ai = createSimpleAI(this._config.seed);

    // 生成或使用提供的种子
    this._seed = this._config.seed ?? Math.floor(Math.random() * 2147483647);

    // 创建事件总线
    this._eventBus = createBattleEventBus();

    // 创建目标解析器
    this._targetResolver = this.createTargetResolver();

    // 创建技能执行器
    this._skillExecutor = createSkillExecutor(
      this.eventCollector,
      this._targetResolver,
    );

    // 注册日志监听器
    this.setupEventListeners();

    // 初始化回放系统
    if (this._config.enableReplay) {
      this._replayRecorder = createBattleReplayRecorder({
        battleId: this.id,
        seed: this._seed,
        maxRounds: this._config.maxRounds,
        tickInterval: 100,
        gameVersion: "1.0.0",
      });

      this._replayFileManager = createReplayFileManager(
        this._config.replayDirectory!,
      );
    }
  }

  /**
   * 创建目标解析器
   */
  private createTargetResolver(): ITargetResolver {
    return {
      getEnemies: (source: BattleUnit) => {
        return source.teamId === 0
          ? this.getTeamAliveUnits(1)
          : this.getTeamAliveUnits(0);
      },

      getAllies: (source: BattleUnit) => {
        return source.teamId === 0
          ? this.getTeamAliveUnits(0)
          : this.getTeamAliveUnits(1);
      },

      getUnitsInRange: (
        center: BattleUnit,
        radius: number,
        candidates: BattleUnit[],
      ) => {
        return candidates.filter((unit) => {
          const distance = this.calculateDistance(
            center.gridPosition,
            unit.gridPosition,
          );
          return distance <= radius;
        });
      },

      getDistance: (a: BattleUnit, b: BattleUnit) => {
        return this.calculateDistance(a.gridPosition, b.gridPosition);
      },
    };
  }

  /**
   * 设置事件监听器
   *
   * 将事件转发给日志系统
   */
  private setupEventListeners(): void {
    // 监听伤害事件
    this._eventBus.on("battle.damage", (event: DamageEvent) => {
      const source = this.getUnit(event.sourceId);
      const target = this.getUnit(event.targetId);
      if (source && target) {
        this._logger.damage(
          source,
          target,
          event.damage,
          event.isCrit,
          event.remainingHp,
        );
      }
    });

    // 监听治疗事件
    this._eventBus.on("battle.heal", (event: HealEvent) => {
      const source = this.getUnit(event.sourceId);
      const target = this.getUnit(event.targetId);
      if (source && target) {
        this._logger.heal(source, target, event.amount, event.currentHp);
      }
    });

    // 监听死亡事件
    this._eventBus.on("battle.death", (event: DeathEvent) => {
      const unit = this.getUnit(event.unitId);
      const killer = event.killerId ? this.getUnit(event.killerId) : undefined;
      if (unit) {
        this._logger.death(unit, killer);
      }
    });

    // 监听技能使用事件
    this._eventBus.on("battle.skillUse", (event: SkillUseEvent) => {
      // 日志在 characterAction 中处理，这里可以扩展其他功能
    });

    // 监听冷却事件
    this._eventBus.on("battle.cooldown", (event: CooldownEvent) => {
      const unit = this.getUnit(event.unitId);
      if (unit) {
        this._logger.cooldownTriggered(unit, event.skillName, event.cooldown);
      }
    });
  }

  // ========== 属性访问 ==========

  // ========== 属性访问 ==========

  get stage(): BattleStage {
    return this._stage;
  }

  get stageStatus(): StageStatus {
    return this._stageStatus;
  }

  get context(): BattleContext {
    return this._context;
  }

  get round(): number {
    return this._context.round;
  }

  get teamA(): readonly BattleUnit[] {
    return this._teamA;
  }

  get teamB(): readonly BattleUnit[] {
    return this._teamB;
  }

  get battleResult(): BattleResult {
    return this._context.battleResult;
  }

  get eventBus(): BattleEventBus {
    return this._eventBus;
  }

  get seed(): number {
    return this._seed;
  }

  get replayRecorder(): BattleReplayRecorder | null {
    return this._replayRecorder;
  }

  // ========== 单位管理 ==========

  /**
   * 添加单位到队伍 A
   */
  addToTeamA(unit: BattleUnit): void {
    unit.setTeamId(0);
    this._teamA.push(unit);
    this.actors.push(unit);
    this._context.registerCharacter(unit.id, 0);
    // 注册死亡回调，自动同步到 BattleContext
    this.registerDeathCallback(unit);
  }

  /**
   * 添加单位到队伍 B
   */
  addToTeamB(unit: BattleUnit): void {
    unit.setTeamId(1);
    this._teamB.push(unit);
    this.actors.push(unit);
    this._context.registerCharacter(unit.id, 1);
    // 注册死亡回调，自动同步到 BattleContext
    this.registerDeathCallback(unit);
  }

  /**
   * 注册单位死亡回调
   *
   * 当单位死亡时，自动更新 BattleContext 状态
   */
  private registerDeathCallback(unit: BattleUnit): void {
    unit.onDeathCallback((deadUnit) => {
      this._context.handleCharacterDeath(deadUnit.id);
    });
  }

  /**
   * 获取单位（通过 ID）
   */
  getUnit(id: string): BattleUnit | undefined {
    return this.actors.find((a) => a.id === id) as BattleUnit | undefined;
  }

  /**
   * 获取所有存活单位
   */
  getAliveUnits(): BattleUnit[] {
    return this.actors.filter((a) => a.isActive && !a.isDead) as BattleUnit[];
  }

  /**
   * 获取队伍存活单位
   */
  getTeamAliveUnits(teamId: number): BattleUnit[] {
    const team = teamId === 0 ? this._teamA : this._teamB;
    return team.filter((u) => u.isActive && !u.isDead);
  }

  // ========== 生命周期 ==========

  protected override onStart(): void {
    // 检查队伍
    if (this._teamA.length === 0 || this._teamB.length === 0) {
      this._logger.error("战斗无法开始：队伍为空");
      this.end();
      return;
    }

    // 开始回放录制
    if (this._replayRecorder) {
      const allUnits = [...this._teamA, ...this._teamB];
      this._replayRecorder.startRecording(allUnits);
    }

    // 开始战斗
    this.changeStage(BattleStage.GameStart);
  }

  protected override onEnd(): void {
    this._logger.info("战斗实例已结束");
  }

  // ========== 主循环 ==========

  /**
   * 推进战斗逻辑
   */
  override tick(_dt: number): GameEventBase[] {
    if (!this.isRunning) {
      return [];
    }

    // 状态机主循环
    switch (this._stageStatus) {
      case StageStatus.Enter:
        this.processStageEnter();
        break;

      case StageStatus.Idle:
        // 空闲状态，等待外部推进或状态机自动推进
        break;

      case StageStatus.Pending:
        this.processStagePending();
        break;
    }

    // 分发收集到的事件给监听器
    const events = this.eventCollector.flush();
    this._eventBus.dispatch(events);

    return events;
  }

  /**
   * 处理阶段进入
   */
  private processStageEnter(): void {
    this._stageStatus = StageStatus.Idle;

    switch (this._stage) {
      case BattleStage.None:
        break;

      case BattleStage.GameStart:
        this.onGameStart();
        break;

      case BattleStage.NewRound:
        this.onNewRound();
        break;

      case BattleStage.CharacterGetTurn:
        this.onCharacterGetTurn();
        break;

      case BattleStage.BeforeReleaseAbility:
        this.onBeforeReleaseAbility();
        break;

      case BattleStage.ReleaseAbility:
        this.onReleaseAbility();
        break;

      case BattleStage.AfterReleaseAbility:
        this.onAfterReleaseAbility();
        break;

      case BattleStage.CharacterEndTurn:
        this.onCharacterEndTurn();
        break;

      case BattleStage.RoundEnd:
        this.onRoundEnd();
        break;

      case BattleStage.GameOver:
        this.onGameOver();
        break;
    }
  }

  /**
   * 处理等待状态
   */
  private processStagePending(): void {
    // 检查是否所有信号都已完成
    if (this._waitSignals.size === 0) {
      this._stageStatus = StageStatus.Idle;
      this.onStagePendingComplete();
    }
  }

  /**
   * 等待完成后的状态转换
   */
  private onStagePendingComplete(): void {
    switch (this._stage) {
      case BattleStage.GameStart:
        this.changeStage(BattleStage.NewRound);
        break;

      case BattleStage.NewRound:
        this.changeStage(BattleStage.CharacterGetTurn);
        break;

      case BattleStage.CharacterGetTurn:
        if (this._context.cachedCurrentCharacterIsStun) {
          // 眩晕状态，跳过行动
          this.changeStage(BattleStage.CharacterEndTurn);
        } else {
          // AI 决策
          this.aiMakeDecision();
          this.changeStage(BattleStage.BeforeReleaseAbility);
        }
        break;

      case BattleStage.BeforeReleaseAbility:
        this.changeStage(BattleStage.ReleaseAbility);
        break;

      case BattleStage.ReleaseAbility:
        this.changeStage(BattleStage.AfterReleaseAbility);
        break;

      case BattleStage.AfterReleaseAbility:
        if (this.checkGameOver()) {
          this.changeStage(BattleStage.GameOver);
        } else {
          this.checkCharacterTurnOver();
        }
        break;

      case BattleStage.CharacterEndTurn:
        if (this.checkGameOver()) {
          this.changeStage(BattleStage.GameOver);
        } else if (this._context.isLastActionInRound()) {
          this.changeStage(BattleStage.RoundEnd);
        } else {
          this.changeStage(BattleStage.CharacterGetTurn);
        }
        break;

      case BattleStage.RoundEnd:
        this.changeStage(BattleStage.NewRound);
        break;

      case BattleStage.GameOver:
        // 战斗结束，不再转换
        break;
    }
  }

  // ========== 阶段处理函数 ==========

  /**
   * 游戏开始
   */
  private onGameStart(): void {
    this._logger.battleStart(this._teamA, this._teamB);

    // 发出战斗开始事件
    this.eventCollector.push(
      createBattleStartEvent(
        this.id,
        this._teamA.map((u) => u.id),
        this._teamB.map((u) => u.id),
      ),
    );

    // 启动等待（这里可以等待开场动画等）
    this.startPending(WaitSignal.WaitGeneralPerformEnd);

    // 立即完成（无动画）
    this.completeSignal(WaitSignal.WaitGeneralPerformEnd);
  }

  /**
   * 新回合开始
   */
  private onNewRound(): void {
    this.startPending(WaitSignal.WaitGeneralPerformEnd);

    // 回合计数增加
    this._context.startNewRound();

    // 检查最大回合数
    if (this._context.round > this._config.maxRounds) {
      this._logger.warn(`超过最大回合数 ${this._config.maxRounds}，强制结束`);
      this._context.setBattleResult(BattleResult.Draw);
      this.completeSignal(WaitSignal.WaitGeneralPerformEnd);
      this.changeStage(BattleStage.GameOver);
      return;
    }

    // 获取所有存活角色
    const aliveUnits = this.getAliveUnits();

    // 按速度排序（速度相同时随机）
    const sortedUnits = [...aliveUnits].sort((a, b) => {
      const speedDiff = b.speed - a.speed;
      if (speedDiff !== 0) return speedDiff;
      return Math.random() > 0.5 ? 1 : -1;
    });

    // 设置行动队列
    this._context.setActionQueue(sortedUnits.map((u) => u.id));

    // 所有角色回合开始处理
    for (const unit of aliveUnits) {
      unit.onRoundStart();
    }

    // 发出回合开始事件
    this.eventCollector.push(
      createRoundStartEvent(
        this._context.round,
        sortedUnits.map((u) => u.id),
      ),
    );

    // 日志输出
    this._logger.roundStart(this._context.round, sortedUnits);

    // 回放：记录回合开始
    if (this._replayRecorder) {
      this._replayRecorder.beginRound(
        this._context.round,
        sortedUnits.map((u) => u.id),
      );
    }

    this.completeSignal(WaitSignal.WaitGeneralPerformEnd);
  }

  /**
   * 角色获得行动权
   */
  private onCharacterGetTurn(): void {
    // 推进到下一个行动角色
    const characterId = this._context.nextActionCharacter();

    if (!characterId) {
      // 所有角色都行动完毕，进入回合结束
      this.changeStage(BattleStage.RoundEnd);
      return;
    }

    const character = this.getUnit(characterId);

    if (!character || character.isDead) {
      // 角色已死亡，跳过
      this.changeStage(BattleStage.CharacterEndTurn);
      return;
    }

    // 触发获得回合事件
    character.onGetTurn();

    // 发出行动开始事件
    this.eventCollector.push(
      createTurnStartEvent(
        character.id,
        character.hp,
        character.maxHp,
        character.actionPoint,
        character.maxActionPoint,
      ),
    );

    // 日志
    this._logger.characterGetTurn(character);

    // 启动等待
    this.startPending(WaitSignal.WaitAbilityPerformEnd);

    // 检查眩晕状态
    const isStunned = this._context.isCharacterStunned(characterId);
    this._context.setCachedStunState(isStunned);

    if (isStunned) {
      this._logger.characterSkipTurn(character, "眩晕");
      this.eventCollector.push(createSkipTurnEvent(characterId, "眩晕"));

      // 回放：记录跳过的行动
      if (this._replayRecorder) {
        this._replayRecorder.recordSkippedTurn(characterId, "眩晕");
      }
    }

    // 完成等待（无动画）
    this.completeSignal(WaitSignal.WaitAbilityPerformEnd);
  }

  /**
   * 技能释放前
   */
  private onBeforeReleaseAbility(): void {
    this.startPending(WaitSignal.WaitAbilityPerformEnd);

    // 这里可以处理离开控制区、借机攻击等逻辑
    // 当前简化实现，直接完成

    this.completeSignal(WaitSignal.WaitAbilityPerformEnd);
  }

  /**
   * 释放技能/执行行动
   */
  private onReleaseAbility(): void {
    const characterId = this._context.getCurrentCharacterId();
    if (!characterId) {
      this.changeStage(BattleStage.CharacterEndTurn);
      return;
    }

    const character = this.getUnit(characterId);
    if (!character || character.isDead) {
      this.changeStage(BattleStage.CharacterEndTurn);
      return;
    }

    this.startPending(WaitSignal.WaitAbilityPerformEnd);

    // 执行当前命令
    const command = this._context.currentCommand;
    if (command) {
      this.executeCommand(character, command);
    }

    this.completeSignal(WaitSignal.WaitAbilityPerformEnd);
  }

  /**
   * 技能释放后
   */
  private onAfterReleaseAbility(): void {
    this.startPending(WaitSignal.WaitAbilityPerformEnd);

    // 处理控制区进入等逻辑
    // 当前简化实现

    // 清除当前命令
    this._context.clearCurrentCommand();

    this.completeSignal(WaitSignal.WaitAbilityPerformEnd);
  }

  /**
   * 角色结束行动
   */
  private onCharacterEndTurn(): void {
    this.startPending(WaitSignal.WaitAbilityPerformEnd);

    const characterId = this._context.getCurrentCharacterId();
    if (characterId) {
      const character = this.getUnit(characterId);
      if (character && !character.isDead) {
        character.onEndTurn();
        this._logger.characterEndTurn(character);
        this.eventCollector.push(createTurnEndEvent(characterId));
      }
    }

    this.completeSignal(WaitSignal.WaitAbilityPerformEnd);
  }

  /**
   * 回合结束
   */
  private onRoundEnd(): void {
    this.startPending(WaitSignal.WaitGeneralPerformEnd);

    // 清理死亡角色等
    const aliveA = this.getTeamAliveUnits(0).length;
    const aliveB = this.getTeamAliveUnits(1).length;

    // 发出回合结束事件
    this.eventCollector.push(
      createRoundEndEvent(this._context.round, aliveA, aliveB),
    );

    this._logger.roundEnd(this._context.round, aliveA, aliveB);

    // 回放：结束回合
    if (this._replayRecorder) {
      const allUnits = [...this._teamA, ...this._teamB];
      this._replayRecorder.endRound(allUnits);
    }

    this.completeSignal(WaitSignal.WaitGeneralPerformEnd);
  }

  /**
   * 游戏结束
   */
  private onGameOver(): void {
    // 发出战斗结束事件
    const resultMap: Record<string, "Victory" | "Defeat" | "Draw"> = {
      Victory: "Victory",
      Defeat: "Defeat",
      Draw: "Draw",
    };
    this.eventCollector.push(
      createBattleEndEvent(
        this.id,
        resultMap[this._context.battleResult] ?? "Draw",
        this._context.winnerTeamId,
        this._context.round,
      ),
    );

    this._logger.battleEnd(
      this._context.battleResult,
      this._context.winnerTeamId,
      this._context.round,
    );

    // 保存回放
    this.saveReplay();

    // 结束实例
    this.end();
  }

  /**
   * 保存回放文件
   */
  private saveReplay(): void {
    if (!this._replayRecorder || !this._replayFileManager) {
      return;
    }

    try {
      const resultMap: Record<
        string,
        "Victory" | "Defeat" | "Draw" | "Unknown"
      > = {
        Victory: "Victory",
        Defeat: "Defeat",
        Draw: "Draw",
        None: "Unknown",
      };

      const replay = this._replayRecorder.stopRecording(
        resultMap[this._context.battleResult] ?? "Unknown",
        this._context.winnerTeamId,
      );

      const filename = this._replayFileManager.saveReplaySync(replay);
      this._logger.info(`📼 回放已保存: ${filename}`);
    } catch (error) {
      this._logger.error(`保存回放失败: ${error}`);
    }
  }

  /**
   * 获取回放数据（不保存文件）
   */
  getReplayData(): IBattleReplay | null {
    if (!this._replayRecorder) {
      return null;
    }

    const resultMap: Record<string, "Victory" | "Defeat" | "Draw" | "Unknown"> =
      {
        Victory: "Victory",
        Defeat: "Defeat",
        Draw: "Draw",
        None: "Unknown",
      };

    return this._replayRecorder.stopRecording(
      resultMap[this._context.battleResult] ?? "Unknown",
      this._context.winnerTeamId,
    );
  }

  // ========== AI 决策 ==========

  /**
   * AI 做出决策
   */
  private aiMakeDecision(): void {
    const characterId = this._context.getCurrentCharacterId();
    if (!characterId) return;

    const character = this.getUnit(characterId);
    if (!character) return;

    // 获取队友和敌人
    const allies =
      character.teamId === 0
        ? this.getTeamAliveUnits(0)
        : this.getTeamAliveUnits(1);
    const enemies =
      character.teamId === 0
        ? this.getTeamAliveUnits(1)
        : this.getTeamAliveUnits(0);

    // AI 决策
    const decision = this._ai.makeDecision(character, allies, enemies);

    // 设置当前命令
    this._context.setCurrentCommand(decision.command);
  }

  /**
   * 检查角色行动是否结束
   */
  private checkCharacterTurnOver(): void {
    const characterId = this._context.getCurrentCharacterId();
    if (!characterId) {
      this.changeStage(BattleStage.CharacterEndTurn);
      return;
    }

    const character = this.getUnit(characterId);
    if (!character) {
      this.changeStage(BattleStage.CharacterEndTurn);
      return;
    }

    // 检查是否可以继续行动
    const canContinue =
      !character.isDead &&
      character.canContinueAction() &&
      !this._context.isCharacterStunned(characterId);

    if (canContinue) {
      // 可以继续行动，重新决策
      this.aiMakeDecision();
      this.changeStage(BattleStage.BeforeReleaseAbility);
    } else {
      // 行动结束
      this.changeStage(BattleStage.CharacterEndTurn);
    }
  }

  // ========== 命令执行 ==========

  /**
   * 执行命令
   */
  private executeCommand(executor: BattleUnit, command: BattleCommand): void {
    // 日志
    this._logger.characterAction(
      executor,
      command,
      this._context.currentCommand ? "" : "无命令",
    );

    // 记录执行前的事件数量，用于收集本次行动产生的事件
    const eventCountBefore = this.eventCollector.count;

    switch (command.type) {
      case "ability":
        this.executeAbility(executor, command);
        break;

      case "move":
        this.executeMove(executor, command);
        break;

      case "idle":
        this.executeIdle(executor);
        break;
    }

    // 回放：记录本次行动
    if (this._replayRecorder) {
      // 收集本次行动产生的事件
      const allEvents = this.eventCollector.collect();
      const turnEvents = allEvents.slice(eventCountBefore) as BattleEvent[];

      // 获取 AI 决策信息（如果有）
      const currentCommand = this._context.currentCommand;
      const aiReason = currentCommand?.customData?.aiReason as
        | string
        | undefined;
      const aiScore = currentCommand?.customData?.aiScore as number | undefined;

      this._replayRecorder.recordTurn(
        executor.id,
        command,
        turnEvents,
        aiReason,
        aiScore,
      );
    }
  }

  /**
   * 执行技能（使用 SkillExecutor）
   */
  private executeAbility(executor: BattleUnit, command: BattleCommand): void {
    const skillId = command.abilityId || "NormalAttack";

    // 尝试从 SkillRegistry 获取技能定义
    const skillDef = SkillRegistry.get(skillId);

    if (skillDef) {
      // 使用新的技能系统
      let target: BattleUnit | undefined;
      if (command.targetId) {
        target = this.getUnit(command.targetId);
      }

      const result = this._skillExecutor.execute(skillDef, executor, target);

      if (!result.success) {
        this._logger.debug(`技能执行失败: ${skillId}`);
      }
    } else {
      // 回退到旧的硬编码逻辑（兼容性）
      this.executeAbilityLegacy(executor, command);
    }
  }

  /**
   * 旧版技能执行（兼容性保留）
   */
  private executeAbilityLegacy(
    executor: BattleUnit,
    command: BattleCommand,
  ): void {
    const skillType = (command.abilityId as SkillType) || "NormalAttack";
    const skillConfig = SKILL_CONFIGS[skillType];

    if (!skillConfig) {
      this._logger.warn(`未知技能: ${skillType}`);
      return;
    }

    // 消耗行动点
    if (!executor.consumeActionPoint(skillConfig.actionPointCost)) {
      this._logger.debug(`行动点不足: ${skillType}`);
      return;
    }

    // 消耗精力
    if (skillConfig.staminaCost > 0) {
      if (!executor.consumeStamina(skillConfig.staminaCost)) {
        this._logger.debug(`精力不足: ${skillType}`);
        return;
      }
    }

    // 获取目标
    let target: BattleUnit | undefined;
    if (command.targetId) {
      target = this.getUnit(command.targetId);
    }

    // 执行技能效果
    if (skillConfig.isHeal && target) {
      // 治疗
      const healAmount = Math.floor(
        executor.atk * skillConfig.damageMultiplier,
      );
      const actualHeal = target.heal(healAmount);
      this._logger.heal(executor, target, actualHeal, target.hp);
    } else if (skillConfig.damageMultiplier > 0) {
      // 伤害技能
      if (skillConfig.isAoe && target) {
        this.applyAoeDamageLegacy(
          executor,
          target,
          skillType,
          skillConfig.aoeRadius,
        );
      } else if (target) {
        this.applyDamageLegacy(executor, target, skillType);
      }
    }

    // 触发冷却
    executor.triggerCooldown(skillType);
    if (skillConfig.cooldown > 0) {
      this._logger.cooldownTriggered(
        executor,
        skillConfig.name,
        skillConfig.cooldown,
      );
    }
  }

  /**
   * 旧版伤害计算（兼容性保留）
   */
  private applyDamageLegacy(
    source: BattleUnit,
    target: BattleUnit,
    skillType: SkillType,
  ): void {
    const config = SKILL_CONFIGS[skillType];

    // 计算基础伤害
    let damage = Math.floor(source.atk * config.damageMultiplier);

    // 暴击计算
    const isCrit = Math.random() < source.critRate;
    if (isCrit) {
      damage = Math.floor(damage * source.critDamage);
    }

    // 减伤计算
    const reduction = Math.floor(target.def * 0.5);
    damage = Math.max(1, damage - reduction);

    // 应用伤害
    const actualDamage = target.takeDamage(damage);

    // 日志
    this._logger.damage(source, target, actualDamage, isCrit, target.hp);

    if (target.isDead) {
      this._logger.death(target, source);
    }
  }

  /**
   * 旧版 AOE 伤害（兼容性保留）
   */
  private applyAoeDamageLegacy(
    source: BattleUnit,
    primaryTarget: BattleUnit,
    skillType: SkillType,
    radius: number,
  ): void {
    const enemies =
      source.teamId === 0
        ? this.getTeamAliveUnits(1)
        : this.getTeamAliveUnits(0);

    const targetsInRange = enemies.filter((enemy) => {
      const distance = this.calculateDistance(
        primaryTarget.gridPosition,
        enemy.gridPosition,
      );
      return distance <= radius;
    });

    for (const target of targetsInRange) {
      this.applyDamageLegacy(source, target, skillType);
    }

    if (!targetsInRange.includes(primaryTarget) && !primaryTarget.isDead) {
      this.applyDamageLegacy(source, primaryTarget, skillType);
    }
  }

  /**
   * 计算两点间的曼哈顿距离
   */
  private calculateDistance(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * 执行移动
   */
  private executeMove(executor: BattleUnit, command: BattleCommand): void {
    if (!command.targetPosition) {
      return;
    }

    const moveConfig = SKILL_CONFIGS["Move"];

    // 消耗行动点
    if (!executor.consumeActionPoint(moveConfig.actionPointCost)) {
      return;
    }

    // 计算移动距离
    const distance = executor.distanceToPosition(command.targetPosition);
    const staminaCost = distance * moveConfig.staminaCost;

    // 消耗精力
    if (!executor.consumeStamina(staminaCost)) {
      return;
    }

    // 记录旧位置
    const oldPos = executor.gridPosition;

    // 更新位置
    executor.setGridPosition(command.targetPosition);

    // 发出移动事件
    this.eventCollector.push(
      createMoveEvent(executor.id, oldPos, command.targetPosition),
    );

    // 日志
    this._logger.moveComplete(executor, oldPos, command.targetPosition);
  }

  /**
   * 执行待机
   */
  private executeIdle(executor: BattleUnit): void {
    // 待机：清空所有行动点，结束本回合
    while (executor.canContinueAction()) {
      executor.consumeActionPoint(1);
    }
  }

  // ========== 状态机辅助 ==========

  /**
   * 切换阶段
   */
  private changeStage(newStage: BattleStage): void {
    if (this._stage === newStage) {
      this._logger.warn(`阶段已经是 ${newStage}`);
      return;
    }

    if (this._stageStatus !== StageStatus.Idle) {
      this._logger.warn(
        `无法切换阶段: 当前状态为 ${this._stageStatus}，需要 Idle`,
      );
      return;
    }

    const oldStage = this._stage;
    this._stage = newStage;
    this._stageStatus = StageStatus.Enter;

    this._logger.stageChange(oldStage, newStage);
  }

  /**
   * 开始等待
   */
  private startPending(signal: WaitSignal): void {
    if (this._stageStatus !== StageStatus.Idle) {
      this._logger.warn(`无法开始等待: 当前状态为 ${this._stageStatus}`);
      return;
    }

    this._stageStatus = StageStatus.Pending;
    this._waitSignals.add(signal);
    this._logger.signalWait(signal);
  }

  /**
   * 添加等待信号
   */
  private nextPending(signal: WaitSignal): void {
    if (this._stageStatus !== StageStatus.Pending) {
      this._logger.warn(`无法添加信号: 当前状态为 ${this._stageStatus}`);
      return;
    }

    this._waitSignals.add(signal);
    this._logger.signalWait(signal);
  }

  /**
   * 完成等待信号
   */
  private completeSignal(signal: WaitSignal): void {
    if (this._waitSignals.has(signal)) {
      this._waitSignals.delete(signal);
      this._logger.signalComplete(signal);
    } else {
      this._logger.warn(`信号不存在: ${signal}`);
    }
  }

  // ========== 游戏结束检查 ==========

  /**
   * 检查游戏是否结束
   */
  private checkGameOver(): boolean {
    return this._context.checkGameOver();
  }

  // ========== 调试 ==========

  /**
   * 获取调试信息
   */
  getDebugInfo(): object {
    return {
      id: this.id,
      stage: this._stage,
      stageStatus: this._stageStatus,
      waitSignals: Array.from(this._waitSignals),
      context: this._context.getDebugInfo(),
      teamA: this._teamA.map((u) => ({
        id: u.id,
        name: u.displayName,
        hp: `${u.hp}/${u.maxHp}`,
        alive: u.isActive && !u.isDead,
      })),
      teamB: this._teamB.map((u) => ({
        id: u.id,
        name: u.displayName,
        hp: `${u.hp}/${u.maxHp}`,
        alive: u.isActive && !u.isDead,
      })),
    };
  }
}
