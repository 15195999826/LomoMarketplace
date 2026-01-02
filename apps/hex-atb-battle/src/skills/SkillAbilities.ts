/**
 * 技能 Ability 定义
 *
 * 使用框架 Ability 系统实现的技能配置。
 */

import {
  type AbilityConfig,
  ActivateInstanceComponent,
  DamageAction,
  HealAction,
} from '@lomo/logic-game-framework';

import type { SkillType } from '../config/SkillConfig.js';

/**
 * 技能使用事件类型
 */
export const SKILL_USE_EVENT = 'useSkill';

/**
 * 横扫斩 - 近战物理攻击
 */
export const SLASH_ABILITY: AbilityConfig = {
  configId: 'skill_slash',
  displayName: '横扫斩',
  description: '近战攻击，对敌人造成物理伤害',
  tags: ['skill', 'active', 'melee'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{ eventKind: SKILL_USE_EVENT }],
      timelineId: 'skill_slash',
      tagActions: {
        hit: [new DamageAction().setDamage(50).setPhysical()],
      },
    }),
  ],
};

/**
 * 精准射击 - 远程物理攻击
 */
export const PRECISE_SHOT_ABILITY: AbilityConfig = {
  configId: 'skill_precise_shot',
  displayName: '精准射击',
  description: '远程攻击，精准命中敌人',
  tags: ['skill', 'active', 'ranged'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{ eventKind: SKILL_USE_EVENT }],
      timelineId: 'skill_precise_shot',
      tagActions: {
        hit: [new DamageAction().setDamage(45).setPhysical()],
      },
    }),
  ],
};

/**
 * 火球术 - 远程魔法攻击
 */
export const FIREBALL_ABILITY: AbilityConfig = {
  configId: 'skill_fireball',
  displayName: '火球术',
  description: '远程魔法攻击，造成高额伤害',
  tags: ['skill', 'active', 'ranged', 'magic'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{ eventKind: SKILL_USE_EVENT }],
      timelineId: 'skill_fireball',
      tagActions: {
        hit: [new DamageAction().setDamage(80).setMagical()],
      },
    }),
  ],
};

/**
 * 毁灭重击 - 近战重击
 */
export const CRUSHING_BLOW_ABILITY: AbilityConfig = {
  configId: 'skill_crushing_blow',
  displayName: '毁灭重击',
  description: '近战重击，造成毁灭性伤害',
  tags: ['skill', 'active', 'melee'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{ eventKind: SKILL_USE_EVENT }],
      timelineId: 'skill_crushing_blow',
      tagActions: {
        hit: [new DamageAction().setDamage(90).setPhysical()],
      },
    }),
  ],
};

/**
 * 疾风连刺 - 快速多段攻击
 */
export const SWIFT_STRIKE_ABILITY: AbilityConfig = {
  configId: 'skill_swift_strike',
  displayName: '疾风连刺',
  description: '快速近战攻击，三连击',
  tags: ['skill', 'active', 'melee'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{ eventKind: SKILL_USE_EVENT }],
      timelineId: 'skill_swift_strike',
      tagActions: {
        hit1: [new DamageAction().setDamage(10).setPhysical()],
        hit2: [new DamageAction().setDamage(10).setPhysical()],
        hit3: [new DamageAction().setDamage(10).setPhysical()],
      },
    }),
  ],
};

/**
 * 圣光治愈 - 治疗技能
 */
export const HOLY_HEAL_ABILITY: AbilityConfig = {
  configId: 'skill_holy_heal',
  displayName: '圣光治愈',
  description: '治疗友方单位，恢复生命值',
  tags: ['skill', 'active', 'heal'],
  components: [
    new ActivateInstanceComponent({
      triggers: [{ eventKind: SKILL_USE_EVENT }],
      timelineId: 'skill_holy_heal',
      tagActions: {
        heal: [new HealAction().setHealAmount(40)],
      },
    }),
  ],
};

/**
 * 技能 Ability 映射
 */
export const SKILL_ABILITIES: Record<SkillType, AbilityConfig> = {
  Slash: SLASH_ABILITY,
  PreciseShot: PRECISE_SHOT_ABILITY,
  Fireball: FIREBALL_ABILITY,
  CrushingBlow: CRUSHING_BLOW_ABILITY,
  SwiftStrike: SWIFT_STRIKE_ABILITY,
  HolyHeal: HOLY_HEAL_ABILITY,
};
