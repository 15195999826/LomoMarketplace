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
import { SKILL_ABILITIES, MOVE_ABILITY } from '../skills/index.js';

/** ATB 满值 */
const ATB_FULL = 100;

export class CharacterActor extends Actor {
  readonly type = 'Character';
  readonly characterClass: CharacterClass;

  readonly attributeSet: AttributeSet<typeof CHARACTER_ATTRIBUTES>;
  readonly abilitySet: AbilitySet;

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

    // 创建能力集
    this.abilitySet = createAbilitySet(this.toRef(), this.attributeSet._modifierTarget);

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
}
