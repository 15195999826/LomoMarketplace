/**
 * RenderWorld - 渲染状态管理
 *
 * 管理战斗回放的渲染状态，将 VisualAction 应用到状态上。
 *
 * 职责分离：
 * - ActionScheduler 管理"时序"（什么时候执行）
 * - RenderWorld 管理"状态"（当前值是什么）
 *
 * @module lib/battle-replay/world/RenderWorld
 */

import type { IBattleRecord, IActorInitData } from '@inkmon/battle';
import { hexToWorld, worldToHex, type HexMapConfig, type WorldCoordConfig } from '@lomo/hex-grid';

import type {
  HexCoord,
  WorldCoord,
  VisualAction,
  ActiveAction,
  MoveAction,
  UpdateHPAction,
  FloatingTextAction,
  MeleeStrikeAction,
  SpriteVFXAction,
  ProceduralVFXAction,
  EasingFunction,
} from '../types/VisualAction';
import {
  isMoveAction,
  isUpdateHPAction,
  isFloatingTextAction,
  isMeleeStrikeAction,
  isSpriteVFXAction,
  isProceduralVFXAction,
} from '../types/VisualAction';
import type { VisualizerContext } from '../types/VisualizerContext';
import type {
  AnimationConfig,
} from '../types/AnimationConfig';
import { DEFAULT_ANIMATION_CONFIG } from '../types/AnimationConfig';
import type {
  RenderState,
  ActorRenderState,
  FloatingTextInstance,
  SpriteVFXInstance,
  ProceduralEffectInstance,
  ScreenShakeState,
} from '../types/RenderState';

// ========== 缓动函数实现 ==========

const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};

/**
 * 应用缓动函数
 */
function applyEasing(progress: number, easing: EasingFunction): number {
  return easingFunctions[easing](progress);
}

/**
 * 线性插值
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ========== 内部状态类型 ==========

interface InternalActorState {
  id: string;
  displayName: string;
  team: 'A' | 'B';
  position: HexCoord;
  visualHP: number;
  maxHP: number;
  isAlive: boolean;
  elements: string[];
  flashProgress?: number;
  tintColor?: string;
}

// ========== MeleeStrike 实例 ==========

interface MeleeStrikeInstance {
  id: string;
  from: WorldCoord;
  to: WorldCoord;
  style: 'slash' | 'thrust' | 'impact';
  color?: string;
  startTime: number;
  duration: number;
}

// ========== RenderWorld 实现 ==========

/**
 * RenderWorld 类
 *
 * 管理战斗回放的渲染状态
 */
export class RenderWorld {
  /** Actor 状态 Map */
  private actors: Map<string, InternalActorState> = new Map();

  /** 插值位置 Map（用于移动动画） */
  private interpolatedPositions: Map<string, HexCoord> = new Map();

  /** 活跃的飘字 */
  private floatingTexts: FloatingTextInstance[] = [];

  /** 活跃的 Sprite 特效 */
  private spriteVFX: SpriteVFXInstance[] = [];

  /** 活跃的程序化特效 */
  private proceduralEffects: ProceduralEffectInstance[] = [];

  /** 活跃的近战打击特效 */
  private meleeStrikes: MeleeStrikeInstance[] = [];

  /** 震屏状态 */
  private screenShake?: ScreenShakeState;

  /** 地图配置 */
  private mapConfig: HexMapConfig;

  /** 动画配置 */
  private animationConfig: AnimationConfig;

  /** 实例 ID 计数器 */
  private nextInstanceId = 0;

  /**
   * 构造函数
   *
   * @param replay 战斗回放数据
   * @param animationConfig 动画配置（可选）
   */
  constructor(replay: IBattleRecord, animationConfig?: Partial<AnimationConfig>) {
    // 获取地图配置
    this.mapConfig = (replay.configs?.map as HexMapConfig) ?? {
      hexSize: 50,
      orientation: 'flat',
    };

    // 合并动画配置
    this.animationConfig = {
      ...DEFAULT_ANIMATION_CONFIG,
      ...animationConfig,
    };

    // 初始化 Actor 状态
    this.initializeActors(replay.initialActors);
  }

  /**
   * 初始化 Actor 状态
   */
  private initializeActors(initialActors: IActorInitData[]): void {
    for (const actor of initialActors) {
      const position = this.extractPosition(actor);
      const elements = (actor as { elements?: string[] }).elements ?? [];

      this.actors.set(actor.id, {
        id: actor.id,
        displayName: actor.displayName,
        team: actor.team === 'A' || actor.team === 1 ? 'A' : 'B',
        position,
        visualHP: actor.attributes.hp ?? 0,
        maxHP: actor.attributes.maxHp ?? actor.attributes.hp ?? 100,
        isAlive: true,
        elements,
      });

      // 初始化插值位置
      this.interpolatedPositions.set(actor.id, { ...position });
    }
  }

  /**
   * 从 Actor 初始数据提取位置
   */
  private extractPosition(actor: IActorInitData): HexCoord {
    if (actor.position?.hex) {
      return { q: actor.position.hex.q, r: actor.position.hex.r };
    }

    if (actor.position?.world) {
      const hexCoord = worldToHex(
        { x: actor.position.world.x, y: actor.position.world.y },
        this.getWorldCoordConfig()
      );
      return { q: hexCoord.q, r: hexCoord.r };
    }

    return { q: 0, r: 0 };
  }

  /**
   * 获取世界坐标转换配置
   */
  private getWorldCoordConfig(): WorldCoordConfig {
    return {
      hexSize: this.mapConfig.hexSize,
      orientation: this.mapConfig.orientation,
      // mapCenter 使用默认值 {x: 0, y: 0}
    };
  }

  /**
   * 生成唯一实例 ID
   */
  private generateInstanceId(): string {
    return `inst_${this.nextInstanceId++}`;
  }

  // ========== 动作应用 ==========

  /**
   * 应用活跃动作到状态
   *
   * @param activeActions 当前活跃的动作列表
   */
  applyActions(activeActions: ActiveAction[]): void {
    for (const activeAction of activeActions) {
      // 跳过延迟中的动作
      if (activeAction.isDelaying) continue;

      this.applyAction(activeAction);
    }
  }

  /**
   * 应用单个动作
   */
  private applyAction(activeAction: ActiveAction): void {
    const { action, progress } = activeAction;

    if (isMoveAction(action)) {
      this.applyMoveAction(action, progress);
    } else if (isUpdateHPAction(action)) {
      this.applyUpdateHPAction(action, progress);
    } else if (isFloatingTextAction(action)) {
      this.applyFloatingTextAction(action, activeAction.id);
    } else if (isMeleeStrikeAction(action)) {
      this.applyMeleeStrikeAction(action, activeAction.id);
    } else if (isSpriteVFXAction(action)) {
      this.applySpriteVFXAction(action, activeAction.id);
    } else if (isProceduralVFXAction(action)) {
      this.applyProceduralVFXAction(action, activeAction.id, progress);
    }
  }

  /**
   * 应用移动动作
   */
  private applyMoveAction(action: MoveAction, progress: number): void {
    const easedProgress = applyEasing(progress, action.easing);

    const interpolatedPos: HexCoord = {
      q: lerp(action.from.q, action.to.q, easedProgress),
      r: lerp(action.from.r, action.to.r, easedProgress),
    };

    this.interpolatedPositions.set(action.actorId, interpolatedPos);

    // 动画完成时更新 Actor 的实际位置
    if (progress >= 1) {
      const actor = this.actors.get(action.actorId);
      if (actor) {
        actor.position = { ...action.to };
      }
    }
  }

  /**
   * 应用血条更新动作
   */
  private applyUpdateHPAction(action: UpdateHPAction, progress: number): void {
    const actor = this.actors.get(action.actorId);
    if (!actor) return;

    // 线性插值 HP
    actor.visualHP = lerp(action.fromHP, action.toHP, progress);

    // 动画完成时确保精确值
    if (progress >= 1) {
      actor.visualHP = action.toHP;
      actor.isAlive = action.toHP > 0;
    }
  }

  /**
   * 应用飘字动作
   */
  private applyFloatingTextAction(action: FloatingTextAction, actionId: string): void {
    // 检查是否已存在（避免重复添加）
    const exists = this.floatingTexts.some((t) => t.id === actionId);
    if (exists) return;

    this.floatingTexts.push({
      id: actionId,
      actorId: action.actorId, // 保存 actorId
      text: action.text,
      color: action.color,
      position: action.position,
      startTime: Date.now(),
      duration: action.duration,
      style: action.style,
    });
  }

  /**
   * 应用近战打击动作
   */
  private applyMeleeStrikeAction(action: MeleeStrikeAction, actionId: string): void {
    // 检查是否已存在
    const exists = this.meleeStrikes.some((s) => s.id === actionId);
    if (exists) return;

    this.meleeStrikes.push({
      id: actionId,
      from: action.from,
      to: action.to,
      style: action.style,
      color: action.color,
      startTime: Date.now(),
      duration: action.duration,
    });
  }

  /**
   * 应用 Sprite 特效动作
   */
  private applySpriteVFXAction(action: SpriteVFXAction, actionId: string): void {
    // 检查是否已存在
    const exists = this.spriteVFX.some((v) => v.id === actionId);
    if (exists) return;

    this.spriteVFX.push({
      id: actionId,
      vfxId: action.vfxId,
      position: action.position,
      startTime: Date.now(),
      duration: action.duration,
      scale: action.scale ?? 1,
      rotation: action.rotation ?? 0,
    });
  }

  /**
   * 应用程序化特效动作
   */
  private applyProceduralVFXAction(
    action: ProceduralVFXAction,
    actionId: string,
    progress: number
  ): void {
    switch (action.effect) {
      case 'hitFlash':
        if (action.actorId) {
          const actor = this.actors.get(action.actorId);
          if (actor) {
            // 闪白效果：前半段增强，后半段衰减
            actor.flashProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
          }
        }
        break;

      case 'shake':
        // 震屏效果
        const intensity = action.intensity ?? 5;
        const decay = 1 - progress;
        this.screenShake = {
          offsetX: Math.sin(progress * Math.PI * 8) * intensity * decay,
          offsetY: Math.cos(progress * Math.PI * 6) * intensity * decay * 0.5,
        };
        break;

      case 'colorTint':
        if (action.actorId) {
          const actor = this.actors.get(action.actorId);
          if (actor) {
            actor.tintColor = progress < 1 ? action.color : undefined;
          }
        }
        break;
    }

    // 添加到程序化特效列表（用于渲染层查询）
    const exists = this.proceduralEffects.some((e) => e.id === actionId);
    if (!exists) {
      this.proceduralEffects.push({
        id: actionId,
        effect: action.effect,
        actorId: action.actorId,
        startTime: Date.now(),
        duration: action.duration,
        intensity: action.intensity,
        color: action.color,
      });
    }
  }

  // ========== 清理 ==========

  /**
   * 清理过期效果
   *
   * @param now 当前时间戳
   */
  cleanup(now: number): void {
    // 清理过期飘字
    this.floatingTexts = this.floatingTexts.filter(
      (t) => now - t.startTime < t.duration
    );

    // 清理过期 Sprite 特效
    this.spriteVFX = this.spriteVFX.filter(
      (v) => now - v.startTime < v.duration
    );

    // 清理过期程序化特效
    this.proceduralEffects = this.proceduralEffects.filter(
      (e) => now - e.startTime < e.duration
    );

    // 清理过期近战打击
    this.meleeStrikes = this.meleeStrikes.filter(
      (s) => now - s.startTime < s.duration
    );

    // 清理震屏（如果没有活跃的 shake 特效）
    const hasActiveShake = this.proceduralEffects.some(
      (e) => e.effect === 'shake'
    );
    if (!hasActiveShake) {
      this.screenShake = undefined;
    }

    // 清理 Actor 的临时效果
    for (const actor of this.actors.values()) {
      // 检查是否有活跃的 hitFlash
      const hasActiveFlash = this.proceduralEffects.some(
        (e) => e.effect === 'hitFlash' && e.actorId === actor.id
      );
      if (!hasActiveFlash) {
        actor.flashProgress = undefined;
      }

      // 检查是否有活跃的 colorTint
      const hasActiveTint = this.proceduralEffects.some(
        (e) => e.effect === 'colorTint' && e.actorId === actor.id
      );
      if (!hasActiveTint) {
        actor.tintColor = undefined;
      }
    }
  }

  // ========== 状态获取 ==========

  /**
   * 获取当前渲染状态
   *
   * 供 React 组件消费
   */
  getState(): RenderState {
    const actors: ActorRenderState[] = Array.from(this.actors.values()).map(
      (actor) => ({
        id: actor.id,
        displayName: actor.displayName,
        team: actor.team,
        position: actor.position,
        visualHP: actor.visualHP,
        maxHP: actor.maxHP,
        isAlive: actor.isAlive,
        elements: actor.elements,
        flashProgress: actor.flashProgress,
        tintColor: actor.tintColor,
      })
    );

    return {
      actors,
      interpolatedPositions: new Map(this.interpolatedPositions),
      activeSpriteVFX: [...this.spriteVFX],
      proceduralEffects: [...this.proceduralEffects],
      floatingTexts: [...this.floatingTexts],
      screenShake: this.screenShake ? { ...this.screenShake } : undefined,
    };
  }

  /**
   * 创建 VisualizerContext（只读视图）
   *
   * 供 Visualizer 查询状态
   */
  asContext(): VisualizerContext {
    return {
      getActorPosition: (actorId: string): WorldCoord => {
        const pos = this.interpolatedPositions.get(actorId);
        if (!pos) return { x: 0, y: 0 };
        return hexToWorld(pos, this.getWorldCoordConfig());
      },

      getActorHP: (actorId: string): number => {
        return this.actors.get(actorId)?.visualHP ?? 0;
      },

      getActorMaxHP: (actorId: string): number => {
        return this.actors.get(actorId)?.maxHP ?? 0;
      },

      isActorAlive: (actorId: string): boolean => {
        return this.actors.get(actorId)?.isAlive ?? false;
      },

      getActorHexPosition: (actorId: string): HexCoord => {
        return (
          this.interpolatedPositions.get(actorId) ??
          this.actors.get(actorId)?.position ?? { q: 0, r: 0 }
        );
      },

      getActorTeam: (actorId: string): 'A' | 'B' => {
        return this.actors.get(actorId)?.team ?? 'A';
      },

      getAllActorIds: (): string[] => {
        return Array.from(this.actors.keys());
      },

      getAnimationConfig: (): AnimationConfig => {
        return this.animationConfig;
      },

      hexToWorld: (hex: HexCoord): WorldCoord => {
        return hexToWorld(hex, this.getWorldCoordConfig());
      },
    };
  }

  // ========== 重置 ==========

  /**
   * 重置到初始状态
   *
   * @param replay 战斗回放数据
   */
  resetTo(replay: IBattleRecord): void {
    // 清空所有状态
    this.actors.clear();
    this.interpolatedPositions.clear();
    this.floatingTexts = [];
    this.spriteVFX = [];
    this.proceduralEffects = [];
    this.meleeStrikes = [];
    this.screenShake = undefined;

    // 重新初始化
    this.initializeActors(replay.initialActors);
  }

  // ========== 直接状态更新（用于非动画事件） ==========

  /**
   * 直接更新 Actor HP（无动画）
   *
   * 用于处理非动画的 HP 变化
   */
  setActorHP(actorId: string, hp: number): void {
    const actor = this.actors.get(actorId);
    if (actor) {
      actor.visualHP = hp;
      actor.isAlive = hp > 0;
    }
  }

  /**
   * 直接更新 Actor 位置（无动画）
   */
  setActorPosition(actorId: string, position: HexCoord): void {
    const actor = this.actors.get(actorId);
    if (actor) {
      actor.position = { ...position };
      this.interpolatedPositions.set(actorId, { ...position });
    }
  }

  /**
   * 标记 Actor 死亡
   */
  setActorDead(actorId: string): void {
    const actor = this.actors.get(actorId);
    if (actor) {
      actor.isAlive = false;
      actor.visualHP = 0;
    }
  }

  // ========== 近战打击查询（供渲染层使用） ==========

  /**
   * 获取活跃的近战打击特效
   */
  getMeleeStrikes(): MeleeStrikeInstance[] {
    return [...this.meleeStrikes];
  }
}

/**
 * 创建 RenderWorld 实例
 */
export function createRenderWorld(
  replay: IBattleRecord,
  animationConfig?: Partial<AnimationConfig>
): RenderWorld {
  return new RenderWorld(replay, animationConfig);
}
