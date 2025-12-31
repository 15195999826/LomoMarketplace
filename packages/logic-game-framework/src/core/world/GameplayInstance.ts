/**
 * GameplayInstance 玩法实例基类
 *
 * 控制玩法流程，持有 System 和 Actor
 * 不同玩法（战斗、探索等）继承此类实现
 */

import { generateId } from '../utils/IdGenerator.js';
import { getLogger } from '../utils/Logger.js';
import type { Actor } from '../entity/Actor.js';
import { System, type IGameplayInstanceForSystem } from '../entity/System.js';
import type { BattleEvent } from '../events/BattleEvent.js';
import { EventCollector } from '../events/EventCollector.js';

/**
 * 玩法实例状态
 */
export type InstanceState = 'created' | 'running' | 'paused' | 'ended';

/**
 * GameplayInstance 基类
 */
export abstract class GameplayInstance implements IGameplayInstanceForSystem {
  /** 实例唯一标识 */
  readonly id: string;

  /** 实例类型（由子类定义） */
  abstract readonly type: string;

  /** System 列表（按优先级排序） */
  protected systems: System[] = [];

  /** Actor 列表 */
  protected actors: Actor[] = [];

  /** 当前逻辑时间（毫秒） */
  protected _logicTime: number = 0;

  /** 实例状态 */
  protected _state: InstanceState = 'created';

  /** 事件收集器 */
  protected eventCollector: EventCollector;

  constructor(id?: string) {
    this.id = id ?? generateId('instance');
    this.eventCollector = new EventCollector();
  }

  // ========== 属性访问器 ==========

  get logicTime(): number {
    return this._logicTime;
  }

  get state(): InstanceState {
    return this._state;
  }

  get isRunning(): boolean {
    return this._state === 'running';
  }

  get actorCount(): number {
    return this.actors.length;
  }

  // ========== 驱动接口 ==========

  /**
   * 推进逻辑时间
   * 子类必须实现此方法
   * @param dt 时间增量（毫秒）
   * @returns 产生的事件列表
   */
  abstract advance(dt: number): BattleEvent[];

  /**
   * 基础的 advance 实现
   * 子类可调用此方法作为基础实现
   */
  protected baseAdvance(dt: number): BattleEvent[] {
    if (!this.isRunning) {
      return [];
    }

    // 推进逻辑时间
    this._logicTime += dt;
    this.eventCollector.setLogicTime(this._logicTime);

    // 按优先级执行 System
    for (const system of this.systems) {
      if (system.enabled) {
        try {
          system.tick(this.actors, dt);
        } catch (error) {
          getLogger().error(`System tick error: ${system.type}`, { error });
        }
      }
    }

    // 执行 Actor tick
    for (const actor of this.actors) {
      if (actor.isActive) {
        try {
          actor.tick(dt);
        } catch (error) {
          getLogger().error(`Actor tick error: ${actor.id}`, { error });
        }
      }
    }

    return this.eventCollector.flush();
  }

  // ========== 生命周期 ==========

  /**
   * 开始玩法实例
   */
  start(): void {
    if (this._state !== 'created') {
      getLogger().warn(`Cannot start instance in state: ${this._state}`);
      return;
    }

    this._state = 'running';
    this.onStart();
  }

  /**
   * 暂停玩法实例
   */
  pause(): void {
    if (this._state === 'running') {
      this._state = 'paused';
      this.onPause();
    }
  }

  /**
   * 恢复玩法实例
   */
  resume(): void {
    if (this._state === 'paused') {
      this._state = 'running';
      this.onResume();
    }
  }

  /**
   * 结束玩法实例
   */
  end(): void {
    if (this._state === 'ended') {
      return;
    }

    this._state = 'ended';
    this.onEnd();

    // 清理所有 Actor
    for (const actor of this.actors) {
      actor.onDespawn();
    }

    // 清理所有 System
    for (const system of this.systems) {
      system.onUnregister();
    }
  }

  /**
   * 生命周期钩子：开始时
   */
  protected onStart(): void {
    // 子类可重写
  }

  /**
   * 生命周期钩子：暂停时
   */
  protected onPause(): void {
    // 子类可重写
  }

  /**
   * 生命周期钩子：恢复时
   */
  protected onResume(): void {
    // 子类可重写
  }

  /**
   * 生命周期钩子：结束时
   */
  protected onEnd(): void {
    // 子类可重写
  }

  // ========== Actor 管理 ==========

  /**
   * 添加 Actor
   */
  addActor(actor: Actor): void {
    if (this.actors.some((a) => a.id === actor.id)) {
      getLogger().warn(`Actor already exists: ${actor.id}`);
      return;
    }

    this.actors.push(actor);
    actor.onSpawn();
  }

  /**
   * 创建并添加 Actor（工厂方法）
   *
   * 便捷方法，将创建和注册合为一步。
   * factory 会立即同步执行，捕获的变量值就是调用时的值。
   *
   * @example
   * ```typescript
   * const hero = battle.createActor(() => new BattleUnit('勇者', 10));
   *
   * // 支持在 factory 中配置
   * const enemy = battle.createActor(() => {
   *   const unit = new BattleUnit('史莱姆');
   *   unit.team = 'enemy';
   *   return unit;
   * });
   * ```
   */
  createActor<T extends Actor>(factory: () => T): T {
    const actor = factory();
    this.addActor(actor);
    return actor;
  }

  /**
   * 移除 Actor
   */
  removeActor(id: string): boolean {
    const index = this.actors.findIndex((a) => a.id === id);
    if (index === -1) {
      return false;
    }

    const actor = this.actors[index];
    actor.onDespawn();
    this.actors.splice(index, 1);
    return true;
  }

  /**
   * 获取 Actor
   */
  getActor<T extends Actor>(id: string): T | undefined {
    return this.actors.find((a) => a.id === id) as T | undefined;
  }

  /**
   * 获取所有 Actor
   */
  getActors(): readonly Actor[] {
    return this.actors;
  }

  /**
   * 按类型获取 Actor
   */
  getActorsByType<T extends Actor>(type: string): T[] {
    return this.actors.filter((a) => a.type === type) as T[];
  }

  /**
   * 按条件查找 Actor
   */
  findActors(predicate: (actor: Actor) => boolean): Actor[] {
    return this.actors.filter(predicate);
  }

  // ========== System 管理 ==========

  /**
   * 添加 System
   */
  addSystem(system: System): void {
    if (this.systems.some((s) => s.type === system.type)) {
      getLogger().warn(`System already exists: ${system.type}`);
      return;
    }

    this.systems.push(system);
    // 按优先级排序
    this.systems.sort((a, b) => a.priority - b.priority);
    system.onRegister(this);
  }

  /**
   * 移除 System
   */
  removeSystem(type: string): boolean {
    const index = this.systems.findIndex((s) => s.type === type);
    if (index === -1) {
      return false;
    }

    const system = this.systems[index];
    system.onUnregister();
    this.systems.splice(index, 1);
    return true;
  }

  /**
   * 获取 System
   */
  getSystem<T extends System>(type: string): T | undefined {
    return this.systems.find((s) => s.type === type) as T | undefined;
  }

  /**
   * 获取所有 System
   */
  getSystems(): readonly System[] {
    return this.systems;
  }

  // ========== 事件相关 ==========

  /**
   * 获取事件收集器
   */
  getEventCollector(): EventCollector {
    return this.eventCollector;
  }

  // ========== 序列化 ==========

  /**
   * 序列化基础数据
   */
  serializeBase(): object {
    return {
      id: this.id,
      type: this.type,
      state: this._state,
      logicTime: this._logicTime,
      actors: this.actors.map((a) => a.serializeBase()),
    };
  }
}
