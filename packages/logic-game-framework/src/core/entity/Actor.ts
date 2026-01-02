/**
 * Actor 基类
 *
 * 游戏实体的基类，采用 OOP 设计
 * 战斗单位的结构相对固定，不需要过度 Component 化
 */

import type { ActorRef, Position } from '../types/common.js';

/**
 * Actor 状态
 */
export type ActorState = 'active' | 'inactive' | 'dead' | 'removed';

/**
 * Actor 基类
 */
export abstract class Actor {
  /** 按类型分开的 ID 计数器 */
  private static _typeCounters = new Map<string, number>();

  /** 内部 ID 存储（延迟初始化） */
  private _id: string | null = null;

  /** Actor 类型（由子类定义） */
  abstract readonly type: string;

  /** 当前状态 */
  protected _state: ActorState = 'active';

  /** 位置（可选） */
  protected _position?: Position;

  /** 所属阵营/队伍 */
  protected _team?: string;

  /** 显示名称 */
  protected _displayName?: string;

  /**
   * 唯一标识符（延迟初始化，格式：type_序号）
   * 首次访问时根据 type 生成
   */
  get id(): string {
    if (this._id === null) {
      const counter = (Actor._typeCounters.get(this.type) ?? 0) + 1;
      Actor._typeCounters.set(this.type, counter);
      this._id = `${this.type}_${counter}`;
    }
    return this._id;
  }

  /**
   * 重置 ID 计数器（仅用于测试）
   * @internal
   */
  static _resetIdCounter(): void {
    Actor._typeCounters.clear();
  }

  // ========== 属性访问器 ==========

  get state(): ActorState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state === 'active';
  }

  get isDead(): boolean {
    return this._state === 'dead';
  }

  get position(): Position | undefined {
    return this._position;
  }

  set position(pos: Position | undefined) {
    this._position = pos;
  }

  get team(): string | undefined {
    return this._team;
  }

  set team(value: string | undefined) {
    this._team = value;
  }

  get displayName(): string {
    return this._displayName ?? `${this.type}_${this.id}`;
  }

  set displayName(value: string) {
    this._displayName = value;
  }

  // ========== 生命周期方法 ==========

  /**
   * 当 Actor 被添加到场景时调用
   */
  onSpawn(): void {
    this._state = 'active';
  }

  /**
   * 当 Actor 从场景移除时调用
   */
  onDespawn(): void {
    this._state = 'removed';
  }

  /**
   * 当 Actor 死亡时调用
   */
  onDeath(): void {
    this._state = 'dead';
  }

  /**
   * 复活
   */
  revive(): void {
    if (this._state === 'dead') {
      this._state = 'active';
    }
  }

  // ========== 状态管理 ==========

  /**
   * 设置状态
   */
  setState(state: ActorState): void {
    this._state = state;
  }

  /**
   * 停用
   */
  deactivate(): void {
    this._state = 'inactive';
  }

  /**
   * 激活
   */
  activate(): void {
    if (this._state === 'inactive') {
      this._state = 'active';
    }
  }

  // ========== 引用转换 ==========

  /**
   * 转换为 ActorRef
   */
  toRef(): ActorRef {
    return { id: this.id };
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
      position: this._position,
      team: this._team,
      displayName: this._displayName,
    };
  }

  /**
   * 反序列化基础数据
   */
  protected deserializeBase(data: Record<string, unknown>): void {
    this._state = (data.state as ActorState) ?? 'active';
    this._position = data.position as Position | undefined;
    this._team = data.team as string | undefined;
    this._displayName = data.displayName as string | undefined;
  }
}
