/**
 * MoveAction - InkMon 移动 Action
 *
 * 执行单位在六边形网格上的移动。
 * 目标由 targetSelector 决定（谁要移动），
 * 坐标由 targetCoord 参数决定（移动到哪里）。
 */

import {
  BaseAction,
  type BaseActionParams,
  type ActionResult,
  type ExecutionContext,
  type ParamResolver,
  createSuccessResult,
  resolveParam,
} from '@lomo/logic-game-framework';

import type { AxialCoord } from '@lomo/hex-grid';
import { createMoveEvent } from '../events/ReplayEvents.js';

// ========== 类型定义 ==========

/** 带有位置查询能力的游戏状态 */
interface GameplayStateWithPosition {
  getActorPosition(actorId: string): AxialCoord | undefined;
}

/**
 * MoveAction 参数
 */
export interface MoveActionParams extends BaseActionParams {
  /** 目标坐标（必填，支持延迟求值） */
  targetCoord: ParamResolver<AxialCoord>;
}

// ========== 辅助函数 ==========

/** 安全的 console.log */
function logMessage(message: string): void {
  (globalThis as { console?: { log: (msg: string) => void } }).console?.log(
    message
  );
}

/**
 * 检查对象是否有 getActorPosition 方法
 */
function hasGetActorPosition(obj: unknown): obj is GameplayStateWithPosition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'getActorPosition' in obj &&
    typeof (obj as GameplayStateWithPosition).getActorPosition === 'function'
  );
}

// ========== MoveAction ==========

/**
 * InkMon 移动 Action
 *
 * @example
 * ```typescript
 * // 移动自己
 * new MoveAction({
 *   targetSelector: (ctx) => ctx.ability ? [ctx.ability.owner] : [],
 *   targetCoord: (ctx) => (getCurrentEvent(ctx) as ActionUseEvent).targetCoord!,
 * })
 * ```
 */
export class MoveAction extends BaseAction<MoveActionParams> {
  readonly type = 'inkmon_move';

  constructor(params: MoveActionParams) {
    super(params);
  }

  execute(ctx: ExecutionContext): ActionResult {
    const targets = this.getTargets(ctx);

    // 解析目标坐标
    const targetCoord = resolveParam(this.params.targetCoord, ctx);

    const allEvents = targets.map((target) => {
      // 获取 Actor 当前位置
      let fromHex: AxialCoord = { q: 0, r: 0 };
      if (hasGetActorPosition(ctx.gameplayState)) {
        const pos = ctx.gameplayState.getActorPosition(target.id);
        if (pos) {
          fromHex = pos;
        }
      }

      logMessage(
        `  [MoveAction] ${target.id} 移动从 (${fromHex.q}, ${fromHex.r}) 到 (${targetCoord?.q}, ${targetCoord?.r})`
      );

      // 产生移动事件
      return ctx.eventCollector.push(
        createMoveEvent(target.id, fromHex, targetCoord ?? { q: 0, r: 0 })
      );
    });

    return createSuccessResult(allEvents, { targetCoord });
  }
}

// ========== 工厂函数 ==========

/**
 * 创建移动 Action
 */
export function createMoveAction(params: MoveActionParams): MoveAction {
  return new MoveAction(params);
}
