/**
 * StackComponent - 层数组件
 *
 * 管理 Ability 的叠加层数
 */

import {
  BaseAbilityComponent,
  ComponentTypes,
} from '../../core/abilities/AbilityComponent.js';

/**
 * 层数溢出策略
 */
export type StackOverflowPolicy = 'cap' | 'refresh' | 'reject';

/**
 * StackComponent
 */
export class StackComponent extends BaseAbilityComponent {
  readonly type = ComponentTypes.STACK;

  private stacks: number;
  private maxStacks: number;
  private overflowPolicy: StackOverflowPolicy;

  /**
   * @param initialStacks 初始层数
   * @param maxStacks 最大层数
   * @param overflowPolicy 溢出策略
   */
  constructor(
    initialStacks: number = 1,
    maxStacks: number = 1,
    overflowPolicy: StackOverflowPolicy = 'cap'
  ) {
    super();
    this.stacks = initialStacks;
    this.maxStacks = maxStacks;
    this.overflowPolicy = overflowPolicy;
  }

  /**
   * 获取当前层数
   */
  getStacks(): number {
    return this.stacks;
  }

  /**
   * 获取最大层数
   */
  getMaxStacks(): number {
    return this.maxStacks;
  }

  /**
   * 是否已满层
   */
  isFull(): boolean {
    return this.stacks >= this.maxStacks;
  }

  /**
   * 添加层数
   * @returns 实际添加的层数
   */
  addStacks(count: number): number {
    const before = this.stacks;
    const newValue = this.stacks + count;

    switch (this.overflowPolicy) {
      case 'cap':
        this.stacks = Math.min(newValue, this.maxStacks);
        break;
      case 'refresh':
        this.stacks = Math.min(newValue, this.maxStacks);
        // 可在此触发刷新逻辑
        break;
      case 'reject':
        if (newValue <= this.maxStacks) {
          this.stacks = newValue;
        }
        // 否则不添加
        break;
    }

    return this.stacks - before;
  }

  /**
   * 移除层数
   * @returns 实际移除的层数
   */
  removeStacks(count: number): number {
    const before = this.stacks;
    this.stacks = Math.max(0, this.stacks - count);

    if (this.stacks === 0) {
      this.markExpired();
    }

    return before - this.stacks;
  }

  /**
   * 设置层数
   */
  setStacks(count: number): void {
    this.stacks = Math.max(0, Math.min(count, this.maxStacks));
    if (this.stacks === 0) {
      this.markExpired();
    }
  }

  /**
   * 重置为初始层数
   */
  reset(): void {
    this.stacks = 1;
    this._state = 'active';
  }

  serialize(): object {
    return {
      stacks: this.stacks,
      maxStacks: this.maxStacks,
      overflowPolicy: this.overflowPolicy,
    };
  }

  deserialize(data: object): void {
    const d = data as { stacks: number; maxStacks: number; overflowPolicy: StackOverflowPolicy };
    this.stacks = d.stacks;
    this.maxStacks = d.maxStacks;
    this.overflowPolicy = d.overflowPolicy;
  }
}

/**
 * 创建层数组件的便捷函数
 */
export function stack(
  initialStacks: number = 1,
  maxStacks: number = 1
): StackComponent {
  return new StackComponent(initialStacks, maxStacks);
}
