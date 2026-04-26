import { Creature } from './Creature.js';
import { DQNAgent } from '../ai/DQNAgent.js';

export class Herbivore extends Creature {
  static agent = new DQNAgent({ gridSize: 7, numChannels: 5, numActions: 5, bufferSize: 500 });

  constructor(x, y, world) {
    super(x, y, world);
    this.type = 'herbivore';
    this.speed = 25;
    this.energyDrain = 2;
    this.agent = Herbivore.agent;
    this.prevDistToFood = null;
  }

  getState() {
    return this.world.getLocalGrid(this.pos.x, this.pos.y, 7, 5, {
      energyFraction: this.energy / this.maxEnergy
    });
  }

  // Find nearest food tile within searchRadius pixels, returns {x, y, dist} or null
  _getNearestFood(searchRadius = 120) {
    const tileSize = this.world.tileSize;
    const cx = Math.floor(this.pos.x / tileSize);
    const cy = Math.floor(this.pos.y / tileSize);
    const tr = Math.ceil(searchRadius / tileSize);

    let nearest = null;
    let minDist = Infinity;
    for (let dx = -tr; dx <= tr; dx++) {
      for (let dy = -tr; dy <= tr; dy++) {
        const tile = this.world.getTile(cx + dx, cy + dy);
        if (tile && tile.food > 0) {
          const wx = (cx + dx + 0.5) * tileSize;
          const wy = (cy + dy + 0.5) * tileSize;
          const d = Math.hypot(wx - this.pos.x, wy - this.pos.y);
          if (d < minDist) { minDist = d; nearest = { x: wx, y: wy, dist: d }; }
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
      // Dense approach reward: only meaningful when hungry
      if (hungry) {
        const food = this._getNearestFood();
        if (food) {
          if (this.prevDistToFood !== null) {
            const delta = this.prevDistToFood - food.dist;
            reward += Math.max(-0.3, Math.min(0.3, delta * 0.04));
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

    if (this.vel.length() > 5) reward += 0.02;

    return reward;
  }
}
