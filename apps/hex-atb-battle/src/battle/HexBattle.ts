/**
 * 六边形战斗实例
 */

import fs from 'node:fs';

import {
  GameplayInstance,
  type GameEventBase,
  type AbilitySet,
  type IAbilitySetProvider,
  setDebugLogHandler,
  ProjectileActor,
  EventCollector,
  isProjectileHitEvent,
  isProjectileMissEvent,
  Ability,
  IGameplayStateProvider,
} from '@lomo/logic-game-framework';

import {
  ProjectileSystem,
  DistanceCollisionDetector,
  BattleRecorder,
  ReplayLogPrinter,
} from '@lomo/logic-game-framework/stdlib';

import { HexGridModel, axial, hexNeighbors, hexDistance, type AxialCoord } from '@lomo/hex-grid';

import { CharacterActor } from '../actors/CharacterActor.js';
import { createActionUseEvent } from '../skills/SkillAbilities.js';
import { BattleLogger } from '../logger/BattleLogger.js';
import { INSPIRE_BUFF, INSPIRE_DEF_BONUS, INSPIRE_DURATION_MS } from '../buffs/index.js';

// ========== 战斗常量 ==========

/**
 * 碰撞检测阈值倍数
 * 相邻 hex 中心距离 * 此倍数 = 碰撞检测半径
 * 1.2 表示比相邻距离稍大，确保能检测到边界情况
 */
const COLLISION_THRESHOLD_MULTIPLIER = 1.2;

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

export class HexBattle extends GameplayInstance implements IAbilitySetProvider, IGameplayStateProvider {
  readonly type = 'HexBattle';

  private tickCount = 0;
  private _context!: BattleContext;
  private _logger!: BattleLogger;

  /** 投射物系统 */
  private _projectileSystem!: ProjectileSystem;

  /** 活跃的投射物列表 */
  private _projectiles: ProjectileActor[] = [];

  /** 投射物事件收集器 */
  private _projectileEventCollector!: EventCollector;

  /** 战斗录制器 */
  private _recorder!: BattleRecorder;

  /** 角色位置缓存（用于检测移动，优化世界坐标计算） */
  private _actorHexPositionCache: Map<string, string> = new Map();

  // ========== IAbilitySetProvider 实现 ==========

  /**
   * 根据 Actor ID 获取其 AbilitySet
   *
   * 用于 TagAction、ActiveUseComponent 等需要访问 AbilitySet 的场景
   */
  getAbilitySetForActor(actorId: string): AbilitySet | undefined {
    const actor = this.getActor<CharacterActor>(actorId);
    return actor?.abilitySet;
  }

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

  // ========== 投射物管理 ==========

  /** 添加投射物到战斗 */
  addProjectile(projectile: ProjectileActor, variant?: string): void {
    this._projectiles.push(projectile);

    // 使用强化日志
    const sourceId = projectile.source?.id ?? 'unknown';
    const targetId = projectile.target?.id ?? 'unknown';
    this._logger.projectileLaunched(
      projectile.id,
      sourceId,
      targetId,
      variant ?? projectile.config.projectileType,
      projectile.config.damage ?? 0,
      projectile.config.damageType ?? 'physical',
      projectile.config.speed
    );
  }

  /** 获取活跃投射物数量 */
  get activeProjectileCount(): number {
    return this._projectiles.filter(p => p.isFlying).length;
  }

  protected override onStart(): void {
    // 初始化日志系统
    this._logger = new BattleLogger(this.id);
    setDebugLogHandler((category, message, context) => {
      this._logger.handleFrameworkLog(category, message, context);
    });

    // 初始化投射物系统（碰撞阈值在 HexGridModel 创建后设置）
    this._projectileEventCollector = new EventCollector();

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
    // 使用中心对称的 9x9 地图，hexSize=100 用于世界坐标计算
    const grid = new HexGridModel({
      rows: 9,
      columns: 9,
      hexSize: 100,  // 六边形尺寸（中心到顶点距离）
      orientation: 'flat',
    });

    this._context = {
      grid,
      leftTeam,
      rightTeam,
    };

    // 初始化投射物系统
    // 碰撞阈值使用世界距离（相邻 hex 中心距离 * 碰撞倍数）
    const collisionThreshold = grid.getAdjacentWorldDistance() * COLLISION_THRESHOLD_MULTIPLIER;
    this._projectileSystem = new ProjectileSystem({
      collisionDetector: new DistanceCollisionDetector(collisionThreshold),
      eventCollector: this._projectileEventCollector,
    });

    // 随机放置角色
    // 中心对称地图：9x9 的坐标范围是 [-4, 4]
    // 左方队伍放在左侧 (q: -4~-1)
    // 右方队伍放在右侧 (q: 1~4)
    this.placeTeamRandomly(leftTeam, { qMin: -4, qMax: -1, rMin: -4, rMax: -1 });
    this.placeTeamRandomly(rightTeam, { qMin: 1, qMax: 4, rMin: 1, rMax: 4 });

    // 给每个角色添加振奋 Buff（防御力 +10，持续 2 秒）
    this.applyInspireBuffToAll();

    // 初始化战斗录制器
    this._recorder = new BattleRecorder({
      battleId: this.id,
      tickInterval: 100,
    });
    this._recorder.startRecording(this.allActors, {
      map: { type: 'hex', rows: 9, columns: 9, hexSize: 100 },
    });

    this._logger.log('✅ 战斗开始');
    this.printBattleInfo();
  }

  /** 给所有角色添加振奋 Buff */
  private applyInspireBuffToAll(): void {
    for (const actor of this.allActors) {
      // 注册 Buff 过期回调（仅注册一次）
      actor.abilitySet.onAbilityRevoked((ability, reason, _abilitySet, expireReason) => {
        if (ability.configId === 'buff_inspire') {
          const currentDef = actor.attributeSet.def;
          this._logger.log(
            `💨 ${actor.displayName} 的振奋 Buff 结束 (${expireReason ?? reason}): DEF → ${currentDef}`
          );
        }
      });

      // 为每个角色创建独立的 Ability 实例
      // Ability 构造函数会自动克隆 Component，所以可以安全使用静态配置
      const inspireBuff = new Ability(INSPIRE_BUFF, actor.toRef());
      actor.abilitySet.grantAbility(inspireBuff);

      // 记录 Buff 应用日志
      const currentDef = actor.attributeSet.def;
      this._logger.log(
        `🌟 ${actor.displayName} 获得振奋 Buff: DEF ${currentDef - INSPIRE_DEF_BONUS} → ${currentDef} (+${INSPIRE_DEF_BONUS})，持续 ${INSPIRE_DURATION_MS / 1000} 秒`
      );
    }
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
    const baseEvents = this.baseTick(dt);
    this.tickCount++;

    this._logger.tick(this.tickCount, this.logicTime);

    // 更新投射物系统
    this.tickProjectiles(dt);

    for (const actor of this.aliveActors) {
      // 驱动 AbilitySet（Buff 计时、Tag 过期等）
      actor.abilitySet.tick(dt, this.logicTime);

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

    // 录制当前帧
    this._recorder.recordFrame(this.tickCount, baseEvents);

    // 检查战斗是否结束（简化：100 tick 后结束）
    if (this.tickCount >= 100) {
      this._logger.log('\n✅ 战斗结束（达到最大回合数）');
      this._logger.save();
      this.exportReplay();
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

    // 检查技能是否在冷却中（使用 BattleAbilitySet 的便捷方法）
    const skill = actor.skillAbility;
    const skillReady = !actor.abilitySet.isOnCooldown(skill.id);

    // 如果技能可用，90% 使用技能；否则只能移动
    const useSkill = skillReady && Math.random() > 0.1;

    if (useSkill && enemies.length > 0) {
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

      // 无法移动时，如果技能可用则使用技能
      if (skillReady && enemies.length > 0) {
        const targetActor = enemies[Math.floor(Math.random() * enemies.length)];
        return {
          type: 'skill',
          abilityInstanceId: skill.id,
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

  // ========== 投射物更新 ==========

  /** 更新投射物系统 */
  private tickProjectiles(dt: number): void {
    if (this._projectiles.length === 0) {
      return;
    }

    // 同步角色位置到 Actor.position（使用世界坐标，碰撞检测需要）
    // 优化：仅在位置变化时重新计算世界坐标
    for (const actor of this.allActors) {
      const hexPos = this.getActorPosition(actor);
      if (hexPos) {
        const hexKey = `${hexPos.q},${hexPos.r}`;
        const cachedKey = this._actorHexPositionCache.get(actor.id);

        // 仅当位置变化时更新世界坐标
        if (cachedKey !== hexKey) {
          const worldPos = this._context.grid.coordToWorld(hexPos);
          actor.position = worldPos;
          this._actorHexPositionCache.set(actor.id, hexKey);
        }
      }
    }

    // 获取所有可被命中的 Actor（包括投射物和角色）
    const allActors = [...this._projectiles, ...this.allActors];

    // 更新投射物系统
    this._projectileSystem.tick(allActors, dt);

    // 处理投射物事件
    const events = this._projectileEventCollector.flush();
    for (const event of events) {
      if (isProjectileHitEvent(event)) {
        this.onProjectileHit(event);
      } else if (isProjectileMissEvent(event)) {
        this.onProjectileMiss(event);
      }
    }

    // 清理已完成的投射物
    this._projectiles = this._projectiles.filter(p => p.isFlying);
  }

  /** 处理投射物命中 */
  private onProjectileHit(event: ReturnType<typeof isProjectileHitEvent extends (e: any) => e is infer R ? () => R : never>): void {
    // 找到命中的目标
    const hitEvent = event as any;
    const targetActor = this.getActor<CharacterActor>(hitEvent.target.id);

    if (!targetActor) {
      return;
    }

    // 投射物携带的伤害
    const damage = hitEvent.damage ?? 0;
    const damageType = hitEvent.damageType ?? 'physical';
    const sourceId = hitEvent.source.id;
    const targetId = hitEvent.target.id;

    // 应用伤害
    let actualDamage = 0;
    let targetHpRemaining = 0;
    let isKill = false;

    if (damage > 0 && targetActor.attributeSet) {
      const currentHp = targetActor.attributeSet.hp;
      actualDamage = Math.min(damage, currentHp);
      targetActor.attributeSet.modifyBase('hp', -actualDamage);
      targetHpRemaining = targetActor.attributeSet.hp;

      // 检查死亡
      if (targetHpRemaining <= 0) {
        isKill = true;
        targetActor.onDeath();
      }
    }

    // 使用强化日志
    this._logger.projectileHit(
      hitEvent.projectileId,
      sourceId,
      targetId,
      damage,
      damageType,
      hitEvent.flyTime,
      hitEvent.flyDistance,
      actualDamage,
      targetHpRemaining,
      isKill
    );
  }

  /** 处理投射物未命中 */
  private onProjectileMiss(event: any): void {
    this._logger.projectileMiss(
      event.projectileId,
      event.source.id,
      event.target?.id,
      event.reason,
      event.flyTime
    );
  }

  // ========== 回放导出 ==========

  /** 导出战斗回放 */
  private exportReplay(): void {
    const record = this._recorder.stopRecording('completed');

    // 保存 JSON 文件
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Replays/replay_${timestamp}.json`;

    try {
      // 确保目录存在
      if (!fs.existsSync('Replays')) {
        fs.mkdirSync('Replays', { recursive: true });
      }

      const json = JSON.stringify(record, null, 2);
      fs.writeFileSync(filename, json);
      console.log(`\n🎥 回放已保存: ${filename}`);

      // 打印回放日志摘要
      console.log('\n📋 回放日志摘要:');
      console.log('-'.repeat(50));
      const log = ReplayLogPrinter.print(record);
      // 只打印前 50 行
      const lines = log.split('\n');
      const preview = lines.slice(0, 50).join('\n');
      console.log(preview);
      if (lines.length > 50) {
        console.log(`\n... (共 ${lines.length} 行，完整日志见文件)`);
      }
    } catch (error) {
      console.error('❌ 保存回放失败:', error);
    }
  }
}
