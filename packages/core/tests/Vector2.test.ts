import { describe, it, expect } from 'vitest';
import { Vector2 } from '../src/math/Vector2.js';
import { Vector3 } from '../src/math/Vector3.js';

describe('Vector2', () => {
  describe('static factories', () => {
    it('should create zero vector', () => {
      const v = Vector2.zero();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should create from angle', () => {
      const v = Vector2.fromAngle(0, 1);
      expect(v.x).toBeCloseTo(1);
      expect(v.y).toBeCloseTo(0);

      const v2 = Vector2.fromAngle(Math.PI / 2, 1);
      expect(v2.x).toBeCloseTo(0);
      expect(v2.y).toBeCloseTo(1);
    });
  });

  describe('2D specific operations', () => {
    it('should rotate vector', () => {
      const v = new Vector2(1, 0);
      const rotated = v.rotate(Math.PI / 2);

      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
    });

    it('should get perpendicular vector', () => {
      const v = new Vector2(1, 0);
      const perp = v.perpendicular();

      expect(perp.x).toBeCloseTo(0);
      expect(perp.y).toBeCloseTo(1);
    });

    it('should calculate angle', () => {
      expect(new Vector2(1, 0).angle()).toBeCloseTo(0);
      expect(new Vector2(0, 1).angle()).toBeCloseTo(Math.PI / 2);
      expect(new Vector2(-1, 0).angle()).toBeCloseTo(Math.PI);
    });

    it('should calculate cross product as scalar', () => {
      const a = new Vector2(1, 0);
      const b = new Vector2(0, 1);

      expect(a.cross(b)).toBe(1);
      expect(b.cross(a)).toBe(-1);
    });
  });

  describe('conversion to Vector3', () => {
    it('should convert to Vector3 with z=0', () => {
      const v2 = new Vector2(1, 2);
      const v3 = v2.toVector3();

      expect(v3).toBeInstanceOf(Vector3);
      expect(v3.toArray()).toEqual([1, 2, 0]);
    });

    it('should convert to Vector3 with custom z', () => {
      const v2 = new Vector2(1, 2);
      const v3 = v2.toVector3(5);

      expect(v3.toArray()).toEqual([1, 2, 5]);
    });
  });

  describe('immutable operations', () => {
    it('add should return new instance', () => {
      const a = new Vector2(1, 2);
      const b = new Vector2(3, 4);
      const c = a.add(b);

      expect(c).not.toBe(a);
      expect(c.toArray()).toEqual([4, 6]);
      expect(a.x).toBe(1);
    });
  });

  describe('mutable operations', () => {
    it('rotateSelf should modify in place', () => {
      const v = new Vector2(1, 0);
      v.rotateSelf(Math.PI / 2);

      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(1);
    });
  });
});
