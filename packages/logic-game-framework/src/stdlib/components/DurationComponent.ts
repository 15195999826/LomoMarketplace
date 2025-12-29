/**
 * DurationComponent - 持续时间组件
 *
 * 控制 Ability 的持续时间
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
} from '../../core/abilities/AbilityComponent.js';

/**
 * 持续时间类型
 */
export type DurationType = 'time' | 'turns';

/**
 * DurationComponent
 */
export class DurationComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.DURATION;

  private durationType: DurationType;
  private initialDuration: number;
  private remaining: number;

  /**
   * @param duration 持续时间
   * @param durationType 类型：'time' 为毫秒，'turns' 为回合数
   */
  constructor(duration: number, durationType: DurationType = 'time') {
    super();
    this.durationType = durationType;
    this.initialDuration = duration;
    this.remaining = duration;
  }

  onTick(dt: number): void {
    if (this.durationType === 'time') {
      this.remaining -= dt;
      if (this.remaining <= 0) {
        this.markExpired();
      }
    }
  }

  /**
   * 消耗回合（用于回合制）
   */
  consumeTurn(): void {
    if (this.durationType === 'turns') {
      this.remaining -= 1;
      if (this.remaining <= 0) {
        this.markExpired();
      }
    }
  }

  /**
   * 获取剩余时间/回合
   */
  getRemaining(): number {
    return this.remaining;
  }

  /**
   * 获取初始时间/回合
   */
  getInitialDuration(): number {
    return this.initialDuration;
  }

  /**
   * 获取进度（0-1）
   */
  getProgress(): number {
    return 1 - this.remaining / this.initialDuration;
  }

  /**
   * 刷新持续时间
   */
  refresh(): void {
    this.remaining = this.initialDuration;
    this._state = 'active';
  }

  /**
   * 延长持续时间
   */
  extend(amount: number): void {
    this.remaining += amount;
    this.initialDuration += amount;
  }

  serialize(): object {
    return {
      durationType: this.durationType,
      initialDuration: this.initialDuration,
      remaining: this.remaining,
    };
  }

  deserialize(data: object): void {
    const d = data as { durationType: DurationType; initialDuration: number; remaining: number };
    this.durationType = d.durationType;
    this.initialDuration = d.initialDuration;
    this.remaining = d.remaining;
  }
}

/**
 * 创建持续时间组件的便捷函数
 */
export function duration(value: number, type: DurationType = 'time'): DurationComponent {
  return new DurationComponent(value, type);
}
