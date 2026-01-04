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
 * 速度单位：世界单位/秒 (m/s)
 * hexSize=100 时，相邻格子中心距离约为 173 (100 * sqrt(3))                                                      
 * 所以速度 800 表示约每秒飞过 4-5 个格子     
 * Character 以圆形碰撞体积表示，坐标为格子中心的世界坐标
 */
const PROJECTILE_PRESETS: Record<ProjectileVariant, Partial<ProjectileConfig>> = {
  arrow: {
    projectileType: 'bullet',
    speed: 800,       // 800 m/s
    maxLifetime: 3000,
  },
  fireball: {
    projectileType: 'bullet',
    speed: 500,       // 500 m/s，较慢但威力大
    maxLifetime: 5000,
  },
  magic_bolt: {
    projectileType: 'bullet',
    speed: 1200,      // 1200 m/s，快速魔法弹
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

    // 获取源和目标的 hex 位置
    const sourceActor = battle.getActor(source.id);
    const targetActor = battle.getActor(target.id);

    const sourceHexPos = sourceActor ? battle.getActorPosition(sourceActor as any) : undefined;
    const targetHexPos = targetActor ? battle.getActorPosition(targetActor as any) : undefined;

    // 转换为世界坐标
    const grid = battle.grid;
    const sourceWorldPos = sourceHexPos ? grid.coordToWorld(sourceHexPos) : { x: 0, y: 0 };
    const targetWorldPos = targetHexPos ? grid.coordToWorld(targetHexPos) : { x: 0, y: 0 };

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

    // 发射投射物（使用世界坐标）
    projectile.launch({
      source,
      target,
      startPosition: sourceWorldPos,
      targetPosition: targetWorldPos,
    });

    // 添加到战斗的 projectile 列表（传递 variant 用于日志）
    battle.addProjectile(projectile, variant);

    // 创建发射事件
    const launchedEvent = createProjectileLaunchedEvent(
      currentEvent.logicTime,
      projectile.id,
      source,
      projectile.position ?? { x: 0, y: 0 },
      projectileConfig.projectileType ?? 'bullet',
      projectileConfig.speed ?? 300,
      target,
      targetWorldPos
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
