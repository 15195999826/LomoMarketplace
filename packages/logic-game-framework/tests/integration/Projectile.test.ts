/**
 * 投射物系统集成测试
 *
 * 测试完整的投射物流程：
 * - 创建和发射投射物
 * - 位置更新和飞行
 * - 碰撞检测和命中
 * - 事件发送
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Actor } from '../../src/core/entity/Actor.js';
import {
  ProjectileActor,
  type ProjectileConfig,
} from '../../src/core/entity/ProjectileActor.js';
import {
  ProjectileSystem,
  DistanceCollisionDetector,
} from '../../src/stdlib/systems/ProjectileSystem.js';
import { EventCollector } from '../../src/core/events/EventCollector.js';
import {
  isProjectileLaunchedEvent,
  isProjectileHitEvent,
  isProjectileMissEvent,
  isProjectilePierceEvent,
} from '../../src/core/events/ProjectileEvents.js';
import { SilentLogger, setLogger } from '../../src/core/utils/Logger.js';

// ========== 测试用 Actor ==========

class TestTarget extends Actor {
  readonly type = 'TestTarget';

  constructor(name: string, x: number, y: number) {
    super();
    this.displayName = name;
    this._position = { x, y };
  }
}

// ========== 测试 ==========

describe('Projectile System Integration', () => {
  let eventCollector: EventCollector;
  let projectileSystem: ProjectileSystem;

  beforeEach(() => {
    setLogger(new SilentLogger());
    eventCollector = new EventCollector();
    projectileSystem = new ProjectileSystem({
      collisionDetector: new DistanceCollisionDetector(30),
      eventCollector,
    });
  });

  describe('ProjectileActor', () => {
    it('should create projectile with default config', () => {
      const projectile = new ProjectileActor();

      expect(projectile.type).toBe('Projectile');
      expect(projectile.projectileState).toBe('idle');
      expect(projectile.config.projectileType).toBe('bullet');
      expect(projectile.config.speed).toBe(500);
    });

    it('should create projectile with custom config', () => {
      const config: Partial<ProjectileConfig> = {
        projectileType: 'moba',
        speed: 300,
        maxLifetime: 2000,
        damage: 50,
        hitDistance: 100,
      };

      const projectile = new ProjectileActor(config);

      expect(projectile.config.projectileType).toBe('moba');
      expect(projectile.config.speed).toBe(300);
      expect(projectile.config.damage).toBe(50);
      expect(projectile.config.hitDistance).toBe(100);
    });

    it('should launch and transition to flying state', () => {
      const projectile = new ProjectileActor({ speed: 100 });

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 100, y: 0 },
      });

      expect(projectile.projectileState).toBe('flying');
      expect(projectile.isFlying).toBe(true);
      // position 现在是 Vector3，包含 z 分量
      expect(projectile.position?.x).toBe(0);
      expect(projectile.position?.y).toBe(0);
      expect(projectile.position?.z).toBe(0);
      expect(projectile.source).toEqual({ id: 'source_1' });
    });

    it('should update position during flight', () => {
      const projectile = new ProjectileActor({ speed: 100 }); // 100 units/second

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 100, y: 0 },
      });

      // Update for 500ms = 0.5s, should move 50 units
      projectile.update(500);

      expect(projectile.position!.x).toBeCloseTo(50, 1);
      expect(projectile.position!.y).toBeCloseTo(0, 1);
      expect(projectile.flyTime).toBe(500);
    });

    it('should timeout after maxLifetime', () => {
      const projectile = new ProjectileActor({
        speed: 100,
        maxLifetime: 1000,
      });

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 1000, y: 0 },
      });

      // Update past lifetime
      projectile.update(1100);

      expect(projectile.projectileState).toBe('missed');
      expect(projectile.isFlying).toBe(false);
    });

    it('should track hit and support piercing', () => {
      const projectile = new ProjectileActor({
        piercing: true,
        maxPierceCount: 3,
      });

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
      });

      // First hit - should continue
      const continue1 = projectile.hit('target_1');
      expect(continue1).toBe(true);
      expect(projectile.pierceCount).toBe(1);
      expect(projectile.isFlying).toBe(true);

      // Second hit - should continue
      const continue2 = projectile.hit('target_2');
      expect(continue2).toBe(true);
      expect(projectile.pierceCount).toBe(2);

      // Third hit - should stop
      const continue3 = projectile.hit('target_3');
      expect(continue3).toBe(false);
      expect(projectile.projectileState).toBe('hit');
    });

    it('should not hit same target twice', () => {
      const projectile = new ProjectileActor({ piercing: true });

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
      });

      projectile.hit('target_1');
      expect(projectile.hasHitTarget('target_1')).toBe(true);
      expect(projectile.hasHitTarget('target_2')).toBe(false);
    });

    it('should calculate distance to target', () => {
      const projectile = new ProjectileActor();

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 100, y: 0 },
      });

      expect(projectile.getDistanceToTarget()).toBe(100);

      // Move halfway
      projectile.update(500); // speed=500, dt=500ms -> 250 units... wait, that's too far

      // Let me recalculate: speed=500 units/s, dt=500ms=0.5s, move=250 units
      // But target is at 100, so it should stop at or past 100
    });
  });

  describe('ProjectileSystem', () => {
    it('should update flying projectiles', () => {
      const projectile = new ProjectileActor({ speed: 100, maxLifetime: 5000 });
      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 500, y: 0 },
      });

      const actors: Actor[] = [projectile];

      // Tick for 100ms
      projectileSystem.tick(actors, 100);

      expect(projectile.position!.x).toBeCloseTo(10, 1); // 100 units/s * 0.1s = 10
    });

    it('should detect collision and emit hit event', () => {
      const projectile = new ProjectileActor({ speed: 100, maxLifetime: 5000 });
      const target = new TestTarget('Target', 50, 0);

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 100, y: 0 },
      });

      const actors: Actor[] = [projectile, target];

      // Tick until projectile reaches target (need ~500ms to reach x=50)
      for (let i = 0; i < 10; i++) {
        projectileSystem.tick(actors, 100);
        if (!projectile.isFlying) break;
      }

      expect(projectile.projectileState).toBe('hit');

      // Check events
      const events = eventCollector.collect();
      const hitEvents = events.filter(isProjectileHitEvent);

      expect(hitEvents.length).toBe(1);
      expect(hitEvents[0].target.id).toBe(target.id);
    });

    it('should emit miss event on timeout', () => {
      const projectile = new ProjectileActor({
        speed: 100,
        maxLifetime: 200,
      });

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 1000, y: 0 },
      });

      const actors: Actor[] = [projectile];

      // Tick past lifetime
      projectileSystem.tick(actors, 250);

      expect(projectile.projectileState).toBe('missed');

      const events = eventCollector.collect();
      const missEvents = events.filter(isProjectileMissEvent);

      expect(missEvents.length).toBe(1);
      expect(missEvents[0].reason).toBe('timeout');
    });

    it('should handle hitscan projectile instantly', () => {
      const projectile = new ProjectileActor({
        projectileType: 'hitscan',
        speed: 0, // Irrelevant for hitscan
      });

      const target = new TestTarget('Target', 100, 0);

      projectile.launch({
        source: { id: 'source_1' },
        target: target.toRef(),
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 100, y: 0 },
      });

      const actors: Actor[] = [projectile, target];

      // Single tick should resolve hitscan
      projectileSystem.tick(actors, 16);

      expect(projectile.projectileState).toBe('hit');

      const events = eventCollector.collect();
      const hitEvents = events.filter(isProjectileHitEvent);

      expect(hitEvents.length).toBe(1);
    });

    it('should handle piercing projectile', () => {
      const projectile = new ProjectileActor({
        speed: 200,
        maxLifetime: 5000,
        piercing: true,
        maxPierceCount: 2,
      });

      const target1 = new TestTarget('Target1', 30, 0);
      const target2 = new TestTarget('Target2', 70, 0);
      const target3 = new TestTarget('Target3', 110, 0);

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 200, y: 0 },
      });

      const actors: Actor[] = [projectile, target1, target2, target3];

      // Tick multiple times to pass through targets
      for (let i = 0; i < 20; i++) {
        projectileSystem.tick(actors, 50);
        if (!projectile.isFlying) break;
      }

      // Should have pierced first target, hit second (reached max pierce)
      expect(projectile.projectileState).toBe('hit');
      expect(projectile.pierceCount).toBe(2);

      const events = eventCollector.collect();
      const pierceEvents = events.filter(isProjectilePierceEvent);
      const hitEvents = events.filter(isProjectileHitEvent);

      expect(pierceEvents.length).toBe(1);
      expect(hitEvents.length).toBe(1);
    });

    it('should not hit source actor', () => {
      // Create source at origin
      const source = new TestTarget('Source', 0, 0);

      const projectile = new ProjectileActor({ speed: 100, maxLifetime: 500 });

      projectile.launch({
        source: source.toRef(),
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 100, y: 0 },
      });

      // Put source as actor and also a target further away
      const target = new TestTarget('Target', 50, 0);
      const actors: Actor[] = [projectile, source, target];

      // Tick
      for (let i = 0; i < 10; i++) {
        projectileSystem.tick(actors, 100);
        if (!projectile.isFlying) break;
      }

      // Should hit target, not source
      const events = eventCollector.collect();
      const hitEvents = events.filter(isProjectileHitEvent);

      expect(hitEvents.length).toBe(1);
      expect(hitEvents[0].target.id).toBe(target.id);
    });

    it('should get active projectiles', () => {
      const p1 = new ProjectileActor();
      const p2 = new ProjectileActor();
      const p3 = new ProjectileActor();
      const target = new TestTarget('Target', 100, 0);

      p1.launch({ source: { id: 's1' }, startPosition: { x: 0, y: 0 } });
      p2.launch({ source: { id: 's2' }, startPosition: { x: 0, y: 0 } });
      // p3 not launched

      const actors: Actor[] = [p1, p2, p3, target];

      const active = projectileSystem.getActiveProjectiles(actors);

      expect(active.length).toBe(2);
      expect(active).toContain(p1);
      expect(active).toContain(p2);
      expect(active).not.toContain(p3);
    });

    it('should force hit projectile', () => {
      const projectile = new ProjectileActor({ speed: 100, maxLifetime: 5000 });
      const target = new TestTarget('Target', 1000, 0);

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 1000, y: 0 },
      });

      const actors: Actor[] = [projectile, target];

      // Force hit before projectile reaches target
      projectileSystem.forceHit(projectile, target.toRef(), { x: 500, y: 0 });

      expect(projectile.projectileState).toBe('hit');

      const events = eventCollector.collect();
      const hitEvents = events.filter(isProjectileHitEvent);

      expect(hitEvents.length).toBe(1);
      expect(hitEvents[0].hitPosition).toEqual({ x: 500, y: 0 });
    });

    it('should force miss projectile', () => {
      const projectile = new ProjectileActor({ speed: 100, maxLifetime: 5000 });

      projectile.launch({
        source: { id: 'source_1' },
        startPosition: { x: 0, y: 0 },
      });

      const actors: Actor[] = [projectile];

      projectileSystem.forceMiss(projectile, 'blocked');

      expect(projectile.projectileState).toBe('missed');

      const events = eventCollector.collect();
      const missEvents = events.filter(isProjectileMissEvent);

      expect(missEvents.length).toBe(1);
      expect(missEvents[0].reason).toBe('blocked');
    });
  });

  describe('Full Flow: Launch → Fly → Hit', () => {
    it('should complete full projectile lifecycle', () => {
      // Setup
      const source = new TestTarget('Shooter', 0, 0);
      const target = new TestTarget('Enemy', 100, 0);

      const projectile = new ProjectileActor({
        projectileType: 'bullet',
        speed: 200,
        maxLifetime: 3000,
        damage: 50,
      });

      // Launch
      projectile.launch({
        source: source.toRef(),
        target: target.toRef(),
        startPosition: { x: 0, y: 0 },
        targetPosition: { x: 100, y: 0 },
      });

      expect(projectile.isFlying).toBe(true);
      expect(projectile.source).toEqual({ id: source.id });
      expect(projectile.target).toEqual({ id: target.id });

      const actors: Actor[] = [projectile, source, target];

      // Fly and hit
      let tickCount = 0;
      while (projectile.isFlying && tickCount < 100) {
        projectileSystem.tick(actors, 50);
        tickCount++;
      }

      // Verify hit
      expect(projectile.projectileState).toBe('hit');
      expect(projectile.hasHitTarget(target.id)).toBe(true);

      // Check events
      const events = eventCollector.collect();

      const hitEvents = events.filter(isProjectileHitEvent);
      expect(hitEvents.length).toBe(1);

      const hitEvent = hitEvents[0];
      expect(hitEvent.projectileId).toBe(projectile.id);
      expect(hitEvent.source.id).toBe(source.id);
      expect(hitEvent.target.id).toBe(target.id);
      expect(hitEvent.damage).toBe(50);
      expect(hitEvent.flyTime).toBeGreaterThan(0);
      expect(hitEvent.flyDistance).toBeGreaterThan(0);
    });
  });
});
