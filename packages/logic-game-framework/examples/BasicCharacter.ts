/**
 * 基础角色示例
 *
 * 本示例展示如何使用框架创建一个带属性系统和技能系统的战斗角色。
 *
 * 核心概念：
 * 1. 使用 defineAttributes() 创建类型安全的属性集
 * 2. 继承 Actor 创建游戏实体
 * 3. 使用 AbilitySet 管理技能和 Buff
 * 4. Ability + Component 组合实现不同类型的能力
 *
 * @example
 * ```typescript
 * const hero = new Character('勇者');
 * hero.onSpawn();
 *
 * console.log(hero.hp);     // 100
 * console.log(hero.atk);    // 50
 *
 * hero.takeDamage(30);
 * console.log(hero.hp);     // 70
 * ```
 */

import { Actor } from '../src/core/entity/Actor.js';
import { defineAttributes, type AttributeSet } from '../src/core/attributes/index.js';
import { Ability } from '../src/core/abilities/Ability.js';
import { createAbilitySet, type AbilitySet } from '../src/core/abilities/AbilitySet.js';
import { StatModifierComponent } from '../src/stdlib/components/StatModifierComponent.js';
import { DurationComponent } from '../src/stdlib/components/DurationComponent.js';
import { ModifierType } from '../src/core/attributes/AttributeModifier.js';

// 注意：AbilitySet 不再需要泛型参数

// ============================================================
// 第一步：定义属性配置
// ============================================================

/**
 * 角色属性配置
 *
 * 使用 `as const` 确保类型推断正确
 */
const CharacterAttributes = {
  // 生命值
  hp: { baseValue: 100, minValue: 0 },
  maxHp: { baseValue: 100, minValue: 1 },

  // 战斗属性
  atk: { baseValue: 50 },
  def: { baseValue: 30 },
  speed: { baseValue: 100 },

  // 暴击
  critRate: { baseValue: 0.05, minValue: 0, maxValue: 1 },
  critDamage: { baseValue: 1.5, minValue: 1 },
} as const;

/**
 * 属性配置类型（用于类型注解）
 */
type CharacterAttributesConfig = typeof CharacterAttributes;

// ============================================================
// 第二步：创建角色类
// ============================================================

/**
 * 游戏角色
 *
 * 继承 Actor，使用 defineAttributes() 创建属性系统
 * 使用 AbilitySet 管理技能和 Buff
 */
export class Character extends Actor {
  readonly type = 'Character';

  /** 类型安全的属性集 */
  readonly attributes: AttributeSet<CharacterAttributesConfig>;

  /** 能力集合（取代 abilities: Ability[]） */
  readonly abilitySet: AbilitySet;

  constructor(name: string, team?: string) {
    super();
    this.displayName = name;
    this.team = team;

    // 创建属性集
    this.attributes = defineAttributes(CharacterAttributes);

    // 创建能力集合（传入 modifierTarget）
    this.abilitySet = createAbilitySet(this.toRef(), this.attributes._modifierTarget);

    // 注册 Ability 回调
    this.abilitySet.onAbilityGranted((ability) => {
      console.log(`${this.displayName} 获得能力: ${ability.displayName ?? ability.configId}`);
    });

    this.abilitySet.onAbilityRevoked((ability, reason) => {
      console.log(`${this.displayName} 失去能力: ${ability.displayName ?? ability.configId} (${reason})`);
    });

    // 订阅 HP 变化
    this.attributes.onHpChanged((event) => {
      console.log(`${this.displayName} HP: ${event.oldValue} → ${event.newValue}`);
      if (event.newValue <= 0) {
        this.onDeath();
      }
    });
  }

  // ========== 属性快捷访问 ==========
  // 类型安全，IDE 自动补全

  get hp() { return this.attributes.hp; }
  get maxHp() { return this.attributes.maxHp; }
  get atk() { return this.attributes.atk; }
  get def() { return this.attributes.def; }
  get speed() { return this.attributes.speed; }
  get critRate() { return this.attributes.critRate; }
  get critDamage() { return this.attributes.critDamage; }

  // ========== 属性操作 ==========

  /**
   * 造成伤害
   * @returns 实际伤害值
   */
  takeDamage(damage: number): number {
    const currentHp = this.attributes.getBase('hp');
    const actualDamage = Math.min(damage, currentHp);
    this.attributes.modifyBase('hp', -actualDamage);
    return actualDamage;
  }

  /**
   * 治疗
   * @returns 实际治疗量
   */
  heal(amount: number): number {
    const currentHp = this.attributes.getBase('hp');
    const maxHp = this.maxHp;
    const actualHeal = Math.min(amount, maxHp - currentHp);
    if (actualHeal > 0) {
      this.attributes.modifyBase('hp', actualHeal);
    }
    return actualHeal;
  }

  /**
   * 查看属性详情
   */
  showAtkBreakdown(): void {
    const breakdown = this.attributes.$atk;
    console.log(`${this.displayName} 攻击力分解：`);
    console.log(`  基础值: ${breakdown.base}`);
    console.log(`  肉体强化: +${breakdown.addBaseSum}`);
    console.log(`  肉体潜能: ×${breakdown.mulBaseProduct}`);
    console.log(`  外物附加: +${breakdown.addFinalSum}`);
    console.log(`  最终值: ${breakdown.currentValue}`);
  }

  // ========== 生命周期 ==========

  onSpawn(): void {
    super.onSpawn();
    // 初始化 HP 为 MaxHP
    this.attributes.setBase('hp', this.maxHp);
  }

  onDeath(): void {
    super.onDeath();
    console.log(`${this.displayName} 已阵亡！`);
    // 清理非永久 Ability
    this.abilitySet.revokeAbilitiesByTag('buff', 'manual');
  }

  // 注意：AbilitySet.tick() 由 StandardAbilitySystem 统一驱动
  // Actor 不再需要 tick() 方法，所有逻辑由 System 处理
}

// ============================================================
// 第三步：创建 Buff 示例
// ============================================================

/**
 * 创建攻击力 Buff
 *
 * 展示如何使用 Ability + StatModifierComponent 创建属性修改效果
 * Component 在 Ability 构造时注入，运行时不可修改
 */
export function createAtkBuff(
  owner: Character,
  source: Character,
  value: number
): Ability {
  // Component 在构造时注入
  return new Ability(
    {
      configId: 'buff_atk',
      displayName: '力量增强',
      tags: ['buff'],
      components: [
        new StatModifierComponent([
          {
            attributeName: owner.attributes.atkAttribute, // → 'atk'
            modifierType: ModifierType.AddBase,
            value,
          },
        ]),
      ],
    },
    owner.toRef(),
    source.toRef()
  );
}

/**
 * 创建带持续时间的 Buff
 */
export function createTimedBuff(
  owner: Character,
  source: Character,
  attrName: string,
  value: number,
  durationMs: number
): Ability {
  return new Ability(
    {
      configId: 'buff_timed',
      displayName: '临时强化',
      tags: ['buff'],
      components: [
        new DurationComponent(durationMs, 'time'),
        new StatModifierComponent([
          {
            attributeName: attrName,
            modifierType: ModifierType.AddBase,
            value,
          },
        ]),
      ],
    },
    owner.toRef(),
    source.toRef()
  );
}

// ============================================================
// 使用示例
// ============================================================

/**
 * 运行示例
 */
export function runExample(): void {
  console.log('=== 基础角色示例 ===\n');

  // 创建角色
  const hero = new Character('勇者', 'A');
  hero.onSpawn();

  console.log('\n--- 初始状态 ---');
  console.log(`HP: ${hero.hp}/${hero.maxHp}`);
  console.log(`ATK: ${hero.atk}`);
  console.log(`DEF: ${hero.def}`);

  // 添加攻击力 Buff（通过 AbilitySet）
  console.log('\n--- 添加 +20 攻击力 Buff ---');
  const buff = createAtkBuff(hero, hero, 20);
  hero.abilitySet.grantAbility(buff);
  console.log(`ATK: ${hero.atk}`); // 70

  // 查看属性分解
  console.log('\n--- 属性分解 ---');
  hero.showAtkBreakdown();

  // 造成伤害
  console.log('\n--- 受到 30 点伤害 ---');
  hero.takeDamage(30);
  console.log(`HP: ${hero.hp}/${hero.maxHp}`);

  // 移除 Buff（通过 AbilitySet）
  console.log('\n--- 移除 Buff ---');
  hero.abilitySet.revokeAbility(buff.id);
  console.log(`ATK: ${hero.atk}`); // 50

  // 添加带持续时间的 Buff
  console.log('\n--- 添加 3000ms 持续的防御 Buff ---');
  const timedBuff = createTimedBuff(hero, hero, 'def', 10, 3000);
  hero.abilitySet.grantAbility(timedBuff);
  console.log(`DEF: ${hero.def}`); // 40

  // 模拟时间流逝（在实际战斗中由 StandardAbilitySystem 驱动）
  console.log('\n--- 模拟 3500ms 后 ---');
  hero.abilitySet.tick(3500);
  console.log(`DEF: ${hero.def}`); // 30（Buff 已过期）
}

// 如果直接运行此文件
// runExample();
