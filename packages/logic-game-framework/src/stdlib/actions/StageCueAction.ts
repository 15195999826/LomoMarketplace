/**
 * StageCueAction - 舞台提示 Action
 *
 * 向表演层传递视觉表现数据（动画、特效等）。
 * 纯粹的数据传递，不包含逻辑层效果。
 *
 * ## 使用示例
 *
 * ```typescript
 * // 普通攻击动画
 * new StageCueAction({
 *   targetSelector: defaultTargetSelector,
 *   cueId: 'attack_slash',
 * })
 *
 * // 带参数的技能特效
 * new StageCueAction({
 *   targetSelector: defaultTargetSelector,
 *   cueId: 'skill_fireball',
 *   params: { element: 'fire', intensity: 1.5 },
 * })
 * ```
 *
 * ## 表演层处理
 *
 * 表演层通过监听 `stageCue` 事件获取数据：
 * - `sourceActorId`: 发起者
 * - `targetActorIds`: 目标列表（通过 targetSelector 获取）
 * - `cueId`: 提示类型标识
 * - `params`: 额外参数
 */

import type { ExecutionContext } from '../../core/actions/ExecutionContext.js';
import type { ActionResult } from '../../core/actions/ActionResult.js';
import { createSuccessResult } from '../../core/actions/ActionResult.js';
import { BaseAction, type BaseActionParams } from '../../core/actions/Action.js';
import type { ParamResolver } from '../../core/actions/ParamResolver.js';
import { resolveParam } from '../../core/actions/ParamResolver.js';
import { createStageCueEvent } from '../../core/events/GameEvent.js';

/**
 * StageCueAction 参数
 */
export interface StageCueActionParams extends BaseActionParams {
  /**
   * 提示类型标识
   *
   * 表演层根据此 ID 决定播放什么动画/特效
   * 例如: 'attack_slash', 'skill_fireball', 'effect_heal'
   */
  cueId: ParamResolver<string>;

  /**
   * 额外参数（可选）
   *
   * 传递给表演层的自定义数据
   * 例如: { element: 'fire', color: '#ff6600' }
   */
  params?: ParamResolver<Record<string, unknown>>;
}

/**
 * StageCueAction
 *
 * 向表演层发送视觉提示的 Action。
 */
export class StageCueAction extends BaseAction<StageCueActionParams> {
  readonly type = 'stageCue';

  constructor(params: StageCueActionParams) {
    super(params);
  }

  /**
   * 执行 Action
   */
  execute(ctx: ExecutionContext): ActionResult {
    // 获取发起者（必须存在）
    const ability = ctx.ability;
    if (!ability) {
      throw new Error('[StageCueAction] ctx.ability is required');
    }
    const sourceActorId = ability.source.id;

    // 获取目标列表
    const targets = this.getTargets(ctx);
    const targetActorIds = targets.map(t => t.id);

    // 解析参数
    const cueId = resolveParam(this.params.cueId, ctx);
    const params = this.params.params
      ? resolveParam(this.params.params, ctx)
      : undefined;

    // 创建事件
    const event = createStageCueEvent(
      sourceActorId,
      targetActorIds,
      cueId,
      params
    );

    // 推送到事件收集器
    ctx.eventCollector.push(event);

    return createSuccessResult([event]);
  }
}

/**
 * 创建 StageCueAction 的便捷工厂函数
 */
export function createStageCueAction(params: StageCueActionParams): StageCueAction {
  return new StageCueAction(params);
}
