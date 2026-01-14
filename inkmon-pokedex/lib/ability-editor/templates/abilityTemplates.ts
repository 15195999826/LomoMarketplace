import type { AbilityConfigJSON } from '../config/types';

/**
 * 预设模板集合
 */
export const abilityTemplates: Record<string, AbilityConfigJSON> = {
  basicAttack: {
    configId: 'skill_basic_attack',
    displayName: '普通攻击',
    description: '对单个目标造成物理伤害',
    tags: ['attack', 'physical', 'single_target'],
    activeUseComponents: [
      {
        type: 'ActiveUse',
        timelineId: 'timeline_basic_attack',
        tagActions: {
          impact: [
            {
              type: 'Damage',
              target: 'eventTarget',
              damage: 50,
              element: 'fire',
              damageCategory: 'physical',
            },
            {
              type: 'StageCue',
              cueId: 'melee_slash',
            },
          ],
        },
      },
    ],
  },

  aoeDamage: {
    configId: 'skill_aoe_damage',
    displayName: 'AOE 伤害',
    description: '对所有敌人造成魔法伤害',
    tags: ['magic', 'aoe'],
    activeUseComponents: [
      {
        type: 'ActiveUse',
        timelineId: 'timeline_aoe',
        tagActions: {
          cast: [
            {
              type: 'StageCue',
              cueId: 'cast_magic',
            },
          ],
          impact: [
            {
              type: 'Damage',
              target: 'allEnemies',
              damage: 40,
              element: 'water',
              damageCategory: 'special',
            },
            {
              type: 'StageCue',
              cueId: 'explosion',
            },
          ],
        },
      },
    ],
  },

  healSelf: {
    configId: 'skill_heal_self',
    displayName: '自我治疗',
    description: '恢复自身生命值',
    tags: ['heal', 'self'],
    activeUseComponents: [
      {
        type: 'ActiveUse',
        timelineId: 'timeline_instant',
        tagActions: {
          apply: [
            {
              type: 'Heal',
              target: 'self',
              healPercent: 0.2,
            },
            {
              type: 'StageCue',
              cueId: 'heal_sparkle',
            },
          ],
        },
      },
    ],
  },

  attackBuff: {
    configId: 'buff_attack_up',
    displayName: '攻击力提升',
    description: '提升攻击力 50%，持续 10 秒',
    tags: ['buff', 'attack'],
    components: [
      {
        type: 'TimeDurationComponent',
        duration: 10000,
      },
      {
        type: 'StatModifierComponent',
        modifiers: [
          {
            attributeName: 'attack',
            modifierType: 'MulBase',
            value: 0.5,
          },
        ],
      },
    ],
  },

  burnDebuff: {
    configId: 'debuff_burn',
    displayName: '燃烧',
    description: '持续受到火焰伤害',
    tags: ['debuff', 'dot', 'fire'],
    components: [
      {
        type: 'TimeDurationComponent',
        duration: 3000,
      },
      {
        type: 'TagComponent',
        tags: { burning: 1 },
      },
    ],
    activeUseComponents: [
      {
        type: 'ActiveUse',
        timelineId: 'timeline_dot',
        tagActions: {
          tick_1: [
            {
              type: 'Damage',
              target: 'self',
              damage: 20,
              element: 'fire',
              damageCategory: 'pure',
            },
          ],
          tick_2: [
            {
              type: 'Damage',
              target: 'self',
              damage: 20,
              element: 'fire',
              damageCategory: 'pure',
            },
          ],
          tick_3: [
            {
              type: 'Damage',
              target: 'self',
              damage: 20,
              element: 'fire',
              damageCategory: 'pure',
            },
          ],
        },
      },
    ],
  },
};

export type TemplateKey = keyof typeof abilityTemplates;

/**
 * 获取模板的 JSON 字符串
 */
export function getTemplateJSON(key: TemplateKey): string {
  return JSON.stringify(abilityTemplates[key], null, 2);
}

/**
 * 模板元信息（用于 UI 展示）
 */
export const templateMeta: Record<TemplateKey, { name: string; description: string; icon: string }> = {
  basicAttack: {
    name: '普通攻击',
    description: '单体物理伤害',
    icon: '⚔️',
  },
  aoeDamage: {
    name: 'AOE 伤害',
    description: '范围魔法伤害',
    icon: '💥',
  },
  healSelf: {
    name: '自我治疗',
    description: '恢复生命值',
    icon: '💚',
  },
  attackBuff: {
    name: '攻击力 Buff',
    description: '持续时间型属性增益',
    icon: '⬆️',
  },
  burnDebuff: {
    name: '燃烧 DoT',
    description: '持续伤害效果',
    icon: '🔥',
  },
};
