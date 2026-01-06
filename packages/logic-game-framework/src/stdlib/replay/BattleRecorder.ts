/**
 * BattleRecorder - 战斗录制器
 *
 * 通过 Observer 模式订阅 Actor 组件的回调，将变化转化为标准事件并记录。
 *
 * ## 核心设计
 *
 * - **Core 层纯粹性**: Core 层组件不依赖 BattleRecorder
 * - **可选功能**: BattleRecorder 是可选的 stdlib 组件
 * - **事件继承 GameEventBase**: 所有事件带 kind + logicTime
 * - **自动清理**: 停止录制时自动清理所有订阅
 *
 * ## 使用方式
 *
 * ```typescript
 * const recorder = new BattleRecorder({
 *   battleId: 'battle_123',
 *   tickInterval: 100,
 * });
 *
 * // 开始录制（传入实现 IRecordableActor 的 Actor 列表）
 * recorder.startRecording(actors, configs);
 *
 * // 每帧记录事件
 * recorder.recordFrame(frameNumber, events);
 *
 * // 停止录制并导出
 * const record = recorder.stopRecording();
 * const json = JSON.stringify(record, null, 2);
 * ```
 */

import type { GameEventBase } from '../../core/events/GameEvent.js';
import {
  createActorSpawnedEvent,
  createActorDestroyedEvent,
} from '../../core/events/GameEvent.js';
import { generateId } from '../../core/utils/IdGenerator.js';
import {
  REPLAY_PROTOCOL_VERSION,
  type IBattleRecord,
  type IBattleMeta,
  type IFrameData,
  type IActorInitData,
  type IRecordingContext,
  type IRecordableActor,
} from './ReplayTypes.js';

// ========== 配置接口 ==========

/**
 * BattleRecorder 配置
 */
export interface IBattleRecorderConfig {
  /** 战斗 ID（可选，默认自动生成） */
  battleId?: string;

  /** tick 间隔（毫秒，默认 100） */
  tickInterval?: number;
}

/**
 * 取消订阅函数
 */
type UnsubscribeFn = () => void;

/**
 * Actor 订阅信息
 */
interface ActorSubscription {
  actorId: string;
  unsubscribes: UnsubscribeFn[];
}

// ========== BattleRecorder 类 ==========

/**
 * 战斗录制器
 *
 * 订阅 Actor 组件回调，记录事件到时间线。
 */
export class BattleRecorder {
  private readonly config: Required<IBattleRecorderConfig>;

  // 录制状态
  private isRecording = false;
  private currentFrame = 0;
  private recordedAt = 0;

  // 数据
  private configs: Record<string, unknown> = {};
  private initialActors: IActorInitData[] = [];
  private readonly timeline: IFrameData[] = [];

  // 订阅管理
  private readonly actorSubscriptions = new Map<string, ActorSubscription>();

  // 当前帧待记录事件（用于订阅回调产生的事件）
  private pendingEvents: GameEventBase[] = [];

  constructor(config?: IBattleRecorderConfig) {
    this.config = {
      battleId: config?.battleId ?? generateId('battle'),
      tickInterval: config?.tickInterval ?? 100,
    };
  }

  // ========== 录制控制 ==========

  /**
   * 开始录制
   *
   * @param actors 初始 Actor 列表（需实现 IRecordableActor）
   * @param configs 配置数据（可选）
   */
  startRecording(actors: IRecordableActor[], configs?: Record<string, unknown>): void {
    if (this.isRecording) {
      throw new Error('[BattleRecorder] Already recording');
    }

    this.isRecording = true;
    this.recordedAt = Date.now();
    this.currentFrame = 0;
    this.timeline.length = 0;
    this.configs = configs ?? {};
    this.pendingEvents = [];

    // 捕获初始状态
    this.initialActors = actors.map((actor) => this.captureActorInitData(actor));

    // 订阅所有 Actor（如果 Actor 提供订阅方法）
    for (const actor of actors) {
      this.subscribeActor(actor);
    }
  }

  /**
   * 记录一帧事件
   *
   * @param frame 帧号
   * @param events 本帧产生的事件（来自 EventCollector.flush()）
   */
  recordFrame(frame: number, events: GameEventBase[]): void {
    if (!this.isRecording) {
      return;
    }

    this.currentFrame = frame;

    // 合并外部事件和订阅产生的 pending 事件
    const allEvents = [...events, ...this.pendingEvents];
    this.pendingEvents = [];

    // 只记录非空帧
    if (allEvents.length > 0) {
      this.timeline.push({
        frame,
        events: allEvents,
      });
    }
  }

  /**
   * 停止录制
   *
   * @param result 战斗结果（可选）
   * @returns 完整的战斗记录
   */
  stopRecording(result?: string): IBattleRecord {
    if (!this.isRecording) {
      throw new Error('[BattleRecorder] Not recording');
    }

    // 清理所有订阅
    for (const subscription of this.actorSubscriptions.values()) {
      for (const unsub of subscription.unsubscribes) {
        unsub();
      }
    }
    this.actorSubscriptions.clear();

    this.isRecording = false;

    const meta: IBattleMeta = {
      battleId: this.config.battleId,
      recordedAt: this.recordedAt,
      tickInterval: this.config.tickInterval,
      totalFrames: this.currentFrame,
      result,
    };

    return {
      version: REPLAY_PROTOCOL_VERSION,
      meta,
      configs: this.configs,
      initialActors: this.initialActors,
      timeline: this.timeline,
    };
  }

  /**
   * 导出为 JSON 字符串
   *
   * @param result 战斗结果（可选）
   * @param pretty 是否格式化（默认 true）
   */
  exportJSON(result?: string, pretty = true): string {
    const record = this.stopRecording(result);
    return JSON.stringify(record, null, pretty ? 2 : undefined);
  }

  // ========== 状态查询 ==========

  /** 是否正在录制 */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /** 当前帧号 */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /** 获取时间线（只读） */
  getTimeline(): readonly IFrameData[] {
    return this.timeline;
  }

  // ========== 动态 Actor 管理 ==========

  /**
   * 注册新 Actor（战斗中动态创建时调用）
   */
  registerActor(actor: IRecordableActor): void {
    if (!this.isRecording) return;

    // 记录 Actor 创建事件
    const initData = this.captureActorInitData(actor);
    const event = createActorSpawnedEvent(initData);
    this.pendingEvents.push(event);

    // 订阅 Actor
    this.subscribeActor(actor);
  }

  /**
   * 注销 Actor（战斗中销毁时调用）
   */
  unregisterActor(actorId: string, reason?: string): void {
    if (!this.isRecording) return;

    // 记录 Actor 销毁事件
    const event = createActorDestroyedEvent(actorId, reason);
    this.pendingEvents.push(event);

    // 取消订阅
    const subscription = this.actorSubscriptions.get(actorId);
    if (subscription) {
      for (const unsub of subscription.unsubscribes) {
        unsub();
      }
      this.actorSubscriptions.delete(actorId);
    }
  }

  // ========== 内部方法 ==========

  /**
   * 订阅 Actor 的组件回调
   *
   * 通过调用 Actor 的 setupRecording 方法，让 Actor 自行决定订阅什么。
   * 这种控制反转设计避免了 duck typing，实现完全类型安全。
   */
  private subscribeActor(actor: IRecordableActor): void {
    const actorId = actor.id;

    // 避免重复订阅
    if (this.actorSubscriptions.has(actorId)) {
      return;
    }

    // 如果 Actor 没有实现 setupRecording，跳过订阅
    if (!actor.setupRecording) {
      return;
    }

    // 创建录像上下文
    const ctx: IRecordingContext = {
      actorId,
      getLogicTime: () => this.currentFrame * this.config.tickInterval,
      pushEvent: (event: GameEventBase) => {
        if (this.isRecording) {
          this.pendingEvents.push(event);
        }
      },
    };

    // 调用 Actor 的 setupRecording，获取取消订阅函数列表
    const unsubscribes = actor.setupRecording(ctx);

    // 保存订阅信息
    if (unsubscribes.length > 0) {
      this.actorSubscriptions.set(actorId, {
        actorId,
        unsubscribes,
      });
    }
  }

  /**
   * 捕获 Actor 初始数据
   */
  private captureActorInitData(actor: IRecordableActor): IActorInitData {
    const position: IActorInitData['position'] = {};

    if (actor.position) {
      position.world = {
        x: actor.position.x,
        y: actor.position.y,
        z: actor.position.z ?? 0,
      };
    }

    return {
      id: actor.id,
      configId: actor.configId ?? 'unknown',
      displayName: actor.displayName ?? actor.id,
      team: actor.team ?? 0,
      position,
      attributes: actor.getAttributeSnapshot(),
      abilities: actor.getAbilitySnapshot(),
      tags: actor.getTagSnapshot(),
    };
  }
}
