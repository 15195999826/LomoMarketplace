/**
 * 战斗单位 Actor - 回合制战斗角色
 *
 * 参考 CharacterActor 设计，适配回合制战斗系统：
 * - 行动点系统（每回合可执行多次行动）
 * - 精力系统（移动消耗精力）
 * - 技能冷却管理
 */

import {
  Actor,
  Ability,
  type AttributeSet,
  defineAttributes,
  type AbilitySet,
  createAbilitySet,
} from '@lomo/logic-game-framework';

import {
  type UnitClass,
  type UnitStats,
  type SkillType,
  UNIT_ATTRIBUTES,
  UNIT_CLASS_CONFIGS,
  SKILL_CONFIGS,
  getClassDefaultStats,
} from '../config/UnitConfig.js';

/**
 * 位置坐标（简单的格子坐标）
 */
export interface GridPosition {
  x: number;
  y: number;
}

/**
 * 战斗单位
 */
export class BattleUnit extends Actor {
  readonly type = 'BattleUnit';

  /** 单位职业 */
  readonly unitClass: UnitClass;

  /** 属性集 */
  readonly attributeSet: AttributeSet<typeof UNIT_ATTRIBUTES>;

  /** 能力集 */
  readonly abilitySet: AbilitySet;

  /** 队伍 ID（0 = 玩家，1 = 敌方） */
  private _teamId: number = 0;

  /** 格子位置 */
  private _gridPosition: GridPosition = { x: 0, y: 0 };

  /** 技能冷却表：skillType -> 剩余冷却回合数 */
  private _skillCooldowns: Map<SkillType, number> = new Map();

  /** 移动技能 Ability ID */
  private _moveAbilityId: string = '';

  /** 待机技能 Ability ID */
  private _idleAbilityId: string = '';

  /** 职业技能 Ability ID */
  private _classSkillAbilityId: string = '';

  constructor(unitClass: UnitClass, name?: string) {
    super();

    this.unitClass = unitClass;
    const classConfig = UNIT_CLASS_CONFIGS[unitClass];

    // 设置显示名称
    this._displayName = name ?? classConfig.name;

    // 创建属性集
    this.attributeSet = defineAttributes(UNIT_ATTRIBUTES);

    // 应用职业属性
    const stats = getClassDefaultStats(unitClass);
    this.applyStats(stats);

    // 创建能力集
    this.abilitySet = createAbilitySet(this.toRef(), this.attributeSet._modifierTarget);

    // 初始化技能（目前简化为标记，实际技能逻辑在 Battle 中处理）
    this.initializeSkills();
  }

  /**
   * 应用属性值
   */
  private applyStats(stats: UnitStats): void {
    this.attributeSet.setHpBase(stats.hp);
    this.attributeSet.setMaxHpBase(stats.maxHp);
    this.attributeSet.setAtkBase(stats.atk);
    this.attributeSet.setDefBase(stats.def);
    this.attributeSet.setSpeedBase(stats.speed);
    this.attributeSet.setActionPointBase(stats.actionPoint);
    this.attributeSet.setMaxActionPointBase(stats.maxActionPoint);
    this.attributeSet.setStaminaBase(stats.stamina);
    this.attributeSet.setMaxStaminaBase(stats.maxStamina);
    this.attributeSet.setStaminaCostBase(stats.staminaCost);
    this.attributeSet.setCritRateBase(stats.critRate);
    this.attributeSet.setCritDamageBase(stats.critDamage);
    this.attributeSet.setMoveRangeBase(stats.moveRange);
    this.attributeSet.setAttackRangeBase(stats.attackRange);
  }

  /**
   * 初始化技能
   */
  private initializeSkills(): void {
    // 移动技能（所有单位都有）
    // 这里简化实现，实际技能效果在 Battle 层处理
    this._moveAbilityId = 'move';

    // 待机技能
    this._idleAbilityId = 'idle';

    // 职业技能
    const classConfig = UNIT_CLASS_CONFIGS[this.unitClass];
    this._classSkillAbilityId = classConfig.defaultSkill;
  }

  // ========== 队伍管理 ==========

  get teamId(): number {
    return this._teamId;
  }

  setTeamId(id: number): void {
    this._teamId = id;
    this._team = String(id);
  }

  /**
   * 判断是否是敌人
   */
  isEnemyOf(other: BattleUnit): boolean {
    return this._teamId !== other._teamId;
  }

  /**
   * 判断是否是队友
   */
  isAllyOf(other: BattleUnit): boolean {
    return this._teamId === other._teamId;
  }

  // ========== 位置管理 ==========

  get gridPosition(): GridPosition {
    return { ...this._gridPosition };
  }

  setGridPosition(pos: GridPosition): void {
    this._gridPosition = { ...pos };
  }

  /**
   * 计算与另一个单位的曼哈顿距离
   */
  distanceTo(other: BattleUnit): number {
    return (
      Math.abs(this._gridPosition.x - other._gridPosition.x) +
      Math.abs(this._gridPosition.y - other._gridPosition.y)
    );
  }

  /**
   * 计算到指定位置的曼哈顿距离
   */
  distanceToPosition(pos: GridPosition): number {
    return (
      Math.abs(this._gridPosition.x - pos.x) +
      Math.abs(this._gridPosition.y - pos.y)
    );
  }

  // ========== 属性访问 ==========

  /** 获取当前属性快照 */
  getStats(): UnitStats {
    return {
      hp: this.attributeSet.hp,
      maxHp: this.attributeSet.maxHp,
      atk: this.attributeSet.atk,
      def: this.attributeSet.def,
      speed: this.attributeSet.speed,
      actionPoint: this.attributeSet.actionPoint,
      maxActionPoint: this.attributeSet.maxActionPoint,
      stamina: this.attributeSet.stamina,
      maxStamina: this.attributeSet.maxStamina,
      staminaCost: this.attributeSet.staminaCost,
      critRate: this.attributeSet.critRate,
      critDamage: this.attributeSet.critDamage,
      moveRange: this.attributeSet.moveRange,
      attackRange: this.attributeSet.attackRange,
    };
  }

  /** 当前 HP */
  get hp(): number {
    return this.attributeSet.hp;
  }

  /** 最大 HP */
  get maxHp(): number {
    return this.attributeSet.maxHp;
  }

  /** 攻击力 */
  get atk(): number {
    return this.attributeSet.atk;
  }

  /** 防御力 */
  get def(): number {
    return this.attributeSet.def;
  }

  /** 速度 */
  get speed(): number {
    return this.attributeSet.speed;
  }

  /** 当前行动点 */
  get actionPoint(): number {
    return this.attributeSet.actionPoint;
  }

  /** 最大行动点 */
  get maxActionPoint(): number {
    return this.attributeSet.maxActionPoint;
  }

  /** 当前精力 */
  get stamina(): number {
    return this.attributeSet.stamina;
  }

  /** 最大精力 */
  get maxStamina(): number {
    return this.attributeSet.maxStamina;
  }

  /** 已消耗精力 */
  get staminaCost(): number {
    return this.attributeSet.staminaCost;
  }

  /** 剩余可用精力 */
  get availableStamina(): number {
    return this.attributeSet.stamina - this.attributeSet.staminaCost;
  }

  /** 暴击率 */
  get critRate(): number {
    return this.attributeSet.critRate;
  }

  /** 暴击伤害 */
  get critDamage(): number {
    return this.attributeSet.critDamage;
  }

  /** 移动范围 */
  get moveRange(): number {
    return this.attributeSet.moveRange;
  }

  /** 攻击范围 */
  get attackRange(): number {
    return this.attributeSet.attackRange;
  }

  // ========== 行动点管理 ==========

  /**
   * 消耗行动点
   * @returns 是否成功消耗
   */
  consumeActionPoint(cost: number): boolean {
    const current = this.attributeSet.actionPoint;
    if (current < cost) {
      return false;
    }
    this.attributeSet.setActionPointBase(current - cost);
    return true;
  }

  /**
   * 恢复行动点到最大值
   */
  restoreActionPoint(): void {
    this.attributeSet.setActionPointBase(this.attributeSet.maxActionPoint);
  }

  /**
   * 是否有足够的行动点
   */
  hasEnoughActionPoint(cost: number): boolean {
    return this.attributeSet.actionPoint >= cost;
  }

  /**
   * 是否可以继续行动（行动点 > 0）
   */
  canContinueAction(): boolean {
    return this.attributeSet.actionPoint > 0;
  }

  // ========== 精力管理 ==========

  /**
   * 消耗精力
   * @returns 是否成功消耗
   */
  consumeStamina(cost: number): boolean {
    const available = this.availableStamina;
    if (available < cost) {
      return false;
    }
    const newCost = this.attributeSet.staminaCost + cost;
    this.attributeSet.setStaminaCostBase(newCost);
    return true;
  }

  /**
   * 重置精力消耗
   */
  resetStaminaCost(): void {
    this.attributeSet.setStaminaCostBase(0);
  }

  /**
   * 是否有足够的精力
   */
  hasEnoughStamina(cost: number): boolean {
    return this.availableStamina >= cost;
  }

  // ========== 技能冷却管理 ==========

  /**
   * 获取技能剩余冷却
   */
  getSkillCooldown(skill: SkillType): number {
    return this._skillCooldowns.get(skill) ?? 0;
  }

  /**
   * 设置技能冷却
   */
  setSkillCooldown(skill: SkillType, cooldown: number): void {
    if (cooldown <= 0) {
      this._skillCooldowns.delete(skill);
    } else {
      this._skillCooldowns.set(skill, cooldown);
    }
  }

  /**
   * 技能是否就绪（冷却完成）
   */
  isSkillReady(skill: SkillType): boolean {
    return this.getSkillCooldown(skill) <= 0;
  }

  /**
   * 推进所有技能冷却（每回合结束调用）
   */
  tickCooldowns(): void {
    for (const [skill, cd] of this._skillCooldowns) {
      if (cd > 0) {
        this._skillCooldowns.set(skill, cd - 1);
      }
      if (this._skillCooldowns.get(skill) === 0) {
        this._skillCooldowns.delete(skill);
      }
    }
  }

  /**
   * 触发技能冷却
   */
  triggerCooldown(skill: SkillType): void {
    const config = SKILL_CONFIGS[skill];
    if (config.cooldown > 0) {
      this._skillCooldowns.set(skill, config.cooldown);
    }
  }

  // ========== 生命管理 ==========

  /**
   * 受到伤害
   * @returns 实际伤害值
   */
  takeDamage(damage: number): number {
    const currentHp = this.attributeSet.hp;
    const actualDamage = Math.min(currentHp, Math.max(0, damage));
    this.attributeSet.setHpBase(currentHp - actualDamage);

    // 检查死亡
    if (this.attributeSet.hp <= 0) {
      this.onDeath();
    }

    return actualDamage;
  }

  /**
   * 恢复生命
   * @returns 实际恢复量
   */
  heal(amount: number): number {
    const currentHp = this.attributeSet.hp;
    const maxHp = this.attributeSet.maxHp;
    const actualHeal = Math.min(maxHp - currentHp, Math.max(0, amount));
    this.attributeSet.setHpBase(currentHp + actualHeal);
    return actualHeal;
  }

  /**
   * HP 百分比
   */
  get hpPercent(): number {
    return this.attributeSet.hp / this.attributeSet.maxHp;
  }

  // ========== 技能 ID 访问 ==========

  get moveAbilityId(): string {
    return this._moveAbilityId;
  }

  get idleAbilityId(): string {
    return this._idleAbilityId;
  }

  get classSkillAbilityId(): string {
    return this._classSkillAbilityId;
  }

  /** 获取职业默认技能类型 */
  get defaultSkill(): SkillType {
    return UNIT_CLASS_CONFIGS[this.unitClass].defaultSkill;
  }

  /** 获取攻击类型 */
  get attackType(): 'melee' | 'ranged' {
    return UNIT_CLASS_CONFIGS[this.unitClass].attackType;
  }

  // ========== 回合开始/结束 ==========

  /**
   * 回合开始时调用
   */
  onRoundStart(): void {
    // 恢复行动点
    this.restoreActionPoint();
    // 重置精力消耗
    this.resetStaminaCost();
  }

  /**
   * 获得行动权时调用
   */
  onGetTurn(): void {
    // 可在此处触发"获得回合"相关效果
  }

  /**
   * 结束行动时调用
   */
  onEndTurn(): void {
    // 推进冷却
    this.tickCooldowns();
  }

  // ========== 序列化 ==========

  override serializeBase(): object {
    return {
      ...super.serializeBase(),
      unitClass: this.unitClass,
      teamId: this._teamId,
      gridPosition: this._gridPosition,
      stats: this.getStats(),
      cooldowns: Object.fromEntries(this._skillCooldowns),
    };
  }
}
