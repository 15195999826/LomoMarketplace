/**
 * Action 接口与基类
 *
 * Action 是技能效果的执行原语，负责"做什么"
 * 与 Component（负责"何时执行"）配合使用
 *
 * ## 参数传递
 *
 * Action 使用构造函数参数传递配置，支持延迟求值：
 * ```typescript
 * new DamageAction({
 *   damage: 50,  // 静态值
 *   damageType: (ctx) => ...,  // 动态值
 *   targetSelector: TargetSelectors.currentTarget,
 * })
 * ```
 */

import type { ActorRef } from '../types/common.js';
import type { ExecutionContext } from './ExecutionContext.js';
import { getCurrentEvent, createCallbackContext } from './ExecutionContext.js';
import type { ActionResult } from './ActionResult.js';
import type { TargetSelector } from './TargetSelector.js';
import { getLogger } from '../utils/Logger.js';

/**
 * 默认目标选择器
 * 尝试从当前触发事件中获取 target 或 targets
 */
export const defaultTargetSelector: TargetSelector = (ctx: ExecutionContext): ActorRef[] => {
  const event = getCurrentEvent(ctx) as { target?: ActorRef; targets?: ActorRef[] };
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
  execute(ctx: ExecutionContext): ActionResult;

  /**
   * 获取目标
   */
  getTargets?(ctx: ExecutionContext): ActorRef[];

}

/**
 * Action 基础参数（所有 Action 共享）
 */
export interface BaseActionParams {
  /** 目标选择器（可选，有默认值） */
  targetSelector?: TargetSelector;
}

/**
 * 回调 Action 配置
 */
export type ActionCallback = {
  /** 触发条件（如 'onHit', 'onCritical', 'onKill'） */
  readonly trigger: string;
  /** 要执行的 Action */
  readonly action: IAction;
};

/**
 * Action 基类
 *
 * 提供通用功能，具体 Action 继承此类实现。
 *
 * ## 使用方式
 *
 * ```typescript
 * interface MyActionParams extends BaseActionParams {
 *   damage: ParamResolver<number>;
 * }
 *
 * class MyAction extends BaseAction<MyActionParams> {
 *   constructor(params: MyActionParams) {
 *     super(params);
 *   }
 *
 *   execute(ctx) {
 *     const damage = resolveParam(this.params.damage, ctx);
 *     // ...
 *   }
 * }
 * ```
 */
export abstract class BaseAction<TParams extends BaseActionParams = BaseActionParams>
  implements IAction {

  abstract readonly type: string;

  /** 构造时传入的参数 */
  protected readonly params: TParams;

  /** 目标选择器 */
  protected readonly targetSelector: TargetSelector;

  /** 回调列表 */
  protected callbacks: ActionCallback[] = [];

  constructor(params: TParams) {
    this.params = params;
    this.targetSelector = params.targetSelector ?? defaultTargetSelector;
  }

  /**
   * 执行 Action（由子类实现）
   */
  abstract execute(ctx: ExecutionContext): ActionResult;

  /**
   * 获取目标列表
   * 调用 targetSelector 解析目标
   */
  getTargets(ctx: ExecutionContext): ActorRef[] {
    return this.targetSelector(ctx);
  }

  /**
   * 添加回调
   *
   * 回调会在主 Action 执行后，根据产生的事件触发。
   * 回调 Action 的 eventChain 会追加触发它的事件。
   */
  addCallback(trigger: string, action: IAction): this {
    this.callbacks.push({ trigger, action });
    return this;
  }

  /**
   * 命中时回调
   *
   * 当 damage 事件产生时触发。
   */
  onHit(action: IAction): this {
    return this.addCallback('onHit', action);
  }

  /**
   * 暴击时回调
   *
   * 当 damage 事件且 isCritical=true 时触发。
   */
  onCritical(action: IAction): this {
    return this.addCallback('onCritical', action);
  }

  /**
   * 击杀时回调
   *
   * 当 damage 事件且 isKill=true 时触发。
   */
  onKill(action: IAction): this {
    return this.addCallback('onKill', action);
  }

  /**
   * 处理回调
   *
   * 遍历 result.events，根据事件字段判断触发条件，
   * 使用 createCallbackContext 追加事件到事件链。
   */
  protected processCallbacks(result: ActionResult, ctx: ExecutionContext): ActionResult {
    if (!result.success || this.callbacks.length === 0) {
      return result;
    }

    const allEvents = [...result.events];

    for (const event of result.events) {
      // 根据事件类型和字段判断触发哪些回调
      const triggeredCallbacks = this.getTriggeredCallbacks(event);

      for (const callback of triggeredCallbacks) {
        // 追加事件到事件链
        const callbackCtx = createCallbackContext(ctx, event);

        try {
          const callbackResult = callback.action.execute(callbackCtx);
          allEvents.push(...callbackResult.events);
        } catch (error) {
          getLogger().error(`Callback action failed: ${callback.trigger}`, { error });
        }
      }
    }

    return { ...result, events: allEvents };
  }

  /**
   * 根据事件判断触发哪些回调
   */
  private getTriggeredCallbacks(event: unknown): ActionCallback[] {
    const e = event as { kind?: string; isCritical?: boolean; isKill?: boolean; overheal?: number; isRefresh?: boolean };

    return this.callbacks.filter((cb) => {
      // damage 事件
      if (e.kind === 'damage') {
        if (cb.trigger === 'onHit') return true;
        if (cb.trigger === 'onCritical' && e.isCritical) return true;
        if (cb.trigger === 'onKill' && e.isKill) return true;
      }
      // heal 事件
      if (e.kind === 'heal') {
        if (cb.trigger === 'onHeal') return true;
        if (cb.trigger === 'onOverheal' && e.overheal && e.overheal > 0) return true;
      }
      // buffApplied 事件
      if (e.kind === 'buffApplied') {
        if (cb.trigger === 'onBuffApplied') return true;
        if (cb.trigger === 'onBuffRefreshed' && e.isRefresh) return true;
      }
      return false;
    });
  }
}

/**
 * 空 Action（用于占位或测试）
 */
export class NoopAction extends BaseAction<BaseActionParams> {
  readonly type = 'noop';

  constructor(params: BaseActionParams = {}) {
    super(params);
  }

  execute(_ctx: ExecutionContext): ActionResult {
    return {
      success: true,
      events: [],
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

    return creator(config.params ?? {});
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
