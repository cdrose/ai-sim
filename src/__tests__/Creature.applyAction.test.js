import { describe, test, expect } from 'vitest';
import { Creature } from '../creatures/Creature.js';

// Creature constructor accesses world.tileSize, world.gridW, world.gridH
const stubWorld = { tileSize: 10, gridW: 50, gridH: 50 };

// 8 absolute direction offsets matching Creature.js: N, NE, E, SE, S, SW, W, NW
const DIR_OFFSETS = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
const DIR_NAMES   = ['N','NE','E','SE','S','SW','W','NW'];

function makeCreature(tileX = 25, tileY = 25) {
  const ts = stubWorld.tileSize;
  return new Creature((tileX + 0.5) * ts, (tileY + 0.5) * ts, stubWorld);
}

describe('Creature.applyAction — 8 absolute directions', () => {
  test.each(DIR_NAMES.map((name, i) => [i, name]))(
    'action %i (%s) sets isMoving=true',
    (action) => {
      const c = makeCreature();
      c.applyAction(action);
      expect(c.isMoving).toBe(true);
    }
  );

  test.each(DIR_NAMES.map((name, i) => [i, name, ...DIR_OFFSETS[i]]))(
    'action %i (%s) sets targetTile to (+%i, +%i) from origin',
    (action, _name, dx, dy) => {
      const c = makeCreature(10, 10);
      c.applyAction(action);
      expect(c.targetTileX).toBe(10 + dx);
      expect(c.targetTileY).toBe(10 + dy);
    }
  );

  test.each(DIR_NAMES.map((name, i) => [i, name, ...DIR_OFFSETS[i]]))(
    'action %i (%s) sets velX/velY to normalised (%i, %i)',
    (action, _name, dx, dy) => {
      const c = makeCreature(10, 10);
      c.applyAction(action);
      const len = Math.hypot(dx, dy);
      expect(c.velX).toBeCloseTo(dx / len);
      expect(c.velY).toBeCloseTo(dy / len);
    }
  );

  test('velX/velY magnitude is 1 for all 8 actions from a non-border tile', () => {
    for (let a = 0; a < 8; a++) {
      const c = makeCreature(10, 10);
      c.applyAction(a);
      expect(Math.hypot(c.velX, c.velY)).toBeCloseTo(1.0);
    }
  });

  test('moveProgress resets to 0 on each applyAction', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2); // start E move
    c.step(c.moveDuration * 0.5); // advance halfway
    c.tileX = 11; c.isMoving = false; // simulate arrival
    c.applyAction(4); // start S move
    expect(c.moveProgress).toBe(0);
  });
});

describe('Creature.applyAction — OOB guard', () => {
  test('OOB action keeps target tile at current position', () => {
    const c = makeCreature(0, 0); // at top-left corner
    c.applyAction(7); // NW → target (-1,-1), OOB
    expect(c.targetTileX).toBe(0);
    expect(c.targetTileY).toBe(0);
  });

  test('OOB action still starts isMoving (stationary wait enforces cadence)', () => {
    const c = makeCreature(0, 0);
    c.applyAction(7);
    expect(c.isMoving).toBe(true);
  });

  test('OOB action sets velX/velY to zero', () => {
    const c = makeCreature(0, 0);
    c.applyAction(7);
    expect(c.velX).toBe(0);
    expect(c.velY).toBe(0);
  });

  test('valid action from corner does not trigger OOB', () => {
    const c = makeCreature(0, 0);
    c.applyAction(3); // SE → (1, 1), in bounds
    expect(c.targetTileX).toBe(1);
    expect(c.targetTileY).toBe(1);
  });
});

describe('Creature.step — tile animation', () => {
  test('moveProgress advances proportionally to dt', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2); // E
    c.step(c.moveDuration * 0.5);
    expect(c.moveProgress).toBeCloseTo(0.5, 5);
  });

  test('tile position updates when move completes', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2); // E → target (11, 10)
    c.step(c.moveDuration + 0.01);
    expect(c.tileX).toBe(11);
    expect(c.tileY).toBe(10);
  });

  test('isMoving becomes false when move completes', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2);
    c.step(c.moveDuration + 0.01);
    expect(c.isMoving).toBe(false);
  });

  test('pixel pos is at tile centre after move completes', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2); // E → tile (11, 10)
    c.step(c.moveDuration + 0.01);
    expect(c.pos.x).toBeCloseTo((11 + 0.5) * stubWorld.tileSize);
    expect(c.pos.y).toBeCloseTo((10 + 0.5) * stubWorld.tileSize);
  });

  test('pixel pos interpolates during animation', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2); // E: dx=1, dy=0
    c.step(c.moveDuration * 0.5); // halfway
    const ts = stubWorld.tileSize;
    // pos.x should be between tile 10 centre and tile 11 centre
    expect(c.pos.x).toBeGreaterThan((10 + 0.5) * ts);
    expect(c.pos.x).toBeLessThan((11 + 0.5) * ts);
  });

  test('energy decreases during step', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2);
    const before = c.energy;
    c.step(0.1);
    expect(c.energy).toBeLessThan(before);
  });
});

describe('Creature.think — gated on isMoving', () => {
  test('think() is a no-op while isMoving is true', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2); // starts a move → isMoving=true
    const actionBefore = c.lastAction;
    c.think();
    expect(c.lastAction).toBe(actionBefore); // unchanged
  });
});

describe('Creature.facing getter', () => {
  test('facing returns atan2(velY, velX)', () => {
    const c = makeCreature(10, 10);
    c.applyAction(2); // E: velX=1, velY=0
    expect(c.facing).toBeCloseTo(Math.atan2(0, 1));
  });
});
