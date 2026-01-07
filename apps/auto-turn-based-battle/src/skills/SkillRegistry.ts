/**
 * 技能注册表 - 存储所有技能定义
 *
 * 使用数据驱动方式定义所有技能，替代原来 UnitConfig.ts 中的硬编码配置。
 * 所有技能通过 SkillRegistry 统一管理和查询。
 *
 * ## 使用示例
 *
 * ```typescript
 * // 获取技能定义
 * const fireball = SkillRegistry.get('Fireball');
 *
 * // 检查技能是否存在
 * if (SkillRegistry.has('Fireball')) { ... }
 *
 * // 获取所有技能
 * const allSkills = SkillRegistry.getAll();
 * ```
 */

import {
  type SkillDefinition,
  type SkillEffect,
  createDamageEffect,
  createHealEffect,
  percentAtk,
  fixedValue,
} from "./SkillEffect.js";

// ========== 技能定义 ==========

/**
 * 普通攻击
 */
const NormalAttack: SkillDefinition = {
  id: "NormalAttack",
  name: "普通攻击",
  description: "基础攻击",
  actionPointCost: 1,
  staminaCost: 0,
  cooldown: 0,
  range: -1, // 使用角色攻击范围
  effects: [
    createDamageEffect("single", percentAtk(1.0), {
      damageType: "physical",
      canCrit: true,
    }),
  ],
};

/**
 * 重击（战士）
 */
const HeavyStrike: SkillDefinition = {
  id: "HeavyStrike",
  name: "重击",
  description: "蓄力重击，造成 150% 攻击力的物理伤害",
  actionPointCost: 2,
  staminaCost: 0,
  cooldown: 2,
  range: 1,
  effects: [
    createDamageEffect("single", percentAtk(1.5), {
      damageType: "physical",
      canCrit: true,
      description: "造成 150% 攻击力的物理伤害",
    }),
  ],
  tags: ["melee", "physical"],
};

/**
 * 精准射击（弓箭手）
 */
const PrecisionShot: SkillDefinition = {
  id: "PrecisionShot",
  name: "精准射击",
  description: "瞄准射击，必定暴击，造成 120% 攻击力的物理伤害",
  actionPointCost: 2,
  staminaCost: 0,
  cooldown: 3,
  range: 5,
  effects: [
    createDamageEffect("single", percentAtk(1.2), {
      damageType: "physical",
      canCrit: true,
      bonusCritRate: 1.0, // 100% 额外暴击率 = 必定暴击
      description: "必定暴击",
    }),
  ],
  tags: ["ranged", "physical", "guaranteed_crit"],
};

/**
 * 火球术（法师）
 */
const Fireball: SkillDefinition = {
  id: "Fireball",
  name: "火球术",
  description: "发射火球，对目标及周围敌人造成 130% 攻击力的魔法伤害",
  actionPointCost: 2,
  staminaCost: 0,
  cooldown: 2,
  range: 4,
  effects: [
    createDamageEffect("aoe", percentAtk(1.3), {
      damageType: "magical",
      canCrit: true,
      aoeRadius: 1,
      description: "范围魔法伤害",
    }),
  ],
  tags: ["ranged", "magical", "aoe"],
};

/**
 * 治疗术（牧师）
 */
const Heal: SkillDefinition = {
  id: "Heal",
  name: "治疗术",
  description: "恢复目标 80% 攻击力的生命值",
  actionPointCost: 1,
  staminaCost: 0,
  cooldown: 1,
  range: 3,
  effects: [
    createHealEffect("single", percentAtk(0.8), {
      description: "恢复生命值",
    }),
  ],
  tags: ["ranged", "heal", "support"],
};

/**
 * 背刺（刺客）
 */
const Backstab: SkillDefinition = {
  id: "Backstab",
  name: "背刺",
  description: "偷袭敌人，造成 200% 攻击力的物理伤害，暴击伤害额外提高 50%",
  actionPointCost: 2,
  staminaCost: 1,
  cooldown: 3,
  range: 1,
  effects: [
    createDamageEffect("single", percentAtk(2.0), {
      damageType: "physical",
      canCrit: true,
      bonusCritDamage: 0.5, // 额外 50% 暴击伤害
      description: "高伤害偷袭",
    }),
  ],
  tags: ["melee", "physical", "assassin"],
};

/**
 * 冲锋（骑士）
 */
const Charge: SkillDefinition = {
  id: "Charge",
  name: "冲锋",
  description: "冲向目标并攻击，造成 140% 攻击力的物理伤害，移动不消耗精力",
  actionPointCost: 2,
  staminaCost: 0, // 冲锋不消耗精力
  cooldown: 2,
  range: 4,
  effects: [
    // 冲锋技能特殊：先移动到目标附近，再造成伤害
    // 移动效果由执行器特殊处理
    createDamageEffect("single", percentAtk(1.4), {
      damageType: "physical",
      canCrit: true,
      description: "冲锋攻击",
    }),
  ],
  tags: ["melee", "physical", "charge", "mobility"],
};

/**
 * 移动
 */
const Move: SkillDefinition = {
  id: "Move",
  name: "移动",
  description: "移动到目标位置",
  actionPointCost: 1,
  staminaCost: 1, // 每格消耗 1 精力
  cooldown: 0,
  range: -1, // 使用角色移动范围
  effects: [], // 移动效果由执行器特殊处理
  tags: ["movement"],
};

/**
 * 待机
 */
const Idle: SkillDefinition = {
  id: "Idle",
  name: "待机",
  description: "结束本回合行动",
  actionPointCost: 0,
  staminaCost: 0,
  cooldown: 0,
  range: 0,
  effects: [], // 无效果，直接结束回合
  tags: ["utility"],
};

// ========== 技能注册表 ==========

/**
 * 所有技能的映射表
 */
const SKILL_MAP: Map<string, SkillDefinition> = new Map([
  ["NormalAttack", NormalAttack],
  ["HeavyStrike", HeavyStrike],
  ["PrecisionShot", PrecisionShot],
  ["Fireball", Fireball],
  ["Heal", Heal],
  ["Backstab", Backstab],
  ["Charge", Charge],
  ["Move", Move],
  ["Idle", Idle],
]);

/**
 * 技能注册表
 *
 * 提供技能查询和管理功能
 */
export const SkillRegistry = {
  /**
   * 获取技能定义
   *
   * @param id 技能 ID
   * @returns 技能定义，如果不存在则返回 undefined
   */
  get(id: string): SkillDefinition | undefined {
    return SKILL_MAP.get(id);
  },

  /**
   * 获取技能定义（必须存在）
   *
   * @param id 技能 ID
   * @returns 技能定义
   * @throws 如果技能不存在则抛出错误
   */
  getRequired(id: string): SkillDefinition {
    const skill = SKILL_MAP.get(id);
    if (!skill) {
      throw new Error(`Skill not found: ${id}`);
    }
    return skill;
  },

  /**
   * 检查技能是否存在
   *
   * @param id 技能 ID
   * @returns 是否存在
   */
  has(id: string): boolean {
    return SKILL_MAP.has(id);
  },

  /**
   * 获取所有技能定义
   *
   * @returns 所有技能定义的数组
   */
  getAll(): SkillDefinition[] {
    return Array.from(SKILL_MAP.values());
  },

  /**
   * 获取所有技能 ID
   *
   * @returns 所有技能 ID 的数组
   */
  getAllIds(): string[] {
    return Array.from(SKILL_MAP.keys());
  },

  /**
   * 按标签查找技能
   *
   * @param tag 标签
   * @returns 包含该标签的所有技能
   */
  findByTag(tag: string): SkillDefinition[] {
    return Array.from(SKILL_MAP.values()).filter(
      (skill) => skill.tags?.includes(tag) ?? false,
    );
  },

  /**
   * 注册新技能
   *
   * @param skill 技能定义
   */
  register(skill: SkillDefinition): void {
    if (SKILL_MAP.has(skill.id)) {
      console.warn(`Skill ${skill.id} already exists, overwriting...`);
    }
    SKILL_MAP.set(skill.id, skill);
  },

  /**
   * 批量注册技能
   *
   * @param skills 技能定义数组
   */
  registerAll(skills: SkillDefinition[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  },

  /**
   * 获取技能数量
   */
  get count(): number {
    return SKILL_MAP.size;
  },
};

// ========== 导出预定义技能 ==========

export {
  NormalAttack,
  HeavyStrike,
  PrecisionShot,
  Fireball,
  Heal,
  Backstab,
  Charge,
  Move,
  Idle,
};

// ========== 类型导出 ==========

export type { SkillDefinition };
