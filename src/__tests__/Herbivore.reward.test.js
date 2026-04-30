import { describe, test, expect, beforeAll } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { Herbivore } from '../creatures/Herbivore.js';

// Herbivore imports DQNAgent → Brain → TF.js. The setup file has already
// set the CPU backend, so model creation works in this environment.

// Builds a minimal world stub. All tile lookups return mutable objects
// stored in a map so mutations (e.g. tile.food = 0) persist and can be
// asserted on. tileSize=10, creature at (50,50) → tile (5,5).
function makeWorld({ foodAtCreature = false, predatorNearby = false } = {}) {
  const tileSize = 10;
  const tiles = {};

  const getTile = (tx, ty) => {
    const key = `${tx},${ty}`;
    if (!tiles[key]) {
      const hasFood = foodAtCreature && tx === 5 && ty === 5;
      tiles[key] = { type: 0, food: hasFood ? 1 : 0, foodTimer: 0 };
    }
    return tiles[key];
  };

  return {
    tileSize,
    gridW: 50,
    gridH: 50,
    getTile,
    getTileAt(wx, wy) {
      return getTile(Math.floor(wx / tileSize), Math.floor(wy / tileSize));
    },
    getCreaturesNear(_x, _y, _r) {
      if (!predatorNearby) return [];
      return [{ type: 'predator', alive: true, pos: { x: 50, y: 50 } }];
    },
    creatures: [],
  };
}

function makeHerbivore(world, energy = 50) {
  const h = new Herbivore(50, 50, world);
  h.energy = energy;
  h.maxEnergy = 100;
  h.prevDistToFood = null;
  return h;
}

describe('Herbivore.computeReward', () => {
  beforeAll(() => tf.ready());

  test('eating food when hungry yields positive reward', () => {
    const world = makeWorld({ foodAtCreature: true });
    const h = makeHerbivore(world, 50); // 50 < 85 → hungry
    const reward = h.computeReward();
    expect(reward).toBeGreaterThan(0);
  });

  test('eating food when hungry consumes the tile', () => {
    const world = makeWorld({ foodAtCreature: true });
    const h = makeHerbivore(world, 50);
    expect(world.getTile(5, 5).food).toBe(1);
    h.computeReward();
    expect(world.getTile(5, 5).food).toBe(0);
  });

  test('eating food when hungry restores energy', () => {
    const world = makeWorld({ foodAtCreature: true });
    const h = makeHerbivore(world, 50);
    h.computeReward();
    expect(h.energy).toBeGreaterThan(50);
  });

  test('eating when energy is near-full caps restored energy at maxEnergy', () => {
    // 75 < 85 so still hungry; 75 + 30 = 105 which would exceed maxEnergy
    const world = makeWorld({ foodAtCreature: true });
    const h = makeHerbivore(world, 75);
    h.computeReward();
    expect(h.energy).toBe(h.maxEnergy);
  });

  test('reward is higher when starving than when moderately hungry', () => {
    const worldA = makeWorld({ foodAtCreature: true });
    const worldB = makeWorld({ foodAtCreature: true });
    const starving  = makeHerbivore(worldA, 10);  // very hungry — hungerFactor ≈ 1.9
    const moderate  = makeHerbivore(worldB, 60);  // moderately hungry — hungerFactor = 1.4
    expect(starving.computeReward()).toBeGreaterThan(moderate.computeReward());
  });

  test('no reward and no food consumption when sated', () => {
    const world = makeWorld({ foodAtCreature: true });
    const h = makeHerbivore(world, 95); // 95 > 85 → sated
    const reward = h.computeReward();
    expect(reward).toBe(0);
    expect(world.getTile(5, 5).food).toBe(1); // tile untouched
  });

  test('predator nearby incurs negative reward', () => {
    const world = makeWorld({ predatorNearby: true });
    const h = makeHerbivore(world, 50);
    const reward = h.computeReward();
    expect(reward).toBeLessThan(0);
  });

  test('no food and no predator yields near-zero reward', () => {
    const world = makeWorld();
    const h = makeHerbivore(world, 50);
    const reward = h.computeReward();
    // No food to find → no approach reward; no predator penalty;
    // tiny movement bonus may apply but vel starts at (0,0)
    expect(reward).toBeCloseTo(0, 1);
  });
});
