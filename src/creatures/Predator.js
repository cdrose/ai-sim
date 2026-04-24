import { Creature } from './Creature.js';
import { DQNAgent } from '../ai/DQNAgent.js';

export class Predator extends Creature {
  static agent = new DQNAgent({ gridSize: 13, numChannels: 6, numActions: 5, bufferSize: 500 });

  constructor(x, y, world) {
    super(x, y, world);
    this.type = 'predator';
    this.speed = 38;
    this.energyDrain = 1.5;
    this.maxEnergy = 150;
    this.energy = 150;
    this.agent = Predator.agent;
  }

  getState() {
    return this.world.getLocalGrid(this.pos.x, this.pos.y, 13, 6, {
      energyFraction: this.energy / this.maxEnergy
    });
  }

  computeReward() {
    let reward = 0;

    const nearby = this.world.getCreaturesNear(this.pos.x, this.pos.y, 80);
    const prey = nearby.filter(c => c.type === 'herbivore' && c.alive);

    if (prey.length > 0) {
      reward += 0.3;
      const closest = prey.sort((a, b) => a.pos.distTo(this.pos) - b.pos.distTo(this.pos))[0];
      if (closest.pos.distTo(this.pos) < 12) {
        // Probabilistic attack: larger herbivore groups reduce success chance
        const groupSize = this.world.getCreaturesNear(closest.pos.x, closest.pos.y, 50)
          .filter(c => c.type === 'herbivore' && c.alive).length;
        const attackProb = 1 / (1 + groupSize * 0.4);
        if (Math.random() < attackProb) {
          closest.alive = false;
          this.energy = Math.min(this.maxEnergy, this.energy + 80);
          reward += 5.0;
        } else {
          reward -= 0.1; // failed attack cost
        }
      }
    }

    const otherPreds = nearby.filter(c => c !== this && c.type === 'predator' && c.alive);
    if (otherPreds.length > 2) reward -= 0.2;

    const tile = this.world.getTileAt(this.pos.x, this.pos.y);
    if (tile && tile.type === 2) reward -= 0.5;

    // Small bonus for moving — encourages active hunting
    if (this.vel.length() > 5) reward += 0.01;

    return reward;
  }
}
