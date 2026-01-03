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
 * - logicTime: 逻辑时间戳
 * - 其他字段由游戏自定义
 */
export interface GameEventBase {
  /** 事件类型标识 */
  readonly kind: string;
  /** 逻辑时间戳（毫秒） */
  readonly logicTime: number;
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
 *   logicTime: 1000,
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
  logicTime: number,
  abilityInstanceId: string,
  sourceId: string
): AbilityActivateEvent {
  return {
    kind: ABILITY_ACTIVATE_EVENT,
    logicTime,
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
