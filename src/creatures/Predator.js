import { Creature } from './Creature.js';
import { DQNAgent } from '../ai/DQNAgent.js';

export class Predator extends Creature {
  static agent = new DQNAgent({ gridSize: 7, numActions: 5, bufferSize: 500 });

  constructor(x, y, world) {
    super(x, y, world);
    this.type = 'predator';
    this.speed = 30;
    this.energyDrain = 3;
    this.agent = Predator.agent;
  }

  computeReward() {
    let reward = 0;

    const nearby = this.world.getCreaturesNear(this.pos.x, this.pos.y, 30);
    const prey = nearby.filter(c => c.type === 'herbivore' && c.alive);

    if (prey.length > 0) {
      reward += 0.3;
      const closest = prey.sort((a, b) => a.pos.distTo(this.pos) - b.pos.distTo(this.pos))[0];
      if (closest.pos.distTo(this.pos) < 8) {
        closest.alive = false;
        this.energy = Math.min(this.maxEnergy, this.energy + 50);
        reward += 5.0;
      }
    }

    const otherPreds = nearby.filter(c => c !== this && c.type === 'predator' && c.alive);
    if (otherPreds.length > 2) reward -= 0.2;

    const tile = this.world.getTileAt(this.pos.x, this.pos.y);
    if (tile && tile.type === 2) reward -= 0.5;

    return reward;
  }
}
