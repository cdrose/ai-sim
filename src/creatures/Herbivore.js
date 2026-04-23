import { Creature } from './Creature.js';
import { DQNAgent } from '../ai/DQNAgent.js';

export class Herbivore extends Creature {
  static agent = new DQNAgent({ gridSize: 7, numActions: 5, bufferSize: 500 });

  constructor(x, y, world) {
    super(x, y, world);
    this.type = 'herbivore';
    this.speed = 25;
    this.energyDrain = 2;
    this.agent = Herbivore.agent;
  }

  computeReward() {
    let reward = 0;
    const tile = this.world.getTileAt(this.pos.x, this.pos.y);

    if (tile && tile.food > 0) {
      tile.food = 0;
      tile.foodTimer = 0;
      this.energy = Math.min(this.maxEnergy, this.energy + 30);
      reward += 2.0;
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
