/**
 * 角色 Actor
 */

import {
  Actor,
  Ability,
  type AttributeSet,
  defineAttributes,
} from '@lomo/logic-game-framework';

import type { IRecordableActor, IAbilityInitData } from '@lomo/logic-game-framework/stdlib';

import { BattleAbilitySet, createBattleAbilitySet } from '../abilities/index.js';

import {
  type CharacterClass,
  type ClassStats,
  CLASS_CONFIGS,
  CHARACTER_ATTRIBUTES,
} from '../config/ClassConfig.js';
import { CLASS_SKILLS } from '../config/SkillConfig.js';
import { SKILL_ABILITIES, MOVE_ABILITY, PASSIVE_ABILITIES } from '../skills/index.js';

/** ATB 满值 */
const ATB_FULL = 100;

export class CharacterActor extends Actor implements IRecordableActor {
  readonly type = 'Character';
  readonly characterClass: CharacterClass;

  /** 配置 ID（用于回放） */
  get configId(): string {
    return this.characterClass;
  }

  readonly attributeSet: AttributeSet<typeof CHARACTER_ATTRIBUTES>;
  readonly abilitySet: BattleAbilitySet;

  /** 移动 Ability ID */
  private _moveAbilityId: string;

  /** 职业技能 Ability ID */
  private _skillAbilityId: string;

  private _teamID: number = -1;

  /** ATB 行动条（0-100） */
  private _atbGauge: number = 0;

  constructor(characterClass: CharacterClass) {
    super();

    this.characterClass = characterClass;
    const classConfig = CLASS_CONFIGS[characterClass];

    this._displayName = classConfig.name;
    this.attributeSet = defineAttributes(CHARACTER_ATTRIBUTES);

    // 应用职业属性
    const stats = classConfig.stats;
    this.attributeSet.setHpBase(stats.hp);
    this.attributeSet.setMaxHpBase(stats.maxHp);
    this.attributeSet.setAtkBase(stats.atk);
    this.attributeSet.setDefBase(stats.def);
    this.attributeSet.setSpeedBase(stats.speed);

    // 创建能力集（使用项目层的 BattleAbilitySet）
    this.abilitySet = createBattleAbilitySet(this.toRef(), this.attributeSet._modifierTarget);

    // 装备移动 Ability（所有角色都有）
    const moveAbility = new Ability(MOVE_ABILITY, this.toRef());
    this.abilitySet.grantAbility(moveAbility);
    this._moveAbilityId = moveAbility.id;

    // 装备职业对应的技能
    const skillType = CLASS_SKILLS[characterClass];
    const skillConfig = SKILL_ABILITIES[skillType];
    const skillAbility = new Ability(skillConfig, this.toRef());
    this.abilitySet.grantAbility(skillAbility);
    this._skillAbilityId = skillAbility.id;

    // 装备职业被动技能
    this.grantClassPassives(characterClass);
  }

  /**
   * 根据职业装备被动技能
   */
  private grantClassPassives(characterClass: CharacterClass): void {
    // 战士：荆棘反伤
    if (characterClass === 'Warrior') {
      const thornPassive = new Ability(PASSIVE_ABILITIES.Thorn, this.toRef());
      this.abilitySet.grantAbility(thornPassive);
    }
  }

  setTeamID(id: number) {
    this._teamID = id;
  }

  get teamID(): number {
    return this._teamID;
  }

  /** 获取移动 Ability */
  get moveAbility(): Ability {
    return this.abilitySet.findAbilityById(this._moveAbilityId)!;
  }

  /** 获取技能 Ability */
  get skillAbility(): Ability {
    return this.abilitySet.findAbilityById(this._skillAbilityId)!;
  }

  /** 获取当前属性值 */
  getStats(): ClassStats {
    return {
      hp: this.attributeSet.hp,
      maxHp: this.attributeSet.maxHp,
      atk: this.attributeSet.atk,
      def: this.attributeSet.def,
      speed: this.attributeSet.speed,
    };
  }

  // ========== ATB 系统 ==========

  /** 获取 ATB 值 */
  get atbGauge(): number {
    return this._atbGauge;
  }

  /** 累积 ATB（按速度） */
  accumulateATB(dt: number): void {
    const speed = this.attributeSet.speed;
    // 速度 100 时，1000ms 充满
    this._atbGauge += (speed / 1000) * dt;
  }

  /** 是否可以行动 */
  get canAct(): boolean {
    return this._atbGauge >= ATB_FULL;
  }

  /** 重置 ATB */
  resetATB(): void {
    this._atbGauge = 0;
  }

  // ========== IRecordableActor 实现 ==========

  /** 队伍（用于回放，覆盖基类） */
  override get team(): string {
    return String(this._teamID);
  }

  /** 获取属性快照 */
  getAttributeSnapshot(): Record<string, number> {
    return {
      hp: this.attributeSet.hp,
      maxHp: this.attributeSet.maxHp,
      atk: this.attributeSet.atk,
      def: this.attributeSet.def,
      speed: this.attributeSet.speed,
    };
  }

  /** 获取 Ability 快照 */
  getAbilitySnapshot(): IAbilityInitData[] {
    return this.abilitySet.getAbilities().map((ability) => ({
      instanceId: ability.id,
      configId: ability.configId,
    }));
  }

  /** 获取 Tag 快照 */
  getTagSnapshot(): Record<string, number> {
    const tags: Record<string, number> = {};
    for (const [tag, count] of this.abilitySet.getAllTags()) {
      tags[tag] = count;
    }
    return tags;
  }
}
