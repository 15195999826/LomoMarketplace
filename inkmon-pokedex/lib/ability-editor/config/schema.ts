import { z } from 'zod';
import { VALID_ELEMENTS } from '@inkmon/core';

export const TargetSelectorSchema = z.enum([
  'eventTarget',
  'self',
  'allEnemies',
  'allAllies',
]);

export const ElementSchema = z.enum([...VALID_ELEMENTS] as [string, ...string[]]);

export const DamageCategorySchema = z.enum(['physical', 'special', 'pure']);

const DamageActionSchema = z.object({
  type: z.literal('Damage'),
  target: TargetSelectorSchema,
  damage: z.number().positive(),
  element: ElementSchema,
  damageCategory: DamageCategorySchema.optional(),
  useTypeEffectiveness: z.boolean().optional(),
  useSTAB: z.boolean().optional(),
  useCritical: z.boolean().optional(),
});

const HealActionSchema = z.object({
  type: z.literal('Heal'),
  target: TargetSelectorSchema,
  healAmount: z.number().positive().optional(),
  healPercent: z.number().min(0).max(1).optional(),
});

const StageCueActionSchema = z.object({
  type: z.literal('StageCue'),
  cueId: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

const AddTagActionSchema = z.object({
  type: z.literal('AddTag'),
  target: TargetSelectorSchema,
  tag: z.string().min(1),
  stacks: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
});

const RemoveTagActionSchema = z.object({
  type: z.literal('RemoveTag'),
  target: TargetSelectorSchema,
  tag: z.string().min(1),
  stacks: z.number().int().positive().optional(),
});

export const ActionSchema = z.discriminatedUnion('type', [
  DamageActionSchema,
  HealActionSchema,
  StageCueActionSchema,
  AddTagActionSchema,
  RemoveTagActionSchema,
]);

const TimeDurationComponentSchema = z.object({
  type: z.literal('TimeDurationComponent'),
  duration: z.number().positive(),
});

const StackComponentSchema = z.object({
  type: z.literal('StackComponent'),
  initialStacks: z.number().int().min(0).optional(),
  maxStacks: z.number().int().positive().optional(),
  overflowPolicy: z.enum(['cap', 'refresh', 'reject']).optional(),
});

const StatModifierConfigSchema = z.object({
  attributeName: z.string().min(1),
  modifierType: z.enum(['AddBase', 'MulBase', 'AddFinal', 'MulFinal']),
  value: z.number(),
});

const StatModifierComponentSchema = z.object({
  type: z.literal('StatModifierComponent'),
  modifiers: z.array(StatModifierConfigSchema).min(1),
});

const TagComponentSchema = z.object({
  type: z.literal('TagComponent'),
  tags: z.record(z.number().int().min(0)),
});

export const ComponentSchema = z.discriminatedUnion('type', [
  TimeDurationComponentSchema,
  StackComponentSchema,
  StatModifierComponentSchema,
  TagComponentSchema,
]);

const HasTagConditionSchema = z.object({
  type: z.literal('HasTag'),
  tag: z.string().min(1),
});

const NoTagConditionSchema = z.object({
  type: z.literal('NoTag'),
  tag: z.string().min(1),
});

const TagStacksConditionSchema = z.object({
  type: z.literal('TagStacks'),
  tag: z.string().min(1),
  minStacks: z.number().int().positive(),
});

export const ConditionSchema = z.discriminatedUnion('type', [
  HasTagConditionSchema,
  NoTagConditionSchema,
  TagStacksConditionSchema,
]);

const ConsumeTagCostSchema = z.object({
  type: z.literal('ConsumeTag'),
  tag: z.string().min(1),
  stacks: z.number().int().positive().optional(),
});

const AddTagCostSchema = z.object({
  type: z.literal('AddTag'),
  tag: z.string().min(1),
  stacks: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
});

const CooldownCostSchema = z.object({
  type: z.literal('Cooldown'),
  duration: z.number().positive(),
});

export const CostSchema = z.discriminatedUnion('type', [
  ConsumeTagCostSchema,
  AddTagCostSchema,
  CooldownCostSchema,
]);

export const ActiveUseComponentSchema = z.object({
  type: z.literal('ActiveUse'),
  timelineId: z.string().min(1),
  tagActions: z.record(z.array(ActionSchema)),
  conditions: z.array(ConditionSchema).optional(),
  costs: z.array(CostSchema).optional(),
});

export const AbilityConfigJSONSchema = z.object({
  configId: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  tags: z.array(z.string()).optional(),
  activeUseComponents: z.array(ActiveUseComponentSchema).optional(),
  components: z.array(ComponentSchema).optional(),
});

export type AbilityConfigJSONInferred = z.infer<typeof AbilityConfigJSONSchema>;
