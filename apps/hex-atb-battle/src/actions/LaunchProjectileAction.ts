/**
 * LaunchProjectileAction - 发射投射物 Action
 *
 * 用于远程技能（弓箭手的精准射击、法师的火球术等）
 * 发射投射物后，由 ProjectileSystem 处理飞行和命中
 */

import {
  BaseAction,
  type BaseActionParams,
  type ActionResult,
  type ExecutionContext,
  type ParamResolver,
  type ActorRef,
  createSuccessResult,
  createFailureResult,
  getCurrentEvent,
  resolveParam,
  resolveOptionalParam,
  ProjectileActor,
  type ProjectileConfig,
  createProjectileLaunchedEvent,
} from '@lomo/logic-game-framework';

import { type HexBattle } from '../battle/HexBattle.js';
import type { DamageType } from './DamageAction.js';

/**
 * 投射物类型
 */
export type ProjectileVariant = 'arrow' | 'fireball' | 'magic_bolt' | 'holy_light';

/**
 * LaunchProjectileAction 参数
 */
export interface LaunchProjectileActionParams extends BaseActionParams {
  /** 投射物类型 */
  projectileVariant: ParamResolver<ProjectileVariant>;
  /** 伤害值 */
  damage: ParamResolver<number>;
  /** 伤害类型 */
  damageType?: ParamResolver<DamageType>;
  /** 投射物飞行速度（单位/秒） */
  speed?: ParamResolver<number>;
}

/**
 * 投射物预设配置
 *
 * 速度单位：hex 格/秒
 * 在 hex 坐标系中，相邻格子距离约为 1，所以速度 10 表示每秒飞行 10 格
 */
const PROJECTILE_PRESETS: Record<ProjectileVariant, Partial<ProjectileConfig>> = {
  arrow: {
    projectileType: 'bullet',
    speed: 8,         // 每秒 8 格
    maxLifetime: 3000,
  },
  fireball: {
    projectileType: 'bullet',
    speed: 5,         // 每秒 5 格，较慢但威力大
    maxLifetime: 5000,
  },
  magic_bolt: {
    projectileType: 'bullet',
    speed: 12,        // 每秒 12 格，快速魔法弹
    maxLifetime: 2000,
  },
  holy_light: {
    projectileType: 'hitscan', // 瞬时命中
    speed: 0,
    maxLifetime: 100,
  },
};

/**
 * LaunchProjectileAction
 *
 * 发射投射物，投射物飞行后命中目标造成伤害
 */
export class LaunchProjectileAction extends BaseAction<LaunchProjectileActionParams> {
  readonly type = 'launchProjectile';

  constructor(params: LaunchProjectileActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const currentEvent = getCurrentEvent(ctx);
    const source = ctx.ability?.owner;
    const targets = this.getTargets(ctx);

    if (!source) {
      return createFailureResult('No source actor');
    }

    if (targets.length === 0) {
      return createFailureResult('No target');
    }

    const target = targets[0]; // 单体目标

    // 解析参数
    const variant = resolveParam(this.params.projectileVariant, ctx);
    const damage = resolveParam(this.params.damage, ctx);
    const damageType = resolveOptionalParam(this.params.damageType, 'physical', ctx);
    const customSpeed = resolveOptionalParam(this.params.speed, undefined, ctx);

    // 获取预设配置
    const preset = PROJECTILE_PRESETS[variant];

    // 获取战斗实例以访问位置信息
    const battle = ctx.gameplayState as HexBattle;

    // 获取源和目标的位置（用于计算飞行距离/时间）
    const sourceActor = battle.getActor(source.id);
    const targetActor = battle.getActor(target.id);

    const sourcePos = sourceActor ? battle.getActorPosition(sourceActor as any) : undefined;
    const targetPos = targetActor ? battle.getActorPosition(targetActor as any) : undefined;

    // 创建投射物配置
    const projectileConfig: Partial<ProjectileConfig> = {
      ...preset,
      damage,
      damageType,
    };

    if (customSpeed !== undefined) {
      projectileConfig.speed = customSpeed;
    }

    // 创建投射物 Actor
    const projectile = new ProjectileActor(projectileConfig);

    // 发射投射物
    projectile.launch({
      source,
      target,
      startPosition: sourcePos ? { x: sourcePos.q, y: sourcePos.r } : { x: 0, y: 0 },
      targetPosition: targetPos ? { x: targetPos.q, y: targetPos.r } : { x: 0, y: 0 },
    });

    // 添加到战斗的 projectile 列表
    battle.addProjectile(projectile);

    // 日志
    const sourceName = sourceActor?.displayName ?? source.id;
    const targetName = targetActor?.displayName ?? target.id;
    console.log(`  🎯 [${variant}] ${sourceName} → ${targetName} (伤害:${damage} ${damageType})`);

    // 创建发射事件
    const launchedEvent = createProjectileLaunchedEvent(
      currentEvent.logicTime,
      projectile.id,
      source,
      projectile.position ?? { x: 0, y: 0 },
      projectileConfig.projectileType ?? 'bullet',
      projectileConfig.speed ?? 300,
      target,
      targetPos ? { x: targetPos.q, y: targetPos.r } : undefined
    );

    ctx.eventCollector.push(launchedEvent);

    return createSuccessResult([launchedEvent], {
      projectileId: projectile.id,
      variant,
      damage,
      damageType,
    });
  }
}
