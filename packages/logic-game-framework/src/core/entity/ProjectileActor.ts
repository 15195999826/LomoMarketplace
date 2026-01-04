/**
 * ProjectileActor - 投射物 Actor 基类
 *
 * 纯逻辑层投射物实现，支持以下类型：
 * - Bullet: 飞行投射物，需要时间到达目标
 * - HitScan: 瞬时命中，无飞行时间
 * - MobaBullet: 基于距离的必中投射物
 *
 * ## 生命周期
 *
 * idle → flying → hit/missed → despawned
 *
 * ## 设计说明
 *
 * - 碰撞检测是抽象的，由游戏层实现具体逻辑
 * - 使用 update(dt) 更新位置，由 ProjectileSystem 驱动
 * - 通过 EventCollector 输出事件给表演层
 */

import { Vector3 } from '@lomo/core';
import type { ActorRef, Position } from '../types/common.js';
import { Actor } from './Actor.js';

/**
 * 投射物状态
 */
export type ProjectileState = 'idle' | 'flying' | 'hit' | 'missed' | 'despawned';

/**
 * 投射物类型
 */
export type ProjectileType = 'bullet' | 'hitscan' | 'moba';

/**
 * 投射物配置
 */
export interface ProjectileConfig {
  /** 投射物类型 */
  projectileType: ProjectileType;
  /** 飞行速度（单位/秒），对于 hitscan 无效 */
  speed: number;
  /** 最大飞行时间（毫秒），超时后自动消失 */
  maxLifetime: number;
  /** 伤害值（可选，由使用方决定） */
  damage?: number;
  /** 伤害类型（可选） */
  damageType?: string;
  /** 是否可穿透（命中后继续飞行） */
  piercing?: boolean;
  /** 最大穿透次数（piercing=true 时有效） */
  maxPierceCount?: number;
  /** 追踪强度（0=不追踪，1=完全追踪），用于追踪弹 */
  homingStrength?: number;
  /** MobaBullet: 命中距离阈值 */
  hitDistance?: number;
}

/**
 * 投射物发射参数
 */
export interface ProjectileLaunchParams {
  /** 发射者引用 */
  source: ActorRef;
  /** 目标引用（可选，追踪弹/MobaBullet 需要） */
  target?: ActorRef;
  /** 起始位置 */
  startPosition: Position;
  /** 目标位置（可选，直线弹需要） */
  targetPosition?: Position;
  /** 发射方向（弧度，0=右，可选） */
  direction?: number;
  /** 额外数据（由使用方自定义） */
  customData?: Record<string, unknown>;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ProjectileConfig = {
  projectileType: 'bullet',
  speed: 500,
  maxLifetime: 5000,
};

/**
 * ProjectileActor - 投射物基类
 */
export class ProjectileActor extends Actor {
  readonly type = 'Projectile';

  /** 投射物配置 */
  readonly config: ProjectileConfig;

  /** 投射物状态 */
  private _projectileState: ProjectileState = 'idle';

  /** 发射参数 */
  private _launchParams?: ProjectileLaunchParams;

  /** 已飞行时间（毫秒） */
  private _flyTime: number = 0;

  /** 已飞行距离 */
  private _flyDistance: number = 0;

  /** 穿透次数 */
  private _pierceCount: number = 0;

  /** 已命中的目标 ID 集合（用于穿透时避免重复命中） */
  private _hitTargets: Set<string> = new Set();

  constructor(config: Partial<ProjectileConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ========== 属性访问器 ==========

  get projectileState(): ProjectileState {
    return this._projectileState;
  }

  get isFlying(): boolean {
    return this._projectileState === 'flying';
  }

  get launchParams(): ProjectileLaunchParams | undefined {
    return this._launchParams;
  }

  get source(): ActorRef | undefined {
    return this._launchParams?.source;
  }

  get target(): ActorRef | undefined {
    return this._launchParams?.target;
  }

  get flyTime(): number {
    return this._flyTime;
  }

  get flyDistance(): number {
    return this._flyDistance;
  }

  get pierceCount(): number {
    return this._pierceCount;
  }

  get hitTargets(): ReadonlySet<string> {
    return this._hitTargets;
  }

  // ========== 生命周期 ==========

  /**
   * 发射投射物
   */
  launch(params: ProjectileLaunchParams): void {
    if (this._projectileState !== 'idle') {
      return; // 已经发射过
    }

    this._launchParams = params;
    this._position = Vector3.from(params.startPosition);
    this._projectileState = 'flying';
    this._flyTime = 0;
    this._flyDistance = 0;

    // HitScan 立即处理（由 System 检测碰撞）
    if (this.config.projectileType === 'hitscan') {
      // HitScan 的位置直接设为目标位置
      if (params.targetPosition) {
        this._position = Vector3.from(params.targetPosition);
      }
    }
  }

  /**
   * 更新投射物状态
   *
   * @param dt 时间增量（毫秒）
   * @returns 是否仍在飞行
   */
  update(dt: number): boolean {
    if (this._projectileState !== 'flying') {
      return false;
    }

    // HitScan 不需要更新，碰撞在 launch 后立即由 System 处理
    if (this.config.projectileType === 'hitscan') {
      return false;
    }

    this._flyTime += dt;

    // 检查超时
    if (this._flyTime >= this.config.maxLifetime) {
      this.miss('timeout');
      return false;
    }

    // 更新位置
    this.updatePosition(dt);

    return true;
  }

  /**
   * 更新位置（子类可重写以实现特殊轨迹）
   */
  protected updatePosition(dt: number): void {
    if (!this._position || !this._launchParams) {
      return;
    }

    const dtSeconds = dt / 1000;
    const moveDistance = this.config.speed * dtSeconds;
    this._flyDistance += moveDistance;

    // 计算移动方向
    let movement: Vector3;

    if (this._launchParams.direction !== undefined) {
      // 使用指定方向
      movement = new Vector3(
        Math.cos(this._launchParams.direction) * moveDistance,
        Math.sin(this._launchParams.direction) * moveDistance,
        0
      );
    } else if (this._launchParams.targetPosition) {
      // 朝向目标位置
      const target = Vector3.from(this._launchParams.targetPosition);
      const direction = target.sub(this._position);
      const distanceToTarget = direction.length();

      if (distanceToTarget > 0) {
        const actualMove = Math.min(moveDistance, distanceToTarget);
        movement = direction.normalize().scale(actualMove);
      } else {
        movement = Vector3.zero();
      }
    } else {
      movement = Vector3.zero();
    }

    // 使用 addSelf 原地修改（性能优化）
    this._position.addSelf(movement);
  }

  /**
   * 计算到目标位置的距离
   */
  getDistanceToTarget(): number {
    if (!this._position || !this._launchParams?.targetPosition) {
      return Infinity;
    }

    const target = Vector3.from(this._launchParams.targetPosition);
    return this._position.distanceTo(target);
  }

  /**
   * 命中处理
   *
   * @param targetId 命中的目标 ID
   * @returns 是否应该继续飞行（穿透）
   */
  hit(targetId: string): boolean {
    if (this._projectileState !== 'flying') {
      return false;
    }

    this._hitTargets.add(targetId);

    // 检查穿透
    if (this.config.piercing) {
      this._pierceCount++;
      const maxPierce = this.config.maxPierceCount ?? Infinity;
      if (this._pierceCount < maxPierce) {
        return true; // 继续飞行
      }
    }

    this._projectileState = 'hit';
    return false;
  }

  /**
   * 未命中处理
   */
  miss(reason: string = 'no_target'): void {
    if (this._projectileState !== 'flying') {
      return;
    }

    this._projectileState = 'missed';
  }

  /**
   * 销毁投射物
   */
  despawn(): void {
    this._projectileState = 'despawned';
    this.onDespawn();
  }

  /**
   * 检查是否已命中过指定目标
   */
  hasHitTarget(targetId: string): boolean {
    return this._hitTargets.has(targetId);
  }

  /**
   * 检查 MobaBullet 是否应该命中
   * 基于距离阈值判断
   */
  shouldMobaHit(): boolean {
    if (this.config.projectileType !== 'moba') {
      return false;
    }

    const hitDistance = this.config.hitDistance ?? 50;
    return this.getDistanceToTarget() <= hitDistance;
  }

  // ========== 序列化 ==========

  serialize(): object {
    return {
      ...this.serializeBase(),
      config: this.config,
      projectileState: this._projectileState,
      launchParams: this._launchParams,
      flyTime: this._flyTime,
      flyDistance: this._flyDistance,
      pierceCount: this._pierceCount,
      hitTargets: Array.from(this._hitTargets),
    };
  }
}
