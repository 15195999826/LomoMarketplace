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
