/**
 * 通用类型定义
 * 包含框架核心的引用类型和目标选择器类型
 */

/**
 * Actor 引用
 * 用于在事件和上下文中引用 Actor，避免直接持有对象引用
 */
export interface ActorRef {
  readonly id: string;
}

/**
 * 目标选择器类型
 * 定义各种目标选择策略
 */
export interface TargetSelector {
  readonly type: string;
  resolve(context: TargetResolutionContext): ActorRef[];
}

/**
 * 目标解析上下文
 * 包含解析目标时需要的所有信息
 */
export interface TargetResolutionContext {
  readonly source: ActorRef;
  readonly primaryTarget?: ActorRef;
  readonly affectedTargets?: ActorRef[];
  readonly triggerSource?: ActorRef;
  readonly abilityOwner?: ActorRef;
}

/**
 * 语义化目标引用
 * 用于 Action 回调中清晰表达目标
 */
export type TargetRef =
  | { readonly ref: 'affected' }       // 被当前 Action 影响的目标
  | { readonly ref: 'source' }         // 技能释放者
  | { readonly ref: 'trigger' }        // 触发者（反击时：攻击我的人）
  | { readonly ref: 'primary' }        // 主目标（技能的首选目标）
  | { readonly ref: 'ability_owner' }  // 能力持有者（Buff 挂载的人）
  | { readonly ref: 'all_affected' }   // 所有被影响的目标（AOE 场景）
  | { readonly ref: 'self' }           // 自身
  | { readonly ref: 'custom'; selector: TargetSelector };

/**
 * 解析目标引用
 * 根据上下文将 TargetRef 解析为具体的 ActorRef 列表
 */
export function resolveTargetRef(
  targetRef: TargetRef,
  context: TargetResolutionContext
): ActorRef[] {
  switch (targetRef.ref) {
    case 'affected':
      return context.affectedTargets ?? [];
    case 'source':
      return [context.source];
    case 'trigger':
      return context.triggerSource ? [context.triggerSource] : [];
    case 'primary':
      return context.primaryTarget ? [context.primaryTarget] : [];
    case 'ability_owner':
      return context.abilityOwner ? [context.abilityOwner] : [];
    case 'all_affected':
      return context.affectedTargets ?? [];
    case 'self':
      return [context.source];
    case 'custom':
      return targetRef.selector.resolve(context);
    default:
      return [];
  }
}

/**
 * 钩子上下文
 * 用于 Ability 钩子分发时传递的上下文信息
 */
export interface HookContext {
  readonly hookName: string;
  readonly relatedActors: ActorRef[];
  readonly data: Readonly<Record<string, unknown>>;
}

/**
 * 激活检查上下文
 * 用于 AbilityComponent.canActivate 检查
 */
export interface ActivationContext {
  readonly source: ActorRef;
  readonly targets: ActorRef[];
  readonly logicTime: number;
}

/**
 * 激活错误
 * 当 canActivate 返回 false 时可附带的错误信息
 */
export interface ActivationError {
  readonly code: string;
  readonly message: string;
}

/**
 * 创建激活错误的辅助函数
 */
export function createActivationError(code: string, message: string): ActivationError {
  return { code, message };
}

/**
 * 位置信息（可选，用于支持战术战斗）
 */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/**
 * 方向枚举
 */
export type Direction = 'up' | 'down' | 'left' | 'right';
