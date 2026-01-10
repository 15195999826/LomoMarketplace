/**
 * GameEvent - 统一事件类型系统
 *
 * 框架只提供事件的基础接口约束，具体事件类型由游戏自定义。
 *
 * 同一事件类型用于：
 * - Ability 系统内部分发，触发被动技能
 * - 通过 EventCollector 输出给表演层
 *
 * @example
 * ```typescript
 * // 游戏自定义事件类型
 * type MyDamageEvent = GameEventBase & {
 *   kind: 'damage';
 *   source: ActorRef;
 *   target: ActorRef;
 *   damage: number;
 * };
 *
 * type MyGameEvent = MyDamageEvent | MyHealEvent | MyTurnStartEvent;
 * ```
 */

// ========== 事件基础接口 ==========

/**
 * 事件基础接口 - 所有游戏事件必须实现
 *
 * 游戏通过扩展此接口定义自己的事件类型：
 * - kind: 事件类型标识（字符串）
 * - 其他字段由游戏自定义
 *
 * ## 时间来源
 *
 * - 逻辑时间通过 IRecordingContext.getLogicTime() 获取
 * - 回放中通过 frame * tickInterval 计算
 */
export interface GameEventBase {
  /** 事件类型标识 */
  readonly kind: string;
  /** 允许游戏添加任意额外字段 */
  readonly [key: string]: unknown;
}

/**
 * 泛型事件类型 - 用于类型约束
 *
 * @example
 * ```typescript
 * // 约束事件必须有特定的 kind
 * function handleDamage<T extends GameEvent<'damage'>>(event: T) {
 *   // event.kind 类型为 'damage'
 * }
 * ```
 */
export type GameEvent<TKind extends string = string> = GameEventBase & {
  readonly kind: TKind;
};

/**
 * 从事件联合类型中提取所有 kind
 *
 * @example
 * ```typescript
 * type MyEvents = DamageEvent | HealEvent | DeathEvent;
 * type MyEventKinds = EventKindOf<MyEvents>; // 'damage' | 'heal' | 'death'
 * ```
 */
export type EventKindOf<T extends GameEventBase> = T['kind'];

/**
 * 从事件联合类型中按 kind 提取特定事件
 *
 * @example
 * ```typescript
 * type MyEvents = DamageEvent | HealEvent;
 * type OnlyDamage = ExtractEvent<MyEvents, 'damage'>; // DamageEvent
 * ```
 */
export type ExtractEvent<
  TEvents extends GameEventBase,
  TKind extends string,
> = TEvents extends { kind: TKind } ? TEvents : never;

// ========== 标准事件类型 ==========

/**
 * 标准 Ability 激活事件类型常量
 */
export const ABILITY_ACTIVATE_EVENT = 'abilityActivate' as const;

/**
 * 标准 Ability 激活事件
 *
 * ActiveUseComponent 默认监听此事件类型。
 * 项目可以扩展此接口添加额外字段（如目标、坐标等）。
 *
 * ## 设计说明
 *
 * - `abilityInstanceId`: 要激活的 Ability 实例 ID（不是 configId）
 * - `sourceId`: 发起激活的 Actor ID
 * - 项目可通过交叉类型扩展：`AbilityActivateEvent & { target: ActorRef }`
 *
 * @example
 * ```typescript
 * // 基础使用
 * const event: AbilityActivateEvent = {
 *   kind: 'abilityActivate',
 *   abilityInstanceId: 'ability_123',
 *   sourceId: 'actor_1',
 * };
 *
 * // 项目扩展（添加目标）
 * type MyActivateEvent = AbilityActivateEvent & {
 *   target?: ActorRef;
 *   targetCoord?: { q: number; r: number };
 * };
 * ```
 */
export interface AbilityActivateEvent extends GameEventBase {
  readonly kind: typeof ABILITY_ACTIVATE_EVENT;
  /** 要激活的 Ability 实例 ID */
  readonly abilityInstanceId: string;
  /** 发起激活的 Actor ID */
  readonly sourceId: string;
}

/**
 * 创建标准 Ability 激活事件
 */
export function createAbilityActivateEvent(
  abilityInstanceId: string,
  sourceId: string
): AbilityActivateEvent {
  return {
    kind: ABILITY_ACTIVATE_EVENT,
    abilityInstanceId,
    sourceId,
  };
}

/**
 * 检查事件是否为 AbilityActivateEvent
 */
export function isAbilityActivateEvent(event: GameEventBase): event is AbilityActivateEvent {
  return (
    event.kind === ABILITY_ACTIVATE_EVENT &&
    typeof (event as AbilityActivateEvent).abilityInstanceId === 'string' &&
    typeof (event as AbilityActivateEvent).sourceId === 'string'
  );
}

// ========== 框架层事件（用于战斗回放录制）==========

/**
 * Ability 初始数据（用于事件）
 */
export interface IAbilityInitDataForEvent {
  instanceId: string;
  configId: string;
  remainingCooldown?: number;
  stackCount?: number;
}

/**
 * 框架层事件类型常量
 */
export const ACTOR_SPAWNED_EVENT = 'actorSpawned' as const;
export const ACTOR_DESTROYED_EVENT = 'actorDestroyed' as const;
export const ATTRIBUTE_CHANGED_EVENT = 'attributeChanged' as const;
export const ABILITY_GRANTED_EVENT = 'abilityGranted' as const;
export const ABILITY_REMOVED_EVENT = 'abilityRemoved' as const;
export const ABILITY_ACTIVATED_EVENT = 'abilityActivated' as const;
export const ABILITY_TRIGGERED_EVENT = 'abilityTriggered' as const;
export const EXECUTION_ACTIVATED_EVENT = 'executionActivated' as const;
export const TAG_CHANGED_EVENT = 'tagChanged' as const;

// ========== Actor 生命周期事件 ==========

/**
 * Actor 生成事件
 *
 * 当战斗中动态创建 Actor 时产生。
 */
export interface ActorSpawnedEvent extends GameEventBase {
  readonly kind: typeof ACTOR_SPAWNED_EVENT;
  /** Actor 完整初始数据（使用 unknown 避免循环依赖） */
  readonly actor: unknown;
}

/**
 * Actor 销毁事件
 *
 * 当 Actor 被移除时产生。
 */
export interface ActorDestroyedEvent extends GameEventBase {
  readonly kind: typeof ACTOR_DESTROYED_EVENT;
  /** Actor ID */
  readonly actorId: string;
  /** 销毁原因（可选） */
  readonly reason?: string;
}

// ========== 属性变化事件 ==========

/**
 * 属性变化事件
 *
 * 当 Actor 的属性值发生变化时产生。
 */
export interface AttributeChangedEvent extends GameEventBase {
  readonly kind: typeof ATTRIBUTE_CHANGED_EVENT;
  /** Actor ID */
  readonly actorId: string;
  /** 属性名称 */
  readonly attribute: string;
  /** 旧值 */
  readonly oldValue: number;
  /** 新值 */
  readonly newValue: number;
  /** 变化来源（可选） */
  readonly source?: {
    actorId?: string;
    abilityId?: string;
  };
}

// ========== Ability 生命周期事件 ==========

/**
 * Ability 获得事件
 *
 * 当 Actor 获得新的 Ability 时产生。
 */
export interface AbilityGrantedEvent extends GameEventBase {
  readonly kind: typeof ABILITY_GRANTED_EVENT;
  /** Actor ID */
  readonly actorId: string;
  /** Ability 初始数据 */
  readonly ability: IAbilityInitDataForEvent;
}

/**
 * Ability 移除事件
 *
 * 当 Ability 被移除时产生。
 */
export interface AbilityRemovedEvent extends GameEventBase {
  readonly kind: typeof ABILITY_REMOVED_EVENT;
  /** Actor ID */
  readonly actorId: string;
  /** Ability 实例 ID */
  readonly abilityInstanceId: string;
}

/**
 * Ability 激活完成事件（过去时态）
 *
 * 当 Ability 被激活完成时产生。
 * 注意：不同于 AbilityActivateEvent（现在时态，用于触发激活）。
 */
export interface AbilityActivatedEvent extends GameEventBase {
  readonly kind: typeof ABILITY_ACTIVATED_EVENT;
  /** Actor ID */
  readonly actorId: string;
  /** Ability 实例 ID */
  readonly abilityInstanceId: string;
  /** Ability 配置 ID */
  readonly abilityConfigId: string;
  /** 目标（可选） */
  readonly target?: {
    actorId?: string;
    position?: unknown;
  };
}

// ========== Tag 变化事件 ==========

/**
 * Tag 变化事件
 *
 * 当 Tag 层数发生变化时产生。
 */
export interface TagChangedEvent extends GameEventBase {
  readonly kind: typeof TAG_CHANGED_EVENT;
  /** Actor ID */
  readonly actorId: string;
  /** Tag 名称 */
  readonly tag: string;
  /** 旧层数 */
  readonly oldCount: number;
  /** 新层数 */
  readonly newCount: number;
}

// ========== Ability 触发事件 ==========

/**
 * Ability 触发事件
 *
 * 当 Ability 收到事件且有 Component 被触发时产生。
 * 用于记录 Ability 的事件响应情况。
 */
export interface AbilityTriggeredEvent extends GameEventBase {
  readonly kind: typeof ABILITY_TRIGGERED_EVENT;
  /** Actor ID */
  readonly actorId: string;
  /** Ability 实例 ID */
  readonly abilityInstanceId: string;
  /** Ability 配置 ID */
  readonly abilityConfigId: string;
  /** 触发的原始事件 kind */
  readonly triggerEventKind: string;
  /** 被触发的 Component 类型列表 */
  readonly triggeredComponents: readonly string[];
}

// ========== 执行实例激活事件 ==========

/**
 * 执行实例激活事件
 *
 * 当 Ability 创建新的 ExecutionInstance 时产生。
 * 用于表演层获取 timelineId 以播放对应动画。
 */
export interface ExecutionActivatedEvent extends GameEventBase {
  readonly kind: typeof EXECUTION_ACTIVATED_EVENT;
  /** Actor ID */
  readonly actorId: string;
  /** Ability 实例 ID */
  readonly abilityInstanceId: string;
  /** Ability 配置 ID */
  readonly abilityConfigId: string;
  /** 执行实例 ID */
  readonly executionId: string;
  /** Timeline ID（用于表演层获取动画配置） */
  readonly timelineId: string;
}

// ========== 框架层事件联合类型 ==========

/**
 * 所有框架层事件的联合类型
 */
export type FrameworkEvent =
  | ActorSpawnedEvent
  | ActorDestroyedEvent
  | AttributeChangedEvent
  | AbilityGrantedEvent
  | AbilityRemovedEvent
  | AbilityActivatedEvent
  | AbilityTriggeredEvent
  | ExecutionActivatedEvent
  | TagChangedEvent;

// ========== 工厂函数 ==========

/**
 * 创建 Actor 生成事件
 */
export function createActorSpawnedEvent(
  actor: unknown
): ActorSpawnedEvent {
  return {
    kind: ACTOR_SPAWNED_EVENT,
    actor,
  };
}

/**
 * 创建 Actor 销毁事件
 */
export function createActorDestroyedEvent(
  actorId: string,
  reason?: string
): ActorDestroyedEvent {
  return {
    kind: ACTOR_DESTROYED_EVENT,
    actorId,
    reason,
  };
}

/**
 * 创建属性变化事件
 */
export function createAttributeChangedEvent(
  actorId: string,
  attribute: string,
  oldValue: number,
  newValue: number,
  source?: { actorId?: string; abilityId?: string }
): AttributeChangedEvent {
  return {
    kind: ATTRIBUTE_CHANGED_EVENT,
    actorId,
    attribute,
    oldValue,
    newValue,
    source,
  };
}

/**
 * 创建 Ability 获得事件
 */
export function createAbilityGrantedEvent(
  actorId: string,
  ability: IAbilityInitDataForEvent
): AbilityGrantedEvent {
  return {
    kind: ABILITY_GRANTED_EVENT,
    actorId,
    ability,
  };
}

/**
 * 创建 Ability 移除事件
 */
export function createAbilityRemovedEvent(
  actorId: string,
  abilityInstanceId: string
): AbilityRemovedEvent {
  return {
    kind: ABILITY_REMOVED_EVENT,
    actorId,
    abilityInstanceId,
  };
}

/**
 * 创建 Ability 激活完成事件
 */
export function createAbilityActivatedEvent(
  actorId: string,
  abilityInstanceId: string,
  abilityConfigId: string,
  target?: { actorId?: string; position?: unknown }
): AbilityActivatedEvent {
  return {
    kind: ABILITY_ACTIVATED_EVENT,
    actorId,
    abilityInstanceId,
    abilityConfigId,
    target,
  };
}

/**
 * 创建 Tag 变化事件
 */
export function createTagChangedEvent(
  actorId: string,
  tag: string,
  oldCount: number,
  newCount: number
): TagChangedEvent {
  return {
    kind: TAG_CHANGED_EVENT,
    actorId,
    tag,
    oldCount,
    newCount,
  };
}

/**
 * 创建 Ability 触发事件
 */
export function createAbilityTriggeredEvent(
  actorId: string,
  abilityInstanceId: string,
  abilityConfigId: string,
  triggerEventKind: string,
  triggeredComponents: readonly string[]
): AbilityTriggeredEvent {
  return {
    kind: ABILITY_TRIGGERED_EVENT,
    actorId,
    abilityInstanceId,
    abilityConfigId,
    triggerEventKind,
    triggeredComponents,
  };
}

/**
 * 创建执行实例激活事件
 */
export function createExecutionActivatedEvent(
  actorId: string,
  abilityInstanceId: string,
  abilityConfigId: string,
  executionId: string,
  timelineId: string
): ExecutionActivatedEvent {
  return {
    kind: EXECUTION_ACTIVATED_EVENT,
    actorId,
    abilityInstanceId,
    abilityConfigId,
    executionId,
    timelineId,
  };
}

// ========== 框架事件 Type Guards ==========

/**
 * 检查事件是否为 ActorSpawnedEvent
 */
export function isActorSpawnedEvent(event: GameEventBase): event is ActorSpawnedEvent {
  return event.kind === ACTOR_SPAWNED_EVENT;
}

/**
 * 检查事件是否为 ActorDestroyedEvent
 */
export function isActorDestroyedEvent(event: GameEventBase): event is ActorDestroyedEvent {
  return event.kind === ACTOR_DESTROYED_EVENT;
}

/**
 * 检查事件是否为 AttributeChangedEvent
 */
export function isAttributeChangedEvent(event: GameEventBase): event is AttributeChangedEvent {
  return event.kind === ATTRIBUTE_CHANGED_EVENT;
}

/**
 * 检查事件是否为 AbilityGrantedEvent
 */
export function isAbilityGrantedEvent(event: GameEventBase): event is AbilityGrantedEvent {
  return event.kind === ABILITY_GRANTED_EVENT;
}

/**
 * 检查事件是否为 AbilityRemovedEvent
 */
export function isAbilityRemovedEvent(event: GameEventBase): event is AbilityRemovedEvent {
  return event.kind === ABILITY_REMOVED_EVENT;
}

/**
 * 检查事件是否为 AbilityActivatedEvent
 */
export function isAbilityActivatedEvent(event: GameEventBase): event is AbilityActivatedEvent {
  return event.kind === ABILITY_ACTIVATED_EVENT;
}

/**
 * 检查事件是否为 TagChangedEvent
 */
export function isTagChangedEvent(event: GameEventBase): event is TagChangedEvent {
  return event.kind === TAG_CHANGED_EVENT;
}

/**
 * 检查事件是否为 AbilityTriggeredEvent
 */
export function isAbilityTriggeredEvent(event: GameEventBase): event is AbilityTriggeredEvent {
  return event.kind === ABILITY_TRIGGERED_EVENT;
}

/**
 * 检查事件是否为 ExecutionActivatedEvent
 */
export function isExecutionActivatedEvent(event: GameEventBase): event is ExecutionActivatedEvent {
  return event.kind === EXECUTION_ACTIVATED_EVENT;
}
