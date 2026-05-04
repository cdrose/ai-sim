import { Creature } from './Creature.js';
import { DQNAgent } from '../ai/DQNAgent.js';

export class Herbivore extends Creature {
  static agent = new DQNAgent({ gridSize: 13, numChannels: 5, numActions: 8, bufferSize: 20000 });

  constructor(x, y, world) {
    super(x, y, world);
    this.type = 'herbivore';
    this.energyDrain = 2;
    this.moveDuration = 0.25; // 4 tiles/second
    this.agent = Herbivore.agent;
    this.prevDistToFood = null;
  }

  getState() {
    return this.world.getLocalGrid(this.tileX, this.tileY, 13, 5, {
      energyFraction: this.energy / this.maxEnergy,
    });
  }

  // Returns tile-unit distance to nearest food within searchRadius tiles
  _getNearestFood(searchRadius = 6) {
    let nearest = null;
    let minDist = Infinity;
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const tile = this.world.getTile(this.tileX + dx, this.tileY + dy);
        if (tile && tile.food > 0) {
          const d = Math.hypot(dx, dy); // tile-unit Euclidean distance
          if (d < minDist) { minDist = d; nearest = { dist: d }; }
        }
      }
    }
    return nearest;
  }

  computeReward() {
    let reward = 0;
    const tile = this.world.getTileAt(this.pos.x, this.pos.y);
    const hungerFactor = 2 - (this.energy / this.maxEnergy); // 1.0 (full) to 2.0 (starving)
    const hungry = this.energy < this.maxEnergy * 0.85;

    if (tile && tile.food > 0) {
      if (hungry) {
        tile.food = 0;
        tile.foodTimer = 0;
        this.energy = Math.min(this.maxEnergy, this.energy + 30);
        reward += 2.0 * hungerFactor;
        this.prevDistToFood = null;
      }
      // No reward or eating when sated — leave food for others
    } else {
      // Approach reward fires once per tile arrival; delta is in tile units
      if (hungry) {
        const food = this._getNearestFood();
        if (food) {
          if (this.prevDistToFood !== null) {
            const delta = this.prevDistToFood - food.dist; // positive = approaching
            reward += Math.max(-0.5, Math.min(0.5, delta * 0.5));
          }
          this.prevDistToFood = food.dist;
        } else {
          this.prevDistToFood = null;
        }
      }
    }

    const nearby = this.world.getCreaturesNear(this.pos.x, this.pos.y, 50);
    const sameSpecies = nearby.filter(c => c !== this && c.type === 'herbivore' && c.alive);
    if (sameSpecies.length > 0 && sameSpecies.length < 6) reward += 0.1;
    if (sameSpecies.length >= 6) reward -= 0.1;

    const predators = nearby.filter(c => c.type === 'predator' && c.alive);
    if (predators.length > 0) reward -= 1.0;

    if (tile && tile.type === 2) reward -= 0.5;
    if (tile && tile.type === 1) reward -= 0.3;

    return reward;
  }
}
