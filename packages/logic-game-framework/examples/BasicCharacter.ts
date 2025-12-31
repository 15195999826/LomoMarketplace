/**
 * 基础角色示例
 *
 * 本示例展示如何使用框架创建一个带属性系统和技能系统的战斗角色。
 *
 * 核心概念：
 * 1. 使用 defineAttributes() 创建类型安全的属性集
 * 2. 继承 Actor 创建游戏实体
 * 3. 使用 Ability + Component 管理技能和 Buff
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
import { Ability, type AbilityConfig } from '../src/core/abilities/Ability.js';
import type { ComponentLifecycleContext } from '../src/core/abilities/AbilityComponent.js';
import { StatModifierComponent, type StatModifierConfig } from '../src/stdlib/components/StatModifierComponent.js';
import { ModifierType } from '../src/core/attributes/AttributeModifier.js';

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
 */
export class Character extends Actor {
  readonly type = 'Character';

  /** 类型安全的属性集 */
  readonly attributes: AttributeSet<CharacterAttributesConfig>;

  /** 技能/Buff 列表 */
  readonly abilities: Ability[] = [];

  constructor(name: string, team?: string) {
    super();
    this.displayName = name;
    this.team = team;

    // 创建属性集
    this.attributes = defineAttributes(CharacterAttributes);

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
    for (const ability of this.abilities) {
      if (!ability.hasTag('permanent')) {
        ability.expire();
      }
    }
  }

  tick(dt: number): void {
    super.tick(dt);
    // Tick 所有 Ability
    for (const ability of this.abilities) {
      ability.tick(dt);
    }
    // 移除过期的 Ability
    this.abilities.filter((a) => !a.isExpired);
  }

  // ========== 技能/Buff 管理 ==========

  /**
   * 创建 Component 生命周期上下文
   */
  private createLifecycleContext(ability: Ability): ComponentLifecycleContext {
    return {
      owner: this.toRef(),
      attributes: this.attributes._modifierTarget,
      ability,
    };
  }

  /**
   * 添加 Ability（技能/Buff）
   */
  addAbility(ability: Ability): void {
    this.abilities.push(ability);
    const context = this.createLifecycleContext(ability);
    ability.activate(context);
  }

  /**
   * 移除 Ability
   */
  removeAbility(abilityId: string): boolean {
    const index = this.abilities.findIndex((a) => a.id === abilityId);
    if (index === -1) return false;

    const ability = this.abilities[index];
    ability.expire();
    this.abilities.splice(index, 1);
    return true;
  }
}

// ============================================================
// 第三步：创建 Buff 示例
// ============================================================

/**
 * 创建攻击力 Buff
 *
 * 展示如何使用 Ability + StatModifierComponent 创建属性修改效果
 */
export function createAtkBuff(
  owner: Character,
  source: Character,
  value: number
): Ability {
  const config: AbilityConfig = {
    configId: 'buff_atk',
    displayName: '力量增强',
    tags: ['buff'],
  };

  const ability = new Ability(config, owner.toRef(), source.toRef());

  // 使用 xxxAttribute 获取类型安全的属性名引用
  ability.addComponent(
    new StatModifierComponent([
      {
        attributeName: owner.attributes.atkAttribute, // → 'atk'
        modifierType: ModifierType.AddBase,
        value,
      },
    ])
  );

  return ability;
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

  // 添加攻击力 Buff
  console.log('\n--- 添加 +20 攻击力 Buff ---');
  const buff = createAtkBuff(hero, hero, 20);
  hero.addAbility(buff);
  console.log(`ATK: ${hero.atk}`); // 70

  // 查看属性分解
  console.log('\n--- 属性分解 ---');
  hero.showAtkBreakdown();

  // 造成伤害
  console.log('\n--- 受到 30 点伤害 ---');
  hero.takeDamage(30);
  console.log(`HP: ${hero.hp}/${hero.maxHp}`);

  // 移除 Buff
  console.log('\n--- 移除 Buff ---');
  hero.removeAbility(buff.id);
  console.log(`ATK: ${hero.atk}`); // 50
}

// 如果直接运行此文件
// runExample();
