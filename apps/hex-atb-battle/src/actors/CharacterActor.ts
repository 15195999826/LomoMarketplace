/**
 * 角色 Actor
 */

import {
  Actor,
  Ability,
  type AttributeSet,
  type AbilitySet,
  createAbilitySet,
  defineAttributes,
} from '@lomo/logic-game-framework';

import {
  type CharacterClass,
  type ClassStats,
  CLASS_CONFIGS,
  CHARACTER_ATTRIBUTES,
} from '../config/ClassConfig.js';
import { CLASS_SKILLS } from '../config/SkillConfig.js';
import { SKILL_ABILITIES } from '../skills/index.js';

export class CharacterActor extends Actor {
  readonly type = 'Character';
  readonly characterClass: CharacterClass;

  readonly attributeSet: AttributeSet<typeof CHARACTER_ATTRIBUTES>;
  readonly abilitySet: AbilitySet;

  /** 职业技能 Ability */
  private _skillAbility?: Ability;

  private _teamID: number = -1;

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

    // 创建能力集
    this.abilitySet = createAbilitySet(this.toRef(), this.attributeSet._modifierTarget);

    // 装备职业对应的技能（使用 Ability 系统）
    const skillType = CLASS_SKILLS[characterClass];
    const skillConfig = SKILL_ABILITIES[skillType];
    this._skillAbility = new Ability(skillConfig, this.toRef());
    this.abilitySet.grantAbility(this._skillAbility);
  }

  setTeamID(id: number) {
    this._teamID = id;
  }

  get teamID(): number {
    return this._teamID;
  }

  /** 获取技能 Ability */
  get skillAbility(): Ability | undefined {
    return this._skillAbility;
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
}
