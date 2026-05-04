import { Creature } from './Creature.js';
import { DQNAgent } from '../ai/DQNAgent.js';

export class Predator extends Creature {
  static agent = new DQNAgent({ gridSize: 13, numChannels: 5, numActions: 8, bufferSize: 10000 });

  constructor(x, y, world) {
    super(x, y, world);
    this.type = 'predator';
    this.energyDrain = 1.5;
    this.maxEnergy = 150;
    this.energy = 150;
    this.moveDuration = 0.18; // ~5.5 tiles/second (faster than herbivore)
    this.agent = Predator.agent;
    this.prevDistToPrey = null;
  }

  getState() {
    return this.world.getLocalGrid(this.tileX, this.tileY, 13, 5, {
      energyFraction: this.energy / this.maxEnergy,
    });
  }

  computeReward() {
    let reward = 0;
    const hungry = this.energy < this.maxEnergy * 0.8;

    const nearby = this.world.getCreaturesNear(this.pos.x, this.pos.y, 80);
    const prey = nearby.filter(c => c.type === 'herbivore' && c.alive);

    if (prey.length > 0 && hungry) {
      const closest = prey.reduce((a, b) =>
        a.pos.distTo(this.pos) < b.pos.distTo(this.pos) ? a : b
      );
      const currDist = closest.pos.distTo(this.pos);
      const currDistTiles = currDist / this.world.tileSize; // convert to tile units

      // Approach reward per tile arrival (tile-unit delta)
      if (this.prevDistToPrey !== null) {
        const delta = this.prevDistToPrey - currDistTiles;
        reward += Math.max(-0.5, Math.min(0.5, delta * 0.5));
      }
      this.prevDistToPrey = currDistTiles;

      reward += 0.3; // prey in range

      // Attack range: within 1.5 tiles
      if (currDist < this.world.tileSize * 1.5) {
        const groupSize = this.world.getCreaturesNear(closest.pos.x, closest.pos.y, 50)
          .filter(c => c.type === 'herbivore' && c.alive).length;
        const attackProb = 1 / (1 + groupSize * 0.4);
        if (Math.random() < attackProb) {
          closest.alive = false;
          this.energy = Math.min(this.maxEnergy, this.energy + 80);
          reward += 5.0;
        } else {
          reward -= 0.1;
        }
      }
    } else {
      this.prevDistToPrey = null;
    }

    const otherPreds = nearby.filter(c => c !== this && c.type === 'predator' && c.alive);
    if (otherPreds.length > 2) reward -= 0.2;

    const tile = this.world.getTileAt(this.pos.x, this.pos.y);
    if (tile && tile.type === 2) reward -= 0.5;

    return reward;
  }
}
