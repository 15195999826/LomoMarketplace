/**
 * 标准属性定义
 *
 * 提供常用的属性名常量
 * 游戏可以使用这些标准属性，也可以定义自己的属性
 */

/**
 * 标准属性名
 */
export const StandardAttributes = {
  // 基础属性
  HP: 'hp',
  MAX_HP: 'maxHp',
  MP: 'mp',
  MAX_MP: 'maxMp',

  // 战斗属性
  ATK: 'atk',
  DEF: 'def',
  SP_ATK: 'spAtk',
  SP_DEF: 'spDef',
  SPEED: 'speed',

  // 暴击相关
  CRIT_RATE: 'critRate',
  CRIT_DAMAGE: 'critDamage',

  // 命中闪避
  HIT_RATE: 'hitRate',
  DODGE_RATE: 'dodgeRate',

  // 抗性
  PHYSICAL_RES: 'physicalRes',
  MAGICAL_RES: 'magicalRes',

  // 回复
  HP_REGEN: 'hpRegen',
  MP_REGEN: 'mpRegen',

  // 特殊
  LIFESTEAL: 'lifesteal',
  DAMAGE_REDUCTION: 'damageReduction',
} as const;

export type StandardAttribute = (typeof StandardAttributes)[keyof typeof StandardAttributes];

/**
 * 标准属性配置模板
 * 用于快速创建 AttributeSet
 */
export interface StandardAttributeTemplate {
  /** 属性名 */
  name: string;
  /** 默认基础值 */
  defaultBase: number;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
}

/**
 * 基础战斗单位属性模板
 */
export const BasicUnitAttributeTemplates: StandardAttributeTemplate[] = [
  { name: StandardAttributes.HP, defaultBase: 100, min: 0 },
  { name: StandardAttributes.MAX_HP, defaultBase: 100, min: 1 },
  { name: StandardAttributes.ATK, defaultBase: 10, min: 0 },
  { name: StandardAttributes.DEF, defaultBase: 5, min: 0 },
  { name: StandardAttributes.SPEED, defaultBase: 100, min: 0 },
];

/**
 * 完整战斗单位属性模板
 */
export const FullUnitAttributeTemplates: StandardAttributeTemplate[] = [
  ...BasicUnitAttributeTemplates,
  { name: StandardAttributes.MP, defaultBase: 50, min: 0 },
  { name: StandardAttributes.MAX_MP, defaultBase: 50, min: 0 },
  { name: StandardAttributes.SP_ATK, defaultBase: 10, min: 0 },
  { name: StandardAttributes.SP_DEF, defaultBase: 5, min: 0 },
  { name: StandardAttributes.CRIT_RATE, defaultBase: 0.05, min: 0, max: 1 },
  { name: StandardAttributes.CRIT_DAMAGE, defaultBase: 1.5, min: 1 },
  { name: StandardAttributes.HIT_RATE, defaultBase: 1, min: 0, max: 2 },
  { name: StandardAttributes.DODGE_RATE, defaultBase: 0, min: 0, max: 1 },
];
