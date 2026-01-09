/**
 * LaunchProjectileAction - 发射投射物 Action
 *
 * 创建并发射投射物，支持回调链：
 * - onHit: 命中时执行
 * - onMiss: 未命中时执行
 * - onPierce: 穿透时执行
 *
 * ## 使用示例
 *
 * ```typescript
 * const fireballAction = new LaunchProjectileAction({
 *   targetSelector: TargetSelectors.currentTarget,
 *   projectileConfig: {
 *     projectileType: 'bullet',
 *     speed: 400,
 *     maxLifetime: 3000,
 *     damage: 50,
 *   },
 *   startPositionResolver: (ctx) => getActorPosition(ctx, ctx.ability!.source),
 *   targetPositionResolver: (ctx) => getTargetPosition(ctx),
 * })
 *   .onProjectileHit(new DamageAction({ ... }))
 *   .onProjectileMiss(new LogAction({ message: 'Missed!' }));
 * ```
 *
 * ## 与 ProjectileSystem 配合
 *
 * 1. LaunchProjectileAction 创建 ProjectileActor 并发射
 * 2. 将 projectile 添加到 result.data.projectile
 * 3. 调用方（通常是 GameplayInstance）将 projectile 添加到 Actor 列表
 * 4. ProjectileSystem.tick() 更新所有 projectile
 * 5. 命中时 ProjectileSystem 触发 ProjectileHitEvent
 * 6. Ability 系统捕获事件并触发 onHit 回调
 */

import type { ActorRef } from '../../core/types/common.js';
import { Vector3 } from '@lomo/core';
import type { ExecutionContext } from '../../core/actions/ExecutionContext.js';
import { getCurrentEvent } from '../../core/actions/ExecutionContext.js';
import type { ActionResult } from '../../core/actions/ActionResult.js';
import { createSuccessResult, createFailureResult } from '../../core/actions/ActionResult.js';
import { BaseAction, type BaseActionParams, type IAction } from '../../core/actions/Action.js';
import type { TargetSelector } from '../../core/actions/TargetSelector.js';
import type { ParamResolver } from '../../core/actions/ParamResolver.js';
import { resolveParam } from '../../core/actions/ParamResolver.js';
import {
  ProjectileActor,
  type ProjectileConfig,
  type ProjectileLaunchParams,
} from '../../core/entity/ProjectileActor.js';
import {
  createProjectileLaunchedEvent,
  PROJECTILE_HIT_EVENT,
  PROJECTILE_MISS_EVENT,
  PROJECTILE_PIERCE_EVENT,
} from '../../core/events/ProjectileEvents.js';

/**
 * 位置解析器类型
 */
export type PositionResolver = (ctx: ExecutionContext) => Vector3 | undefined;

/**
 * LaunchProjectileAction 参数
 */
export interface LaunchProjectileActionParams extends BaseActionParams {
  /** 投射物配置 */
  projectileConfig: ParamResolver<Partial<ProjectileConfig>>;

  /** 起始位置解析器 */
  startPositionResolver: PositionResolver;

  /** 目标位置解析器（可选，用于直线弹） */
  targetPositionResolver?: PositionResolver;

  /** 发射方向（可选，弧度） */
  direction?: ParamResolver<number>;

  /** 自定义数据 */
  customData?: ParamResolver<Record<string, unknown>>;
}

/**
 * LaunchProjectileAction
 *
 * 创建并发射投射物的 Action。
 */
export class LaunchProjectileAction extends BaseAction<LaunchProjectileActionParams> {
  readonly type = 'launchProjectile';

  /** 投射物命中回调 */
  private hitCallbacks: IAction[] = [];

  /** 投射物未命中回调 */
  private missCallbacks: IAction[] = [];

  /** 投射物穿透回调 */
  private pierceCallbacks: IAction[] = [];

  constructor(params: LaunchProjectileActionParams) {
    super(params);
  }

  /**
   * 添加命中回调
   */
  onProjectileHit(action: IAction): this {
    this.hitCallbacks.push(action);
    return this.addCallback(PROJECTILE_HIT_EVENT, action);
  }

  /**
   * 添加未命中回调
   */
  onProjectileMiss(action: IAction): this {
    this.missCallbacks.push(action);
    return this.addCallback(PROJECTILE_MISS_EVENT, action);
  }

  /**
   * 添加穿透回调
   */
  onProjectilePierce(action: IAction): this {
    this.pierceCallbacks.push(action);
    return this.addCallback(PROJECTILE_PIERCE_EVENT, action);
  }

  /**
   * 执行 Action
   */
  execute(ctx: ExecutionContext): ActionResult {
    // 解析起始位置
    const startPosition = this.params.startPositionResolver(ctx);
    if (!startPosition) {
      return createFailureResult('Cannot resolve start position');
    }

    // 解析目标位置
    const targetPosition = this.params.targetPositionResolver?.(ctx);

    // 解析目标（用于追踪弹）
    const targets = this.getTargets(ctx);
    const target = targets.length > 0 ? targets[0] : undefined;

    // 解析投射物配置
    const projectileConfig = resolveParam(this.params.projectileConfig, ctx);

    // 解析方向
    const direction = this.params.direction
      ? resolveParam(this.params.direction, ctx)
      : undefined;

    // 解析自定义数据
    const customData = this.params.customData
      ? resolveParam(this.params.customData, ctx)
      : undefined;

    // 获取来源
    const source = ctx.ability?.source ?? { id: 'unknown' };

    // 创建投射物
    const projectile = new ProjectileActor(projectileConfig);

    // 构建发射参数
    const launchParams: ProjectileLaunchParams = {
      source,
      target,
      startPosition,
      targetPosition,
      direction,
      customData,
    };

    // 发射投射物
    projectile.launch(launchParams);

    // 创建发射事件
    const launchedEvent = createProjectileLaunchedEvent(
      projectile.id,
      source,
      startPosition,
      projectile.config.projectileType,
      projectile.config.speed,
      target,
      targetPosition
    );

    // 推送事件到收集器
    ctx.eventCollector.push(launchedEvent);

    // 返回结果，包含创建的投射物
    return createSuccessResult([launchedEvent], {
      projectile,
      projectileId: projectile.id,
    });
  }

  /**
   * 根据事件判断触发哪些回调（重写基类方法）
   *
   * 投射物 Action 需要响应 ProjectileHitEvent 等事件
   */
  protected override processCallbacks(result: ActionResult, ctx: ExecutionContext): ActionResult {
    // 调用基类处理常规回调
    return super.processCallbacks(result, ctx);
  }
}

// ========== 辅助工具 ==========

/**
 * 创建简单的位置解析器
 *
 * 从 Actor 引用获取位置
 */
export function createActorPositionResolver(
  actorRefResolver: (ctx: ExecutionContext) => ActorRef | undefined
): PositionResolver {
  return (ctx: ExecutionContext): Vector3 | undefined => {
    const actorRef = actorRefResolver(ctx);
    if (!actorRef) {
      return undefined;
    }

    // 从 gameplayState 获取 Actor 的位置
    // 这里需要项目层实现具体逻辑
    const state = ctx.gameplayState as {
      getActor?: (id: string) => { position?: Vector3 } | undefined;
    };

    if (state.getActor) {
      const actor = state.getActor(actorRef.id);
      return actor?.position;
    }

    return undefined;
  };
}

/**
 * 创建固定位置解析器
 */
export function createFixedPositionResolver(position: Vector3): PositionResolver {
  return () => position;
}

/**
 * 从事件中获取源位置的解析器
 */
export function sourcePositionResolver(ctx: ExecutionContext): Vector3 | undefined {
  const event = getCurrentEvent(ctx) as { sourcePosition?: Vector3 };
  return event.sourcePosition;
}

/**
 * 从事件中获取目标位置的解析器
 */
export function targetPositionResolver(ctx: ExecutionContext): Vector3 | undefined {
  const event = getCurrentEvent(ctx) as { targetPosition?: Vector3 };
  return event.targetPosition;
}
