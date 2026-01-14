import type { AbilityConfig } from '@lomo/logic-game-framework';
import { Ability, getTimelineRegistry } from '@lomo/logic-game-framework';
import type { IBattleRecord } from '@lomo/logic-game-framework/stdlib';
import type { Element } from '@inkmon/core';
import {
  InkMonBattle,
  InkMonBattleGameWorld,
  INKMON_TIMELINES,
  createActionUseEvent,
  type InkMonBattleConfig,
} from '@inkmon/battle';
import {
  createCasterInkMon,
  createDummyInkMon,
  type MockInkMonStats,
} from '../mock/createMockInkMon';

export interface SkillTestConfig {
  abilityConfig: AbilityConfig;
  casterStats?: MockInkMonStats;
  casterElement?: Element;
  dummyCount?: number;
  dummyStats?: MockInkMonStats;
  maxTicks?: number;
}

export interface SkillTestResult {
  replay: IBattleRecord;
  success: boolean;
  error?: string;
  ticksUsed: number;
}

export function runSkillTest(config: SkillTestConfig): SkillTestResult {
  const {
    abilityConfig,
    casterStats,
    casterElement = 'fire',
    dummyCount = 1,
    dummyStats,
    maxTicks = 50,
  } = config;

  const world = InkMonBattleGameWorld.init();

  try {
    const timelineRegistry = getTimelineRegistry();
    for (const timeline of INKMON_TIMELINES) {
      timelineRegistry.register(timeline);
    }

    const casterInkMon = createCasterInkMon(casterStats, casterElement);
    const dummyInkMons = Array.from({ length: dummyCount }, (_, i) =>
      createDummyInkMon(i, dummyStats)
    );

    const battleConfig: InkMonBattleConfig = {
      tickInterval: 100,
      deterministicMode: true,
    };

    const battle = world.createInstance(() => new InkMonBattle(battleConfig));
    battle.initialize([casterInkMon], dummyInkMons);
    battle.start();

    const caster = battle.getTeamUnits('A')[0];
    if (!caster) {
      return {
        replay: battle.getReplay(),
        success: false,
        error: 'Failed to create caster actor',
        ticksUsed: 0,
      };
    }

    const testAbility = new Ability(abilityConfig, caster.toRef());
    caster.abilitySet.grantAbility(testAbility);

    const dummies = battle.getTeamUnits('B');
    const targetRef = dummies[0]?.toRef();

    const triggerEvent = createActionUseEvent(testAbility.id, caster.id, {
      target: targetRef,
      element: casterElement,
      power: 60,
      damageCategory: 'physical',
    });

    caster.abilitySet.receiveEvent(triggerEvent, battle);

    let ticksUsed = 0;
    const tickInterval = battleConfig.tickInterval ?? 100;

    while (ticksUsed < maxTicks) {
      world.tickAll(tickInterval);
      ticksUsed++;

      const hasExecuting = caster.abilitySet
        .getAbilities()
        .some((a) => a.getExecutingInstances().length > 0);

      if (!hasExecuting && ticksUsed > 1) {
        break;
      }

      if (battle.result !== 'ongoing') {
        break;
      }
    }

    return {
      replay: battle.getReplay(),
      success: true,
      ticksUsed,
    };
  } catch (error) {
    return {
      replay: null as unknown as IBattleRecord,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      ticksUsed: 0,
    };
  } finally {
    InkMonBattleGameWorld.destroy();
  }
}
