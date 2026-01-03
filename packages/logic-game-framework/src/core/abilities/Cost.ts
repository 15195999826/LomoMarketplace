/**
 * Cost - 消耗接口
 *
 * 用于技能释放时扣除资源的消耗。
 * ActiveUseComponent 在激活时会依次执行所有 costs。
 *
 * ## Tag 来源说明
 *
 * Cost 操作 Tag 时的来源规则：
 * - **添加 Tag**: 有 duration → AutoDurationTag，无 duration → LooseTag
 * - **消耗/移除 Tag**: 只操作 LooseTag（ComponentTag 和 AutoDurationTag 不可消耗）
 *
 * ## 使用示例
 *
 * ```typescript
 * // 冷却消耗 - 添加 AutoDuration 冷却 Tag
 * new CooldownCost(5000)  // 5秒冷却
 *
 * // 消耗 LooseTag 层数
 * new ConsumeTagCost('combo_point', 3)  // 消耗3层连击点
 *
 * // 添加 LooseTag（永久，需手动移除）
 * new AddTagCost('charging', { stacks: 1 })
 *
 * // 添加 AutoDurationTag（自动过期）
 * new AddTagCost('combo_window', { duration: 1000 })
 * ```
 */

import type { ActorRef } from '../types/common.js';
import type { AbilitySet } from './AbilitySet.js';
import type { IAbilityForComponent } from './AbilityComponent.js';

/**
 * 消耗上下文
 */
export type CostContext = {
  /** 技能所有者 */
  readonly owner: ActorRef;
  /** AbilitySet 引用（可操作 Tag） */
  readonly abilitySet: AbilitySet;
  /** 当前 Ability */
  readonly ability: IAbilityForComponent;
  /** 游戏状态 */
  readonly gameplayState: unknown;
  /** 当前逻辑时间 */
  readonly logicTime: number;
};

/**
 * 消耗接口
 */
export interface Cost {
  /** 消耗类型标识（用于调试） */
  readonly type: string;

  /**
   * 检查是否能支付消耗
   *
   * @param ctx 消耗上下文
   * @returns true 表示可以支付
   */
  canPay(ctx: CostContext): boolean;

  /**
   * 支付消耗
   *
   * @param ctx 消耗上下文
   */
  pay(ctx: CostContext): void;

  /**
   * 获取无法支付时的原因（可选，用于 UI 提示）
   */
  getFailReason?(ctx: CostContext): string;
}

// ========== 常用消耗实现 ==========

/**
 * 冷却消耗 - 添加 AutoDuration 冷却 Tag
 *
 * 冷却通过 AutoDurationTag 实现：`cooldown:{configId}`
 * Tag 会在 duration 后自动过期。
 */
export class CooldownCost implements Cost {
  readonly type = 'cooldown';

  constructor(private readonly duration: number) {}

  canPay(): boolean {
    return true; // 冷却总是可以添加
  }

  pay(ctx: CostContext): void {
    const cooldownTag = `cooldown:${ctx.ability.configId}`;
    ctx.abilitySet.addAutoDurationTag(cooldownTag, this.duration);
  }
}

/**
 * 消耗 LooseTag 层数
 *
 * 只能消耗 LooseTag，不能消耗 ComponentTag 或 AutoDurationTag。
 */
export class ConsumeTagCost implements Cost {
  readonly type = 'consumeTag';

  constructor(
    private readonly tag: string,
    private readonly stacks: number = 1
  ) {}

  canPay(ctx: CostContext): boolean {
    // 只检查 LooseTag 层数
    return ctx.abilitySet.getLooseTagStacks(this.tag) >= this.stacks;
  }

  pay(ctx: CostContext): void {
    ctx.abilitySet.removeLooseTag(this.tag, this.stacks);
  }

  getFailReason(ctx: CostContext): string {
    const current = ctx.abilitySet.getLooseTagStacks(this.tag);
    return `${this.tag} 层数不足: ${current}/${this.stacks}`;
  }
}

/**
 * 移除 LooseTag（全部移除）
 *
 * 只能移除 LooseTag，不能移除 ComponentTag 或 AutoDurationTag。
 */
export class RemoveTagCost implements Cost {
  readonly type = 'removeTag';

  constructor(private readonly tag: string) {}

  canPay(ctx: CostContext): boolean {
    // 只检查 LooseTag
    return ctx.abilitySet.hasLooseTag(this.tag);
  }

  pay(ctx: CostContext): void {
    ctx.abilitySet.removeLooseTag(this.tag);
  }

  getFailReason(): string {
    return `缺少 Tag: ${this.tag}`;
  }
}

/**
 * 添加 Tag 消耗
 *
 * - 有 duration: 添加 AutoDurationTag（自动过期）
 * - 无 duration: 添加 LooseTag（需手动移除）
 */
export class AddTagCost implements Cost {
  readonly type = 'addTag';

  constructor(
    private readonly tag: string,
    private readonly options?: { duration?: number; stacks?: number }
  ) {}

  canPay(): boolean {
    return true; // 添加 Tag 总是可以
  }

  pay(ctx: CostContext): void {
    if (this.options?.duration) {
      // 有 duration: AutoDurationTag
      ctx.abilitySet.addAutoDurationTag(this.tag, this.options.duration);
    } else {
      // 无 duration: LooseTag
      ctx.abilitySet.addLooseTag(this.tag, this.options?.stacks ?? 1);
    }
  }
}
