/**
 * Actor 基类
 *
 * 游戏实体的基类，采用 OOP 设计
 * 战斗单位的结构相对固定，不需要过度 Component 化
 */

import { Vector3 } from '@lomo/core';
import type { ActorRef } from '../types/common.js';
import { generateId } from '../utils/IdGenerator.js';

/**
 * Actor 状态
 */
export type ActorState = 'active' | 'inactive' | 'dead' | 'removed';

/**
 * Actor 基类
 */
export abstract class Actor {
  /** 内部 ID 存储（延迟初始化） */
  private _id: string | null = null;

  /** Actor 类型（由子类定义） */
  abstract readonly type: string;

  /** 当前状态 */
  protected _state: ActorState = 'active';

  /** 位置（可选，使用 Vector3） */
  protected _position?: Vector3;

  /** 所属阵营/队伍 */
  protected _team?: string;

  /** 显示名称 */
  protected _displayName?: string;

  /** onSpawn 回调列表 */
  private _onSpawnCallbacks: Array<() => void> = [];

  /** onDespawn 回调列表 */
  private _onDespawnCallbacks: Array<() => void> = [];

  /**
   * 唯一标识符（延迟初始化）
   * 首次访问时通过 IdGenerator 生成，格式：type_N
   */
  get id(): string {
    if (this._id === null) {
      this._id = generateId(this.type);
    }
    return this._id;
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

  get position(): Vector3 | undefined {
    return this._position;
  }

  /**
   * 设置位置
   */
  set position(pos: Vector3 | undefined) {
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
    // 触发所有 onSpawn 回调
    for (const callback of this._onSpawnCallbacks) {
      callback();
    }
  }

  /**
   * 当 Actor 从场景移除时调用
   */
  onDespawn(): void {
    this._state = 'removed';
    // 触发所有 onDespawn 回调
    for (const callback of this._onDespawnCallbacks) {
      callback();
    }
  }

  /**
   * 订阅 onSpawn 事件
   * @returns 取消订阅函数
   */
  addSpawnListener(callback: () => void): () => void {
    this._onSpawnCallbacks.push(callback);
    return () => {
      const index = this._onSpawnCallbacks.indexOf(callback);
      if (index !== -1) {
        this._onSpawnCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 订阅 onDespawn 事件
   * @returns 取消订阅函数
   */
  addDespawnListener(callback: () => void): () => void {
    this._onDespawnCallbacks.push(callback);
    return () => {
      const index = this._onDespawnCallbacks.indexOf(callback);
      if (index !== -1) {
        this._onDespawnCallbacks.splice(index, 1);
      }
    };
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
    const posData = data.position as { x: number; y: number; z?: number } | undefined;
    this._position = posData ? new Vector3(posData.x, posData.y, posData.z ?? 0) : undefined;
    this._team = data.team as string | undefined;
    this._displayName = data.displayName as string | undefined;
  }
}
