import { describe, test, expect } from 'vitest';
import { Creature } from '../creatures/Creature.js';

// Creature.js only imports Vec2 — no TF.js needed here.
// The world reference is stored but never accessed by applyAction().
const stubWorld = {};

function makeCreature(dirIndex) {
  const c = new Creature(50, 50, stubWorld);
  c.dirIndex = dirIndex;
  c.speed = 10;
  return c;
}

// Discrete headings: index 0=E(0°), 1=SE(45°), 2=S(90°), 3=SW(135°),
//                   4=W(180°), 5=NW(225°), 6=N(270°), 7=NE(315°)

describe('Creature.applyAction — relative turn correctness', () => {
  test('action 0 (straight) preserves dirIndex for all 8 headings', () => {
    for (let d = 0; d < 8; d++) {
      const c = makeCreature(d);
      c.applyAction(0);
      expect(c.dirIndex).toBe(d);
    }
  });

  test('action 1 (left 45°) rotates CCW by one step for all 8 headings', () => {
    for (let d = 0; d < 8; d++) {
      const c = makeCreature(d);
      c.applyAction(1);
      expect(c.dirIndex).toBe((d + 7) % 8);
    }
  });

  test('action 2 (left 90°) rotates CCW by two steps for all 8 headings', () => {
    for (let d = 0; d < 8; d++) {
      const c = makeCreature(d);
      c.applyAction(2);
      expect(c.dirIndex).toBe((d + 6) % 8);
    }
  });

  test('action 3 (right 45°) rotates CW by one step for all 8 headings', () => {
    for (let d = 0; d < 8; d++) {
      const c = makeCreature(d);
      c.applyAction(3);
      expect(c.dirIndex).toBe((d + 1) % 8);
    }
  });

  test('action 4 (right 90°) rotates CW by two steps for all 8 headings', () => {
    for (let d = 0; d < 8; d++) {
      const c = makeCreature(d);
      c.applyAction(4);
      expect(c.dirIndex).toBe((d + 2) % 8);
    }
  });

  test('eight consecutive left-45° turns return to original heading', () => {
    for (let d = 0; d < 8; d++) {
      const c = makeCreature(d);
      for (let i = 0; i < 8; i++) c.applyAction(1);
      expect(c.dirIndex).toBe(d);
    }
  });

  test('left-90° followed by right-90° cancels out', () => {
    for (let d = 0; d < 8; d++) {
      const c = makeCreature(d);
      c.applyAction(2); // left 90°
      c.applyAction(4); // right 90°
      expect(c.dirIndex).toBe(d);
    }
  });
});

describe('Creature.applyAction — velocity correctness', () => {
  test('heading east (index 0) → velocity (+speed, 0)', () => {
    const c = makeCreature(0);
    c.applyAction(0);
    expect(c.vel.x).toBeCloseTo(10);
    expect(c.vel.y).toBeCloseTo(0);
  });

  test('heading south (index 2, 90°) → velocity (0, +speed) in screen coords', () => {
    const c = makeCreature(2);
    c.applyAction(0);
    expect(c.vel.x).toBeCloseTo(0);
    expect(c.vel.y).toBeCloseTo(10);
  });

  test('heading west (index 4, 180°) → velocity (-speed, 0)', () => {
    const c = makeCreature(4);
    c.applyAction(0);
    expect(c.vel.x).toBeCloseTo(-10);
    expect(c.vel.y).toBeCloseTo(0);
  });

  test('heading north (index 6, 270°) → velocity (0, -speed) in screen coords', () => {
    const c = makeCreature(6);
    c.applyAction(0);
    expect(c.vel.x).toBeCloseTo(0);
    expect(c.vel.y).toBeCloseTo(-10);
  });

  test('velocity magnitude equals creature speed for all headings', () => {
    for (let d = 0; d < 8; d++) {
      const c = makeCreature(d);
      c.applyAction(0);
      const mag = Math.sqrt(c.vel.x ** 2 + c.vel.y ** 2);
      expect(mag).toBeCloseTo(10);
    }
  });

  test('turning left 90° from east yields northward velocity', () => {
    const c = makeCreature(0); // east
    c.applyAction(2);          // left 90° → north (index 6)
    expect(c.vel.x).toBeCloseTo(0);
    expect(c.vel.y).toBeCloseTo(-10);
  });

  test('turning right 90° from east yields southward velocity', () => {
    const c = makeCreature(0); // east
    c.applyAction(4);          // right 90° → south (index 2)
    expect(c.vel.x).toBeCloseTo(0);
    expect(c.vel.y).toBeCloseTo(10);
  });
});
