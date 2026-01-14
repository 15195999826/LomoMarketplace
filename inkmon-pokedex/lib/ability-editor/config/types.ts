import type { Element } from '@inkmon/core';

export type TargetSelectorType =
  | 'eventTarget'
  | 'self'
  | 'allEnemies'
  | 'allAllies';

export type DamageCategory = 'physical' | 'special' | 'pure';

export interface DamageActionJSON {
  type: 'Damage';
  target: TargetSelectorType;
  damage: number;
  element: Element;
  damageCategory?: DamageCategory;
  useTypeEffectiveness?: boolean;
  useSTAB?: boolean;
  useCritical?: boolean;
}

export interface HealActionJSON {
  type: 'Heal';
  target: TargetSelectorType;
  healAmount?: number;
  healPercent?: number;
}

export interface StageCueActionJSON {
  type: 'StageCue';
  cueId: string;
  params?: Record<string, unknown>;
}

export interface AddTagActionJSON {
  type: 'AddTag';
  target: TargetSelectorType;
  tag: string;
  stacks?: number;
  duration?: number;
}

export interface RemoveTagActionJSON {
  type: 'RemoveTag';
  target: TargetSelectorType;
  tag: string;
  stacks?: number;
}

export type ActionJSON =
  | DamageActionJSON
  | HealActionJSON
  | StageCueActionJSON
  | AddTagActionJSON
  | RemoveTagActionJSON;

export interface TimeDurationComponentJSON {
  type: 'TimeDurationComponent';
  duration: number;
}

export interface StackComponentJSON {
  type: 'StackComponent';
  initialStacks?: number;
  maxStacks?: number;
  overflowPolicy?: 'cap' | 'refresh' | 'reject';
}

export type ModifierTypeString = 'AddBase' | 'MulBase' | 'AddFinal' | 'MulFinal';

export interface StatModifierConfigJSON {
  attributeName: string;
  modifierType: ModifierTypeString;
  value: number;
}

export interface StatModifierComponentJSON {
  type: 'StatModifierComponent';
  modifiers: StatModifierConfigJSON[];
}

export interface TagComponentJSON {
  type: 'TagComponent';
  tags: Record<string, number>;
}

export type ComponentJSON =
  | TimeDurationComponentJSON
  | StackComponentJSON
  | StatModifierComponentJSON
  | TagComponentJSON;

export interface HasTagConditionJSON {
  type: 'HasTag';
  tag: string;
}

export interface NoTagConditionJSON {
  type: 'NoTag';
  tag: string;
}

export interface TagStacksConditionJSON {
  type: 'TagStacks';
  tag: string;
  minStacks: number;
}

export type ConditionJSON =
  | HasTagConditionJSON
  | NoTagConditionJSON
  | TagStacksConditionJSON;

export interface ConsumeTagCostJSON {
  type: 'ConsumeTag';
  tag: string;
  stacks?: number;
}

export interface AddTagCostJSON {
  type: 'AddTag';
  tag: string;
  stacks?: number;
  duration?: number;
}

export interface CooldownCostJSON {
  type: 'Cooldown';
  duration: number;
}

export type CostJSON = ConsumeTagCostJSON | AddTagCostJSON | CooldownCostJSON;

export interface ActiveUseComponentJSON {
  type: 'ActiveUse';
  timelineId: string;
  tagActions: Record<string, ActionJSON[]>;
  conditions?: ConditionJSON[];
  costs?: CostJSON[];
}

export interface AbilityConfigJSON {
  configId: string;
  displayName?: string;
  description?: string;
  icon?: string;
  tags?: string[];
  activeUseComponents?: ActiveUseComponentJSON[];
  components?: ComponentJSON[];
}
