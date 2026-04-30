import { describe, test, expect } from 'vitest';
import { Vec2 } from '../utils/Vec2.js';

describe('Vec2', () => {
  test('add returns new vector with summed components', () => {
    const r = new Vec2(1, 2).add(new Vec2(3, 4));
    expect(r.x).toBe(4);
    expect(r.y).toBe(6);
  });

  test('add does not mutate the operands', () => {
    const a = new Vec2(1, 2);
    a.add(new Vec2(9, 9));
    expect(a.x).toBe(1);
    expect(a.y).toBe(2);
  });

  test('sub returns the difference', () => {
    const r = new Vec2(5, 3).sub(new Vec2(2, 1));
    expect(r.x).toBe(3);
    expect(r.y).toBe(2);
  });

  test('scale multiplies both components', () => {
    const r = new Vec2(2, 3).scale(4);
    expect(r.x).toBe(8);
    expect(r.y).toBe(12);
  });

  test('length returns Euclidean magnitude', () => {
    expect(new Vec2(3, 4).length()).toBeCloseTo(5);
  });

  test('length of the zero vector is 0', () => {
    expect(new Vec2(0, 0).length()).toBe(0);
  });

  test('normalize returns a unit vector', () => {
    const n = new Vec2(3, 4).normalize();
    expect(n.length()).toBeCloseTo(1);
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
  });

  test('normalize of the zero vector returns zero vector without throwing', () => {
    const n = new Vec2(0, 0).normalize();
    expect(n.x).toBe(0);
    expect(n.y).toBe(0);
  });

  test('distTo returns distance between two points', () => {
    expect(new Vec2(0, 0).distTo(new Vec2(3, 4))).toBeCloseTo(5);
  });

  test('distTo is commutative', () => {
    const a = new Vec2(1, 2);
    const b = new Vec2(4, 6);
    expect(a.distTo(b)).toBeCloseTo(b.distTo(a));
  });

  test('clone returns an independent copy — mutating the clone does not affect the original', () => {
    const a = new Vec2(1, 2);
    const b = a.clone();
    b.x = 99;
    expect(a.x).toBe(1);
  });
});
