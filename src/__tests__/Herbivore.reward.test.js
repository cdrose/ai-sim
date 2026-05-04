import { describe, test, expect, beforeAll } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { Herbivore } from '../creatures/Herbivore.js';

// Herbivore imports DQNAgent → Brain → TF.js. The setup file has already
// set the CPU backend, so model creation works in this environment.

// Builds a minimal world stub. All tile lookups return mutable objects
// stored in a map so mutations (e.g. tile.food = 0) persist and can be
// asserted on. tileSize=10, gridW/H=50.
// Creature at pixel (55, 55) → tileX=5, tileY=5 (snapped to tile centre).
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
      return [{ type: 'predator', alive: true, pos: { x: 55, y: 55 } }];
    },
    creatures: [],
  };
}

function makeHerbivore(world, energy = 50) {
  const h = new Herbivore(55, 55, world); // pixel pos → tileX=5, tileY=5
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

  test('approaching food from one tile away gives positive approach reward', () => {
    const world = makeWorld();
    // Place food one tile north of creature (tileX=5, tileY=4)
    world.getTile(5, 4).food = 1;
    const h = makeHerbivore(world, 50);
    // Simulate: creature was 2 tiles away last step, now 1 tile away
    h.prevDistToFood = 2.0; // tile units
    const reward = h.computeReward();
    // delta = 2 - 1 = 1 tile; reward += 1 * 0.5 = 0.5
    expect(reward).toBeGreaterThan(0);
  });

  test('no food and no predator yields zero reward', () => {
    const world = makeWorld();
    const h = makeHerbivore(world, 50);
    const reward = h.computeReward();
    expect(reward).toBeCloseTo(0, 1);
  });
});
