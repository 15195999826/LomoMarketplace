/**
 * Action 接口与基类
 *
 * Action 是技能效果的执行原语，负责"做什么"
 * 与 Component（负责"何时执行"）配合使用
 */

import type { TargetRef, ActorRef } from '../types/common.js';
import type { ExecutionContext } from './ExecutionContext.js';
import type { ActionResult } from './ActionResult.js';
import { createFailureResult } from './ActionResult.js';
import { getLogger } from '../utils/Logger.js';

/**
 * Action 接口
 */
export interface IAction {
  /** Action 类型标识 */
  readonly type: string;

  /**
   * 执行 Action
   * @param ctx 执行上下文
   * @returns 执行结果
   */
  execute(ctx: Readonly<ExecutionContext>): ActionResult;

  /**
   * 设置目标（可选，用于链式调用）
   */
  setTarget?(target: TargetRef): this;
}

/**
 * 回调 Action 配置
 */
export interface ActionCallback {
  /** 触发条件 */
  readonly trigger: string;
  /** 要执行的 Action */
  readonly action: IAction;
  /** 回调目标策略 */
  readonly targetStrategy: 'affected' | 'source' | 'none';
}

/**
 * 回调递归深度限制
 */
const MAX_CALLBACK_DEPTH = 10;

/**
 * Action 基类
 * 提供通用功能，具体 Action 继承此类实现
 */
export abstract class BaseAction implements IAction {
  abstract readonly type: string;

  /** 目标引用 */
  protected targetRef: TargetRef = { ref: 'primary' };

  /** 回调列表 */
  protected callbacks: ActionCallback[] = [];

  /**
   * 执行 Action（由子类实现）
   */
  abstract execute(ctx: Readonly<ExecutionContext>): ActionResult;

  /**
   * 设置目标
   */
  setTarget(target: TargetRef): this {
    this.targetRef = target;
    return this;
  }

  /**
   * 添加回调
   */
  addCallback(trigger: string, action: IAction, targetStrategy: ActionCallback['targetStrategy'] = 'affected'): this {
    this.callbacks.push({ trigger, action, targetStrategy });
    return this;
  }

  /**
   * 命中时回调
   */
  onHit(action: IAction): this {
    return this.addCallback('onHit', action);
  }

  /**
   * 暴击时回调
   */
  onCritical(action: IAction): this {
    return this.addCallback('onCritical', action);
  }

  /**
   * 击杀时回调
   */
  onKill(action: IAction): this {
    return this.addCallback('onKill', action);
  }

  /**
   * 处理回调
   * 根据执行结果中的 callbackTriggers 执行对应的回调 Action
   */
  protected processCallbacks(
    result: ActionResult,
    ctx: ExecutionContext
  ): ActionResult {
    if (!result.success || this.callbacks.length === 0) {
      return result;
    }

    // 检查递归深度
    const currentDepth = ctx.callbackDepth ?? 0;
    if (currentDepth >= MAX_CALLBACK_DEPTH) {
      getLogger().warn(`Callback depth exceeded maximum (${MAX_CALLBACK_DEPTH}), skipping further callbacks`, {
        actionType: this.type,
        depth: currentDepth,
      });
      return result;
    }

    const additionalEvents = [...result.events];
    const additionalTriggers = [...result.callbackTriggers];
    const additionalTargets = [...result.affectedTargets];

    for (const callback of this.callbacks) {
      // 检查触发条件是否满足
      if (!result.callbackTriggers.includes(callback.trigger)) {
        continue;
      }

      // 确定回调目标
      let callbackTargets: ActorRef[];
      switch (callback.targetStrategy) {
        case 'affected':
          callbackTargets = result.affectedTargets;
          break;
        case 'source':
          callbackTargets = [ctx.source];
          break;
        case 'none':
          callbackTargets = [ctx.primaryTarget];
          break;
        default:
          callbackTargets = result.affectedTargets;
      }

      // 对每个目标执行回调 Action
      for (const target of callbackTargets) {
        try {
          const callbackCtx: ExecutionContext = {
            ...ctx,
            primaryTarget: target,
            affectedTargets: [],
            callbackDepth: currentDepth + 1,  // 递增深度
          };

          const callbackResult = callback.action.execute(callbackCtx);

          additionalEvents.push(...callbackResult.events);
          additionalTriggers.push(...callbackResult.callbackTriggers);
          additionalTargets.push(...callbackResult.affectedTargets);
        } catch (error) {
          getLogger().error(`Callback action failed: ${callback.trigger}`, { error });
          // 回调失败不影响主结果
        }
      }
    }

    return {
      ...result,
      events: additionalEvents,
      callbackTriggers: [...new Set(additionalTriggers)],
      affectedTargets: additionalTargets.filter(
        (t, i, self) => self.findIndex((x) => x.id === t.id) === i
      ),
    };
  }
}

/**
 * 空 Action（用于占位或测试）
 */
export class NoopAction extends BaseAction {
  readonly type = 'noop';

  execute(_ctx: Readonly<ExecutionContext>): ActionResult {
    return {
      success: true,
      events: [],
      callbackTriggers: [],
      affectedTargets: [],
    };
  }
}

/**
 * Action 配置接口（用于数据驱动）
 */
export interface ActionConfig {
  /** Action 类型 */
  type: string;
  /** 目标引用 */
  target?: TargetRef;
  /** Action 特定参数 */
  params?: Record<string, unknown>;
  /** 回调配置 */
  callbacks?: Array<{
    trigger: string;
    action: ActionConfig;
    targetStrategy?: ActionCallback['targetStrategy'];
  }>;
}

/**
 * Action 工厂接口
 */
export interface IActionFactory {
  /**
   * 根据配置创建 Action
   */
  create(config: ActionConfig): IAction;

  /**
   * 注册 Action 类型
   */
  register(type: string, creator: (params: Record<string, unknown>) => IAction): void;
}

/**
 * 默认 Action 工厂实现
 */
export class ActionFactory implements IActionFactory {
  private creators: Map<string, (params: Record<string, unknown>) => IAction> = new Map();

  /**
   * 注册 Action 创建器
   */
  register(type: string, creator: (params: Record<string, unknown>) => IAction): void {
    this.creators.set(type, creator);
  }

  /**
   * 创建 Action
   */
  create(config: ActionConfig): IAction {
    const creator = this.creators.get(config.type);
    if (!creator) {
      getLogger().error(`Unknown action type: ${config.type}`);
      return new NoopAction();
    }

    const action = creator(config.params ?? {});

    // 设置目标
    if (config.target && action.setTarget) {
      action.setTarget(config.target);
    }

    // 添加回调
    if (config.callbacks && action instanceof BaseAction) {
      for (const cb of config.callbacks) {
        const callbackAction = this.create(cb.action);
        action.addCallback(cb.trigger, callbackAction, cb.targetStrategy ?? 'affected');
      }
    }

    return action;
  }
}

// 全局 Action 工厂实例
let globalActionFactory: IActionFactory = new ActionFactory();

/**
 * 获取全局 Action 工厂
 */
export function getActionFactory(): IActionFactory {
  return globalActionFactory;
}

/**
 * 设置全局 Action 工厂
 */
export function setActionFactory(factory: IActionFactory): void {
  globalActionFactory = factory;
}
