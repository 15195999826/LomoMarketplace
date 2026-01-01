/**
 * TimeDurationComponent - 基于时间的持续时间组件
 *
 * 控制 Ability 基于游戏时间流逝的持续时间。
 * 通过 tick(dt) 驱动，时间耗尽时主动触发 Ability 过期。
 *
 * ## 适用场景
 * - 实时制游戏的 Buff/Debuff
 * - ATB 战斗系统
 *
 * ## 回合制游戏
 * 如果需要基于回合数的持续时间，项目应自行实现 RoundDurationComponent。
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
} from '../../core/abilities/AbilityComponent.js';

/** 过期原因常量 */
export const EXPIRE_REASON_TIME_DURATION = 'time_duration';

/**
 * TimeDurationComponent - 基于时间的持续时间组件
 */
export class TimeDurationComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.TIME_DURATION;

  private readonly initialDuration: number;
  private remaining: number;

  /**
   * @param durationMs 持续时间（毫秒）
   */
  constructor(durationMs: number) {
    super();
    this.initialDuration = durationMs;
    this.remaining = durationMs;
  }

  onTick(dt: number): void {
    if (this._state === 'expired') return;

    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.triggerExpiration();
    }
  }

  /**
   * 触发过期 - 主动通知 Ability
   */
  private triggerExpiration(): void {
    this.markExpired();
    this.ability?.expire(EXPIRE_REASON_TIME_DURATION);
  }

  /**
   * 获取剩余时间（毫秒）
   */
  getRemaining(): number {
    return Math.max(0, this.remaining);
  }

  /**
   * 获取初始持续时间（毫秒）
   */
  getInitialDuration(): number {
    return this.initialDuration;
  }

  /**
   * 获取进度（0-1，0 表示刚开始，1 表示即将结束）
   */
  getProgress(): number {
    return 1 - this.remaining / this.initialDuration;
  }

  /**
   * 刷新持续时间（重置为初始值）
   */
  refresh(): void {
    this.remaining = this.initialDuration;
    this._state = 'active';
  }

  /**
   * 延长持续时间
   */
  extend(amountMs: number): void {
    this.remaining += amountMs;
  }

  serialize(): object {
    return {
      initialDuration: this.initialDuration,
      remaining: this.remaining,
    };
  }

  deserialize(data: object): void {
    const d = data as { initialDuration: number; remaining: number };
    this.remaining = d.remaining;
  }
}

/**
 * 创建基于时间的持续时间组件
 *
 * @param durationMs 持续时间（毫秒）
 */
export function timeDuration(durationMs: number): TimeDurationComponent {
  return new TimeDurationComponent(durationMs);
}
