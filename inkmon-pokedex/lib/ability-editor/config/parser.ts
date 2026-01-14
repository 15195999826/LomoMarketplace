import type {
  AbilityConfigJSON,
  ActionJSON,
  ComponentJSON,
  ConditionJSON,
  CostJSON,
  ActiveUseComponentJSON,
} from './types';
import type {
  AbilityConfig,
  IAbilityComponent,
  Condition,
  Cost,
  IAction,
} from '@lomo/logic-game-framework';
import type { Element } from '@inkmon/core';
import {
  ActiveUseComponent,
  TagComponent,
  ModifierType,
  HasTagCondition,
  NoTagCondition,
  TagStacksCondition,
  ConsumeTagCost,
  AddTagCost,
  ApplyTagAction,
  RemoveTagAction,
  StageCueAction,
  TimeDurationComponent,
  StackComponent,
  StatModifierComponent,
  defaultTargetSelector,
} from '@lomo/logic-game-framework';
import { DamageAction, HealAction, CooldownCost } from '@inkmon/battle';
import { AbilityConfigJSONSchema } from './schema';

type ComponentFactory<T extends IAbilityComponent> = () => T;

const MODIFIER_TYPE_MAP: Record<string, ModifierType> = {
  AddBase: ModifierType.AddBase,
  MulBase: ModifierType.MulBase,
  AddFinal: ModifierType.AddFinal,
  MulFinal: ModifierType.MulFinal,
};

function createTargetSelector(target: string) {
  switch (target) {
    case 'self':
      return (ctx: Parameters<typeof defaultTargetSelector>[0]) =>
        ctx.ability ? [ctx.ability.owner] : [];
    case 'allEnemies':
    case 'allAllies':
      return defaultTargetSelector;
    case 'eventTarget':
    default:
      return defaultTargetSelector;
  }
}

export function parseAction(json: ActionJSON): IAction {
  switch (json.type) {
    case 'Damage':
      return new DamageAction({
        targetSelector: createTargetSelector(json.target),
        damage: json.damage,
        element: json.element as Element,
        damageCategory: json.damageCategory,
        useTypeEffectiveness: json.useTypeEffectiveness,
        useSTAB: json.useSTAB,
        useCritical: json.useCritical,
      });

    case 'Heal':
      return new HealAction({
        targetSelector: createTargetSelector(json.target),
        healAmount: json.healAmount,
        healPercent: json.healPercent,
      });

    case 'StageCue':
      return new StageCueAction({
        targetSelector: defaultTargetSelector,
        cueId: json.cueId,
        params: json.params,
      });

    case 'AddTag':
      return new ApplyTagAction({
        targetSelector: createTargetSelector(json.target),
        tag: json.tag,
        stacks: json.stacks,
        duration: json.duration,
      });

    case 'RemoveTag':
      return new RemoveTagAction({
        targetSelector: createTargetSelector(json.target),
        tag: json.tag,
        stacks: json.stacks,
      });

    default:
      throw new Error(`Unknown action type: ${(json as ActionJSON).type}`);
  }
}

export function parseTagActions(
  tagActionsJson: Record<string, ActionJSON[]>
): Record<string, IAction[]> {
  const result: Record<string, IAction[]> = {};
  for (const [tag, actions] of Object.entries(tagActionsJson)) {
    result[tag] = actions.map(parseAction);
  }
  return result;
}

export function parseComponent(
  json: ComponentJSON
): ComponentFactory<IAbilityComponent> {
  switch (json.type) {
    case 'TimeDurationComponent':
      return () => new TimeDurationComponent(json.duration);

    case 'StackComponent':
      return () =>
        new StackComponent(
          json.initialStacks ?? 1,
          json.maxStacks ?? 1,
          json.overflowPolicy ?? 'cap'
        );

    case 'StatModifierComponent':
      return () =>
        new StatModifierComponent(
          json.modifiers.map((m) => ({
            attributeName: m.attributeName,
            modifierType: MODIFIER_TYPE_MAP[m.modifierType],
            value: m.value,
          }))
        );

    case 'TagComponent':
      return () => new TagComponent({ tags: json.tags });

    default:
      throw new Error(`Unknown component type: ${(json as ComponentJSON).type}`);
  }
}

export function parseCondition(json: ConditionJSON): Condition {
  switch (json.type) {
    case 'HasTag':
      return new HasTagCondition(json.tag);

    case 'NoTag':
      return new NoTagCondition(json.tag);

    case 'TagStacks':
      return new TagStacksCondition(json.tag, json.minStacks);

    default:
      throw new Error(
        `Unknown condition type: ${(json as ConditionJSON).type}`
      );
  }
}

export function parseCost(json: CostJSON): Cost {
  switch (json.type) {
    case 'ConsumeTag':
      return new ConsumeTagCost(json.tag, json.stacks ?? 1);

    case 'AddTag':
      return new AddTagCost(json.tag, {
        stacks: json.stacks,
        duration: json.duration,
      });

    case 'Cooldown':
      return new CooldownCost(json.duration);

    default:
      throw new Error(`Unknown cost type: ${(json as CostJSON).type}`);
  }
}

export function parseActiveUseComponent(
  json: ActiveUseComponentJSON
): ComponentFactory<ActiveUseComponent> {
  return () =>
    new ActiveUseComponent({
      timelineId: json.timelineId,
      tagActions: parseTagActions(json.tagActions),
      conditions: json.conditions?.map(parseCondition),
      costs: json.costs?.map(parseCost),
    });
}

export function parseAbilityConfig(json: AbilityConfigJSON): AbilityConfig {
  return {
    configId: json.configId,
    displayName: json.displayName,
    description: json.description,
    icon: json.icon,
    tags: json.tags,
    activeUseComponents: json.activeUseComponents?.map(parseActiveUseComponent),
    components: json.components?.map(parseComponent),
  };
}

export type ParseResult =
  | {
      success: true;
      config: AbilityConfig;
      json: AbilityConfigJSON;
    }
  | {
      success: false;
      errors: Array<{ path: string; message: string }>;
    };

export function validateAndParse(input: unknown): ParseResult {
  let jsonObj: unknown;
  if (typeof input === 'string') {
    try {
      jsonObj = JSON.parse(input);
    } catch (e) {
      return {
        success: false,
        errors: [
          { path: '', message: `JSON parse error: ${(e as Error).message}` },
        ],
      };
    }
  } else {
    jsonObj = input;
  }

  const result = AbilityConfigJSONSchema.safeParse(jsonObj);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    };
  }

  try {
    const config = parseAbilityConfig(result.data as AbilityConfigJSON);
    return {
      success: true,
      config,
      json: result.data as AbilityConfigJSON,
    };
  } catch (e) {
    return {
      success: false,
      errors: [{ path: '', message: `Parse error: ${(e as Error).message}` }],
    };
  }
}
