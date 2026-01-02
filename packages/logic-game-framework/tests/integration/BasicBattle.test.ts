/**
 * 基础战斗集成测试
 *
 * 本测试展示如何使用框架的核心功能：
 * - 使用 defineAttributes() 创建类型安全的属性系统
 * - 创建自定义战斗单位
 * - 使用 StandardBattleInstance 管理战斗流程
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GameWorld } from '../../src/core/world/GameWorld.js';
import { Actor } from '../../src/core/entity/Actor.js';
import { StandardBattleInstance } from '../../src/stdlib/battle/index.js';
import { defineAttributes, type AttributeSet } from '../../src/core/attributes/index.js';
import { SilentLogger, setLogger } from '../../src/core/utils/Logger.js';

// ========== 定义测试用的战斗单位 ==========

/**
 * 战斗单位属性配置
 */
const UnitAttributes = {
  hp: { baseValue: 100, minValue: 0 },
  maxHp: { baseValue: 100, minValue: 1 },
  atk: { baseValue: 50 },
  def: { baseValue: 30 },
  speed: { baseValue: 100 },
} as const;

/**
 * 测试用战斗单位
 *
 * 展示如何正确使用 defineAttributes() 创建带属性系统的 Actor
 */
class TestUnit extends Actor {
  readonly type = 'TestUnit';
  readonly attributes: AttributeSet<typeof UnitAttributes>;

  constructor(name: string, team?: string) {
    super();
    this.displayName = name;
    this.team = team;
    this.attributes = defineAttributes(UnitAttributes);

    // 订阅 HP 变化，处理死亡
    this.attributes.onHpChanged((event) => {
      if (event.newValue <= 0) {
        this.onDeath();
      }
    });
  }

  // 类型安全的属性访问
  get hp() { return this.attributes.hp; }
  get maxHp() { return this.attributes.maxHp; }
  get atk() { return this.attributes.atk; }
  get def() { return this.attributes.def; }
  get speed() { return this.attributes.speed; }

  /**
   * 造成伤害
   */
  takeDamage(damage: number): number {
    const currentHp = this.attributes.getBase('hp');
    const actualDamage = Math.min(damage, currentHp);
    this.attributes.modifyBase('hp', -actualDamage);
    return actualDamage;
  }

  /**
   * 治疗
   */
  heal(amount: number): number {
    const currentHp = this.attributes.getBase('hp');
    const maxHp = this.maxHp;
    const actualHeal = Math.min(amount, maxHp - currentHp);
    if (actualHeal > 0) {
      this.attributes.modifyBase('hp', actualHeal);
    }
    return actualHeal;
  }

  onSpawn(): void {
    super.onSpawn();
    // 初始化 HP 为 MaxHP
    this.attributes.setBase('hp', this.maxHp);
  }
}

// ========== 测试 ==========

describe('Basic Battle Integration', () => {
  beforeEach(() => {
    // 使用静默 Logger 避免测试输出
    setLogger(new SilentLogger());
    GameWorld.destroy();
  });

  describe('TestUnit（使用 defineAttributes）', () => {
    it('should create unit with type-safe attributes', () => {
      const unit = new TestUnit('Warrior');

      expect(unit.displayName).toBe('Warrior');
      expect(unit.hp).toBe(100);
      expect(unit.atk).toBe(50);
      expect(unit.def).toBe(30);
    });

    it('should access attribute breakdown via $ prefix', () => {
      const unit = new TestUnit('Test');

      const breakdown = unit.attributes.$atk;
      expect(breakdown.base).toBe(50);
      expect(breakdown.currentValue).toBe(50);
      expect(breakdown.addBaseSum).toBe(0);
    });

    it('should get attribute name reference via Attribute suffix', () => {
      const unit = new TestUnit('Test');

      expect(unit.attributes.atkAttribute).toBe('atk');
      expect(unit.attributes.hpAttribute).toBe('hp');
    });

    it('should take damage and trigger death', () => {
      const unit = new TestUnit('Test');
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
      const unit = new TestUnit('Test');
      unit.onSpawn();
      unit.takeDamage(30);

      expect(unit.hp).toBe(70);

      const healed = unit.heal(50);
      expect(healed).toBe(30); // 只能治疗到满血
      expect(unit.hp).toBe(100);
    });
  });

  describe('StandardBattleInstance', () => {
    it('should create battle instance', () => {
      const battle = new StandardBattleInstance({ mode: 'turn-based' });

      expect(battle.type).toBe('Battle');
      expect(battle.state).toBe('created');
    });

    it('should add units to teams', () => {
      const battle = new StandardBattleInstance();

      const unitA = battle.createActor(() => new TestUnit('Unit A', 'A'));
      const unitB = battle.createActor(() => new TestUnit('Unit B', 'B'));

      expect(battle.getTeamA().length).toBe(1);
      expect(battle.getTeamB().length).toBe(1);
    });

    it('should start and end battle', () => {
      const battle = new StandardBattleInstance();

      battle.createActor(() => new TestUnit('Unit A', 'A'));
      battle.createActor(() => new TestUnit('Unit B', 'B'));

      battle.start();
      expect(battle.state).toBe('running');
      expect(battle.isOngoing).toBe(true);

      battle.end();
      expect(battle.state).toBe('ended');
    });

    it('should detect team A win when team B is eliminated', () => {
      const battle = new StandardBattleInstance();

      battle.createActor(() => new TestUnit('Unit A', 'A'));
      const unitB = battle.createActor(() => new TestUnit('Unit B', 'B'));

      battle.start();

      // 模拟 B 被击杀
      unitB.takeDamage(100);

      // 推进战斗以触发检查
      battle.tick(16);

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

      const battle = world.createInstance(() => new StandardBattleInstance());

      expect(world.instanceCount).toBe(1);
      expect(world.getInstance(battle.id)).toBe(battle);

      world.destroyInstance(battle.id);
      expect(world.instanceCount).toBe(0);
    });
  });
});
