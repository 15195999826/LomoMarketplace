/**
 * System 基类
 *
 * 全局逻辑处理器
 * 负责处理跨 Actor 的逻辑（如能力系统、AI 系统等）
 */

import type { Actor } from './Actor.js';

// 前向声明（避免循环依赖）
export interface IGameplayInstanceForSystem {
  readonly id: string;
  readonly logicTime: number;
}

/**
 * System 优先级
 * 数值越小越先执行
 */
export const SystemPriority = {
  /** 最高优先级（如时间系统） */
  HIGHEST: 0,
  /** 高优先级 */
  HIGH: 100,
  /** 普通优先级 */
  NORMAL: 500,
  /** 低优先级 */
  LOW: 900,
  /** 最低优先级（如清理系统） */
  LOWEST: 1000,
} as const;

/**
 * System 基类
 */
export abstract class System {
  /** System 类型标识 */
  abstract readonly type: string;

  /** 执行优先级 */
  readonly priority: number;

  /** 是否启用 */
  protected _enabled: boolean = true;

  /** 所属的 GameplayInstance */
  protected instance?: IGameplayInstanceForSystem;

  constructor(priority: number = SystemPriority.NORMAL) {
    this.priority = priority;
  }

  // ========== 属性访问器 ==========

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  // ========== 生命周期方法 ==========

  /**
   * 当 System 被注册到 GameplayInstance 时调用
   */
  onRegister(instance: IGameplayInstanceForSystem): void {
    this.instance = instance;
  }

  /**
   * 当 System 被从 GameplayInstance 移除时调用
   */
  onUnregister(): void {
    this.instance = undefined;
  }

  /**
   * 每帧/每回合更新
   * @param actors 所有 Actor
   * @param dt 时间增量（毫秒）
   */
  abstract tick(actors: Actor[], dt: number): void;

  // ========== 工具方法 ==========

  /**
   * 获取当前逻辑时间
   */
  protected getLogicTime(): number {
    return this.instance?.logicTime ?? 0;
  }

  /**
   * 按类型过滤 Actor
   */
  protected filterActorsByType<T extends Actor>(
    actors: Actor[],
    type: string
  ): T[] {
    return actors.filter((a) => a.type === type) as T[];
  }

  /**
   * 过滤活跃的 Actor
   */
  protected filterActiveActors(actors: Actor[]): Actor[] {
    return actors.filter((a) => a.isActive);
  }
}

/**
 * 空 System（用于测试）
 */
export class NoopSystem extends System {
  readonly type = 'noop';

  tick(_actors: Actor[], _dt: number): void {
    // 什么都不做
  }
}
