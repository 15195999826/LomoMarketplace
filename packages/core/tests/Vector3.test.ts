import { describe, it, expect } from 'vitest';
import { Vector3 } from '../src/math/Vector3.js';

describe('Vector3', () => {
  describe('static factories', () => {
    it('should create zero vector', () => {
      const v = Vector3.zero();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });

    it('should create one vector', () => {
      const v = Vector3.one();
      expect(v.x).toBe(1);
      expect(v.y).toBe(1);
      expect(v.z).toBe(1);
    });

    it('should create direction vectors', () => {
      expect(Vector3.right().toArray()).toEqual([1, 0, 0]);
      expect(Vector3.left().toArray()).toEqual([-1, 0, 0]);
      expect(Vector3.up().toArray()).toEqual([0, 1, 0]);
      expect(Vector3.down().toArray()).toEqual([0, -1, 0]);
      expect(Vector3.forward().toArray()).toEqual([0, 0, 1]);
      expect(Vector3.back().toArray()).toEqual([0, 0, -1]);
    });

    it('should create from object', () => {
      const v = Vector3.from({ x: 1, y: 2 });
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(0);
    });

    it('should create from object with z', () => {
      const v = Vector3.from({ x: 1, y: 2, z: 3 });
      expect(v.z).toBe(3);
    });

    it('should create from array', () => {
      const v = Vector3.fromArray([1, 2, 3]);
      expect(v.toArray()).toEqual([1, 2, 3]);
    });
  });

  describe('immutable operations', () => {
    it('add should return new instance', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(4, 5, 6);
      const c = a.add(b);

      expect(c).not.toBe(a);
      expect(c).not.toBe(b);
      expect(c.toArray()).toEqual([5, 7, 9]);
      expect(a.x).toBe(1); // 原值不变
    });

    it('sub should return new instance', () => {
      const a = new Vector3(5, 7, 9);
      const b = new Vector3(1, 2, 3);
      const c = a.sub(b);

      expect(c.toArray()).toEqual([4, 5, 6]);
      expect(a.x).toBe(5);
    });

    it('scale should multiply by scalar', () => {
      const v = new Vector3(1, 2, 3);
      const scaled = v.scale(2);

      expect(scaled.toArray()).toEqual([2, 4, 6]);
      expect(v.x).toBe(1);
    });

    it('normalize should return unit vector', () => {
      const v = new Vector3(3, 4, 0);
      const n = v.normalize();

      expect(n.length()).toBeCloseTo(1);
      expect(n.x).toBeCloseTo(0.6);
      expect(n.y).toBeCloseTo(0.8);
    });

    it('normalize zero vector should return zero', () => {
      const v = Vector3.zero();
      const n = v.normalize();

      expect(n.isZero()).toBe(true);
    });

    it('negate should invert signs', () => {
      const v = new Vector3(1, -2, 3);
      const neg = v.negate();

      expect(neg.toArray()).toEqual([-1, 2, -3]);
    });

    it('clone should create independent copy', () => {
      const a = new Vector3(1, 2, 3);
      const b = a.clone();

      b.x = 10;
      expect(a.x).toBe(1);
    });
  });

  describe('mutable operations', () => {
    it('addSelf should modify in place', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(4, 5, 6);
      const result = a.addSelf(b);

      expect(result).toBe(a);
      expect(a.toArray()).toEqual([5, 7, 9]);
    });

    it('subSelf should modify in place', () => {
      const a = new Vector3(5, 7, 9);
      const b = new Vector3(1, 2, 3);
      a.subSelf(b);

      expect(a.toArray()).toEqual([4, 5, 6]);
    });

    it('scaleSelf should modify in place', () => {
      const v = new Vector3(1, 2, 3);
      v.scaleSelf(2);

      expect(v.toArray()).toEqual([2, 4, 6]);
    });

    it('normalizeSelf should modify in place', () => {
      const v = new Vector3(3, 4, 0);
      v.normalizeSelf();

      expect(v.length()).toBeCloseTo(1);
    });

    it('set should update all components', () => {
      const v = new Vector3();
      v.set(1, 2, 3);

      expect(v.toArray()).toEqual([1, 2, 3]);
    });

    it('copy should copy from another vector', () => {
      const a = new Vector3();
      const b = new Vector3(1, 2, 3);
      a.copy(b);

      expect(a.toArray()).toEqual([1, 2, 3]);
      expect(a).not.toBe(b);
    });
  });

  describe('calculations', () => {
    it('should calculate dot product', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(4, 5, 6);

      expect(a.dot(b)).toBe(32); // 1*4 + 2*5 + 3*6
    });

    it('should calculate cross product', () => {
      const a = new Vector3(1, 0, 0);
      const b = new Vector3(0, 1, 0);
      const c = a.cross(b);

      expect(c.toArray()).toEqual([0, 0, 1]);
    });

    it('should calculate length', () => {
      const v = new Vector3(3, 4, 0);
      expect(v.length()).toBe(5);
    });

    it('should calculate length squared', () => {
      const v = new Vector3(3, 4, 0);
      expect(v.lengthSquared()).toBe(25);
    });

    it('should calculate distance', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(3, 4, 0);
      expect(a.distanceTo(b)).toBe(5);
    });

    it('should calculate distance squared', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(3, 4, 0);
      expect(a.distanceToSquared(b)).toBe(25);
    });

    it('should calculate angle between vectors', () => {
      const a = new Vector3(1, 0, 0);
      const b = new Vector3(0, 1, 0);

      expect(a.angleTo(b)).toBeCloseTo(Math.PI / 2);
    });

    it('should lerp between vectors', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(10, 10, 10);
      const mid = a.lerp(b, 0.5);

      expect(mid.toArray()).toEqual([5, 5, 5]);
    });
  });

  describe('comparison', () => {
    it('should check approximate equality', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(1.0000001, 2, 3);

      expect(a.equals(b)).toBe(true);
      expect(a.equals(b, 1e-10)).toBe(false);
    });

    it('should check exact equality', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(1, 2, 3);
      const c = new Vector3(1.0000001, 2, 3);

      expect(a.exactEquals(b)).toBe(true);
      expect(a.exactEquals(c)).toBe(false);
    });

    it('should check if zero', () => {
      expect(Vector3.zero().isZero()).toBe(true);
      expect(new Vector3(0.0000001, 0, 0).isZero()).toBe(true);
      expect(new Vector3(1, 0, 0).isZero()).toBe(false);
    });
  });

  describe('conversion', () => {
    it('should convert to array', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.toArray()).toEqual([1, 2, 3]);
    });

    it('should convert to object', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.toObject()).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should convert to string', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.toString()).toBe('Vector3(1, 2, 3)');
    });

    it('should get xy components', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.xy).toEqual({ x: 1, y: 2 });
    });
  });
});
