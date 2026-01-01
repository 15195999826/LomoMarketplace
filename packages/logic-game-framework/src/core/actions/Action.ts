/**
 * Action 接口与基类
 *
 * Action 是技能效果的执行原语，负责"做什么"
 * 与 Component（负责"何时执行"）配合使用
 */

import type { ActorRef } from '../types/common.js';
import type { ExecutionContext } from './ExecutionContext.js';
import type { ActionResult } from './ActionResult.js';
import type { TargetSelector } from './TargetSelector.js';
import { getLogger } from '../utils/Logger.js';

/**
 * 默认目标选择器
 * 尝试从 triggerEvent 中获取 target 或 targets
 */
const defaultTargetSelector: TargetSelector = (ctx: ExecutionContext): ActorRef[] => {
  const event = ctx.triggerEvent as { target?: ActorRef; targets?: ActorRef[] };
  if (event.targets) {
    return event.targets;
  }
  if (event.target) {
    return [event.target];
  }
  return [];
};

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
   * 设置目标选择器
   */
  setTargetSelector?(selector: TargetSelector): this;

  /**
   * 获取目标
   */
  getTargets?(ctx: Readonly<ExecutionContext>): ActorRef[];
}

/**
 * 回调 Action 配置
 *
 * @deprecated 回调机制待重构，建议使用事件驱动方式
 */
export type ActionCallback = {
  /** 触发条件 */
  readonly trigger: string;
  /** 要执行的 Action */
  readonly action: IAction;
};

/**
 * Action 基类
 * 提供通用功能，具体 Action 继承此类实现
 */
export abstract class BaseAction implements IAction {
  abstract readonly type: string;

  /** 目标选择器 */
  protected targetSelector: TargetSelector = defaultTargetSelector;

  /** 回调列表 @deprecated */
  protected callbacks: ActionCallback[] = [];

  /**
   * 执行 Action（由子类实现）
   */
  abstract execute(ctx: Readonly<ExecutionContext>): ActionResult;

  /**
   * 设置目标选择器
   *
   * @example
   * ```typescript
   * // 使用预定义选择器
   * action.setTargetSelector(TargetSelectors.triggerSource);
   *
   * // 使用自定义选择器
   * action.setTargetSelector((ctx) => {
   *   const event = ctx.triggerEvent as MyEvent;
   *   return [event.target];
   * });
   * ```
   */
  setTargetSelector(selector: TargetSelector): this {
    this.targetSelector = selector;
    return this;
  }

  /**
   * 获取目标列表
   * 调用 targetSelector 解析目标
   */
  getTargets(ctx: Readonly<ExecutionContext>): ActorRef[] {
    return this.targetSelector(ctx);
  }

  /**
   * 添加回调
   * @deprecated 回调机制待重构
   */
  addCallback(trigger: string, action: IAction): this {
    this.callbacks.push({ trigger, action });
    getLogger().warn('ActionCallback is deprecated, consider using event-driven approach');
    return this;
  }

  /**
   * 命中时回调
   * @deprecated 回调机制待重构
   */
  onHit(action: IAction): this {
    return this.addCallback('onHit', action);
  }

  /**
   * 暴击时回调
   * @deprecated 回调机制待重构
   */
  onCritical(action: IAction): this {
    return this.addCallback('onCritical', action);
  }

  /**
   * 击杀时回调
   * @deprecated 回调机制待重构
   */
  onKill(action: IAction): this {
    return this.addCallback('onKill', action);
  }

  /**
   * 处理回调
   * @deprecated 回调机制待重构，当前仅执行回调但不传递目标信息
   */
  protected processCallbacks(result: ActionResult, ctx: ExecutionContext): ActionResult {
    if (!result.success || this.callbacks.length === 0) {
      return result;
    }

    const additionalEvents = [...result.events];
    const additionalTriggers = [...result.callbackTriggers];
    const additionalTargets = [...result.affectedTargets];

    for (const callback of this.callbacks) {
      if (!result.callbackTriggers.includes(callback.trigger)) {
        continue;
      }

      try {
        const callbackResult = callback.action.execute(ctx);
        additionalEvents.push(...callbackResult.events);
        additionalTriggers.push(...callbackResult.callbackTriggers);
        additionalTargets.push(...callbackResult.affectedTargets);
      } catch (error) {
        getLogger().error(`Callback action failed: ${callback.trigger}`, { error });
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
export type ActionConfig = {
  /** Action 类型 */
  type: string;
  /** Action 特定参数 */
  params?: Record<string, unknown>;
  /** 回调配置 @deprecated */
  callbacks?: Array<{
    trigger: string;
    action: ActionConfig;
  }>;
};

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

    // 添加回调
    if (config.callbacks && action instanceof BaseAction) {
      for (const cb of config.callbacks) {
        const callbackAction = this.create(cb.action);
        action.addCallback(cb.trigger, callbackAction);
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
