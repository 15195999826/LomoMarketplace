/**
 * Skills 模块导出
 *
 * 数据驱动的技能系统，提供：
 * - 技能效果定义
 * - 技能注册表
 * - 技能执行器
 */

// 技能效果系统
export {
  // 类型
  type EffectType,
  type TargetType,
  type DamageType,
  type ValueSource,
  type SkillEffect,
  type DamageEffect,
  type HealEffect,
  type BuffEffect,
  type DispelEffect,
  type TeleportEffect,
  type SkillDefinition,
  type EffectResult,
  type SkillExecutionResult,
  // 计算函数
  calculateValue,
  // 工厂函数
  createDamageEffect,
  createHealEffect,
  createBuffEffect,
  percentAtk,
  fixedValue,
  percentMaxHp,
} from "./SkillEffect.js";

// 技能注册表
export {
  SkillRegistry,
  // 预定义技能
  NormalAttack,
  HeavyStrike,
  PrecisionShot,
  Fireball,
  Heal,
  Backstab,
  Charge,
  Move,
  Idle,
} from "./SkillRegistry.js";

// 技能执行器
export {
  SkillExecutor,
  createSkillExecutor,
  type ITargetResolver,
} from "./SkillExecutor.js";
