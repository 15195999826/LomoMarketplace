/**
 * ProjectileSystem - 投射物系统
 *
 * 管理所有活跃投射物的更新、碰撞检测和生命周期。
 *
 * ## 职责
 *
 * 1. 每帧更新所有飞行中的投射物位置
 * 2. 检测碰撞（通过可配置的碰撞检测器）
 * 3. 处理命中/未命中逻辑
 * 4. 发出生命周期事件
 *
 * ## 碰撞检测
 *
 * 碰撞检测是抽象的，通过 ICollisionDetector 接口实现。
 * 游戏层需要提供具体的碰撞检测实现：
 * - 简单距离检测（适用于大多数场景）
 * - 物理引擎碰撞（复杂场景）
 * - 网格碰撞（策略游戏）
 *
 * ## 使用示例
 *
 * ```typescript
 * const projectileSystem = new ProjectileSystem({
 *   collisionDetector: new DistanceCollisionDetector(50),
 * });
 *
 * instance.registerSystem(projectileSystem);
 * ```
 */

import { System, SystemPriority } from '../../core/entity/System.js';
import type { Actor } from '../../core/entity/Actor.js';
import { ProjectileActor } from '../../core/entity/ProjectileActor.js';
import type { EventCollector } from '../../core/events/EventCollector.js';
import type { ActorRef } from '../../core/types/common.js';
import { Vector3 } from '@lomo/core';
import {
  createProjectileHitEvent,
  createProjectileMissEvent,
  createProjectileDespawnEvent,
  createProjectilePierceEvent,
} from '../../core/events/ProjectileEvents.js';
import { getLogger } from '../../core/utils/Logger.js';

/**
 * 碰撞检测结果
 */
export interface CollisionResult {
  /** 是否发生碰撞 */
  hit: boolean;
  /** 命中的目标（如果有） */
  target?: ActorRef;
  /** 碰撞位置 */
  hitPosition?: Vector3;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 碰撞检测器接口
 *
 * 游戏层实现此接口来提供碰撞检测逻辑
 */
export interface ICollisionDetector {
  /**
   * 检测投射物与可能目标的碰撞
   *
   * @param projectile 投射物
   * @param potentialTargets 潜在目标列表（已排除已命中和同阵营）
   * @returns 碰撞结果
   */
  detect(projectile: ProjectileActor, potentialTargets: Actor[]): CollisionResult;
}

/**
 * 简单距离碰撞检测器
 *
 * 基于距离阈值的碰撞检测实现
 */
export class DistanceCollisionDetector implements ICollisionDetector {
  constructor(private hitDistance: number = 50) {}

  detect(projectile: ProjectileActor, potentialTargets: Actor[]): CollisionResult {
    const projectilePos = projectile.position;
    if (!projectilePos) {
      return { hit: false };
    }

    for (const target of potentialTargets) {
      const targetPos = target.position;
      if (!targetPos) {
        continue;
      }

      const dx = targetPos.x - projectilePos.x;
      const dy = targetPos.y - projectilePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.hitDistance) {
        return {
          hit: true,
          target: target.toRef(),
          hitPosition: new Vector3(projectilePos.x, projectilePos.y, projectilePos.z ?? 0),
        };
      }
    }

    return { hit: false };
  }
}

/**
 * MobaBullet 碰撞检测器
 *
 * 基于飞行距离和目标距离的必中检测
 * 当投射物飞行距离足够接近目标时判定命中
 */
export class MobaCollisionDetector implements ICollisionDetector {
  detect(projectile: ProjectileActor, potentialTargets: Actor[]): CollisionResult {
    if (projectile.config.projectileType !== 'moba') {
      return { hit: false };
    }

    const target = projectile.target;
    if (!target) {
      return { hit: false };
    }

    // 使用投射物自己的 shouldMobaHit 判断
    if (projectile.shouldMobaHit()) {
      return {
        hit: true,
        target,
        hitPosition: projectile.position ? new Vector3(projectile.position.x, projectile.position.y, projectile.position.z ?? 0) : undefined,
      };
    }

    return { hit: false };
  }
}

/**
 * 复合碰撞检测器
 *
 * 组合多个检测器，依次尝试
 */
export class CompositeCollisionDetector implements ICollisionDetector {
  private detectors: ICollisionDetector[] = [];

  add(detector: ICollisionDetector): this {
    this.detectors.push(detector);
    return this;
  }

  detect(projectile: ProjectileActor, potentialTargets: Actor[]): CollisionResult {
    for (const detector of this.detectors) {
      const result = detector.detect(projectile, potentialTargets);
      if (result.hit) {
        return result;
      }
    }
    return { hit: false };
  }
}

/**
 * ProjectileSystem 配置
 */
export interface ProjectileSystemConfig {
  /** 碰撞检测器 */
  collisionDetector?: ICollisionDetector;
  /** 事件收集器（如果不提供则使用 instance 的） */
  eventCollector?: EventCollector;
  /** 是否自动移除完成的投射物 */
  autoRemove?: boolean;
}

/**
 * ProjectileSystem
 *
 * 投射物更新和碰撞处理系统
 */
export class ProjectileSystem extends System {
  readonly type = 'ProjectileSystem';

  private config: ProjectileSystemConfig;
  private collisionDetector: ICollisionDetector;
  private eventCollector?: EventCollector;

  /** 待移除的投射物 ID */
  private pendingRemoval: Set<string> = new Set();

  constructor(config: ProjectileSystemConfig = {}) {
    super(SystemPriority.NORMAL);
    this.config = config;
    this.collisionDetector = config.collisionDetector ?? new DistanceCollisionDetector();
    this.eventCollector = config.eventCollector;
  }

  /**
   * 设置事件收集器
   */
  setEventCollector(collector: EventCollector): void {
    this.eventCollector = collector;
  }

  /**
   * 每帧更新
   */
  tick(actors: Actor[], dt: number): void {
    const logicTime = this.getLogicTime();

    // 分离投射物和潜在目标
    const projectiles: ProjectileActor[] = [];
    const potentialTargets: Actor[] = [];

    for (const actor of actors) {
      if (actor instanceof ProjectileActor) {
        if (actor.isFlying) {
          projectiles.push(actor);
        }
      } else if (actor.isActive) {
        potentialTargets.push(actor);
      }
    }

    // 更新每个投射物
    for (const projectile of projectiles) {
      this.updateProjectile(projectile, potentialTargets, dt, logicTime);
    }

    // 处理待移除的投射物
    if (this.config.autoRemove !== false) {
      this.processPendingRemoval(actors);
    }
  }

  /**
   * 更新单个投射物
   */
  private updateProjectile(
    projectile: ProjectileActor,
    potentialTargets: Actor[],
    dt: number,
    logicTime: number
  ): void {
    // HitScan 立即处理
    if (projectile.config.projectileType === 'hitscan') {
      this.processHitScan(projectile, potentialTargets, logicTime);
      return;
    }

    // 更新位置
    const stillFlying = projectile.update(dt);

    if (!stillFlying) {
      // 超时或其他原因停止
      if (projectile.projectileState === 'missed') {
        this.emitMissEvent(projectile, 'timeout', logicTime);
      }
      this.markForRemoval(projectile);
      return;
    }

    // 碰撞检测
    const validTargets = this.filterValidTargets(projectile, potentialTargets);
    const collision = this.collisionDetector.detect(projectile, validTargets);

    if (collision.hit && collision.target) {
      this.processHit(projectile, collision, logicTime);
    }
  }

  /**
   * 处理 HitScan 投射物
   */
  private processHitScan(
    projectile: ProjectileActor,
    potentialTargets: Actor[],
    logicTime: number
  ): void {
    const validTargets = this.filterValidTargets(projectile, potentialTargets);

    // 如果有指定目标，优先命中该目标
    if (projectile.target) {
      const targetActor = potentialTargets.find((a) => a.id === projectile.target!.id);
      if (targetActor && targetActor.isActive) {
        const hitPosition = projectile.position ?? targetActor.position ?? new Vector3(0, 0, 0);
        projectile.hit(projectile.target.id);
        this.emitHitEvent(projectile, projectile.target, hitPosition, logicTime);
        this.markForRemoval(projectile);
        return;
      }
    }

    // 否则检测碰撞
    const collision = this.collisionDetector.detect(projectile, validTargets);
    if (collision.hit && collision.target) {
      projectile.hit(collision.target.id);
      this.emitHitEvent(
        projectile,
        collision.target,
        collision.hitPosition ?? projectile.position ?? new Vector3(0, 0, 0),
        logicTime
      );
    } else {
      projectile.miss('no_target');
      this.emitMissEvent(projectile, 'no_target', logicTime);
    }

    this.markForRemoval(projectile);
  }

  /**
   * 处理命中
   */
  private processHit(
    projectile: ProjectileActor,
    collision: CollisionResult,
    logicTime: number
  ): void {
    if (!collision.target || !collision.hitPosition) {
      return;
    }

    const continueFlying = projectile.hit(collision.target.id);

    if (continueFlying) {
      // 穿透
      this.emitPierceEvent(projectile, collision.target, collision.hitPosition, logicTime);
    } else {
      // 最终命中
      this.emitHitEvent(projectile, collision.target, collision.hitPosition, logicTime);
      this.markForRemoval(projectile);
    }
  }

  /**
   * 过滤有效目标
   *
   * 排除：
   * - 已命中的目标（穿透弹）
   * - 同阵营目标（如果投射物有来源）
   * - 发射者自己
   */
  private filterValidTargets(
    projectile: ProjectileActor,
    potentialTargets: Actor[]
  ): Actor[] {
    const sourceId = projectile.source?.id;

    return potentialTargets.filter((target) => {
      // 排除自己
      if (sourceId && target.id === sourceId) {
        return false;
      }

      // 排除已命中的目标
      if (projectile.hasHitTarget(target.id)) {
        return false;
      }

      // 可以在这里添加阵营检测等逻辑
      // 暂时不做阵营过滤，由游戏层在 collisionDetector 中处理

      return true;
    });
  }

  /**
   * 标记待移除
   *
   * 注意：不调用 despawn()，保留投射物的最终状态（hit/missed）
   * despawn() 应该由 GameplayInstance 在移除 Actor 时调用
   */
  private markForRemoval(projectile: ProjectileActor): void {
    this.pendingRemoval.add(projectile.id);
    // 不调用 projectile.despawn()，保留 hit/missed 状态
  }

  /**
   * 处理待移除的投射物
   */
  private processPendingRemoval(actors: Actor[]): void {
    if (this.pendingRemoval.size === 0) {
      return;
    }

    // 这里只是标记，实际移除由 GameplayInstance 处理
    // 因为 System 不应该直接修改 actors 数组
    this.pendingRemoval.clear();
  }

  // ========== 事件发送 ==========

  private emitHitEvent(
    projectile: ProjectileActor,
    target: ActorRef,
    hitPosition: Vector3,
    logicTime: number
  ): void {
    if (!this.eventCollector) {
      getLogger().warn('ProjectileSystem: No eventCollector configured');
      return;
    }

    const source = projectile.source ?? { id: 'unknown' };
    const event = createProjectileHitEvent(
      projectile.id,
      source,
      target,
      hitPosition,
      projectile.flyTime,
      projectile.flyDistance,
      {
        damage: projectile.config.damage,
        damageType: projectile.config.damageType,
      }
    );

    this.eventCollector.push(event);
  }

  private emitMissEvent(
    projectile: ProjectileActor,
    reason: string,
    logicTime: number
  ): void {
    if (!this.eventCollector) {
      return;
    }

    const source = projectile.source ?? { id: 'unknown' };
    const finalPosition = projectile.position ?? new Vector3(0, 0, 0);

    const event = createProjectileMissEvent(
      projectile.id,
      source,
      reason,
      finalPosition,
      projectile.flyTime,
      projectile.target
    );

    this.eventCollector.push(event);

    // 同时发送 despawn 事件
    const despawnEvent = createProjectileDespawnEvent(
      projectile.id,
      source,
      'miss'
    );
    this.eventCollector.push(despawnEvent);
  }

  private emitPierceEvent(
    projectile: ProjectileActor,
    target: ActorRef,
    piercePosition: Vector3,
    logicTime: number
  ): void {
    if (!this.eventCollector) {
      return;
    }

    const source = projectile.source ?? { id: 'unknown' };
    const event = createProjectilePierceEvent(
      projectile.id,
      source,
      target,
      piercePosition,
      projectile.pierceCount,
      projectile.config.damage
    );

    this.eventCollector.push(event);
  }

  // ========== 公共 API ==========

  /**
   * 获取所有活跃投射物
   */
  getActiveProjectiles(actors: Actor[]): ProjectileActor[] {
    return actors.filter(
      (a): a is ProjectileActor => a instanceof ProjectileActor && a.isFlying
    );
  }

  /**
   * 获取待移除的投射物 ID
   */
  getPendingRemovalIds(): ReadonlySet<string> {
    return this.pendingRemoval;
  }

  /**
   * 强制命中投射物（用于保证命中的技能）
   */
  forceHit(
    projectile: ProjectileActor,
    target: ActorRef,
    hitPosition: Vector3
  ): void {
    if (!projectile.isFlying) {
      return;
    }

    const logicTime = this.getLogicTime();
    projectile.hit(target.id);
    this.emitHitEvent(projectile, target, hitPosition, logicTime);
    this.markForRemoval(projectile);
  }

  /**
   * 强制未命中投射物
   */
  forceMiss(projectile: ProjectileActor, reason: string = 'forced'): void {
    if (!projectile.isFlying) {
      return;
    }

    const logicTime = this.getLogicTime();
    projectile.miss(reason);
    this.emitMissEvent(projectile, reason, logicTime);
    this.markForRemoval(projectile);
  }
}
