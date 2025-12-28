import { describe, it, expect, beforeEach } from 'vitest';
import { GameWorld } from '../../src/core/world/GameWorld.js';
import { BattleInstance, BattleUnit } from '../../src/stdlib/battle/index.js';
import { SilentLogger, setLogger } from '../../src/core/utils/Logger.js';

describe('Basic Battle Integration', () => {
  beforeEach(() => {
    // 使用静默 Logger 避免测试输出
    setLogger(new SilentLogger());
    GameWorld.destroy();
  });

  describe('BattleUnit', () => {
    it('should create unit with default attributes', () => {
      const unit = new BattleUnit({ name: 'Warrior' });

      expect(unit.displayName).toBe('Warrior');
      expect(unit.hp).toBeGreaterThan(0);
      expect(unit.atk).toBeGreaterThan(0);
      expect(unit.def).toBeGreaterThan(0);
    });

    it('should create unit with custom stats', () => {
      const unit = new BattleUnit({
        name: 'Tank',
        stats: {
          hp: 200,
          maxHp: 200,
          atk: 15,
          def: 50,
        },
      });

      expect(unit.hp).toBe(200);
      expect(unit.maxHp).toBe(200);
      expect(unit.atk).toBe(15);
      expect(unit.def).toBe(50);
    });

    it('should take damage and check death', () => {
      const unit = new BattleUnit({
        name: 'Test',
        stats: { hp: 100, maxHp: 100 },
      });
      unit.onSpawn();

      expect(unit.isActive).toBe(true);

      unit.takeDamage(50);
      expect(unit.hp).toBe(50);
      expect(unit.isDead).toBe(false);

      unit.takeDamage(60);
      expect(unit.hp).toBe(0);
      expect(unit.isDead).toBe(true);
    });

    it('should heal and not exceed maxHp', () => {
      const unit = new BattleUnit({
        name: 'Test',
        stats: { hp: 100, maxHp: 100 },
      });
      unit.onSpawn();
      unit.takeDamage(30);

      expect(unit.hp).toBe(70);

      const healed = unit.heal(50);
      expect(healed).toBe(30); // 只能治疗到满血
      expect(unit.hp).toBe(100);
    });
  });

  describe('BattleInstance', () => {
    it('should create battle instance', () => {
      const battle = new BattleInstance({ mode: 'turn-based' });

      expect(battle.type).toBe('Battle');
      expect(battle.state).toBe('created');
    });

    it('should add units to teams', () => {
      const battle = new BattleInstance();

      const unitA = new BattleUnit({ name: 'Unit A', team: 'A' });
      const unitB = new BattleUnit({ name: 'Unit B', team: 'B' });

      battle.addActor(unitA);
      battle.addActor(unitB);

      expect(battle.getTeamA().length).toBe(1);
      expect(battle.getTeamB().length).toBe(1);
    });

    it('should start and end battle', () => {
      const battle = new BattleInstance();

      const unitA = new BattleUnit({ name: 'Unit A', team: 'A' });
      const unitB = new BattleUnit({ name: 'Unit B', team: 'B' });

      battle.addActor(unitA);
      battle.addActor(unitB);

      battle.start();
      expect(battle.state).toBe('running');
      expect(battle.isOngoing).toBe(true);

      battle.end();
      expect(battle.state).toBe('ended');
    });

    it('should detect team A win when team B is eliminated', () => {
      const battle = new BattleInstance();

      const unitA = new BattleUnit({
        name: 'Unit A',
        team: 'A',
        stats: { hp: 100, maxHp: 100 },
      });
      const unitB = new BattleUnit({
        name: 'Unit B',
        team: 'B',
        stats: { hp: 50, maxHp: 50 },
      });

      battle.addActor(unitA);
      battle.addActor(unitB);
      battle.start();

      // 模拟 B 被击杀
      unitB.takeDamage(100);

      // 推进战斗以触发检查
      battle.advance(16);

      expect(battle.result).toBe('teamA_win');
    });
  });

  describe('GameWorld', () => {
    it('should be a singleton', () => {
      const world1 = GameWorld.getInstance();
      const world2 = GameWorld.getInstance();

      expect(world1).toBe(world2);
    });

    it('should create and manage battle instances', () => {
      const world = GameWorld.getInstance();

      const battle = world.createInstance(() => new BattleInstance());

      expect(world.instanceCount).toBe(1);
      expect(world.getInstance(battle.id)).toBe(battle);

      world.destroyInstance(battle.id);
      expect(world.instanceCount).toBe(0);
    });
  });
});
