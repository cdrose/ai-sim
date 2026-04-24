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
    this.prevDistToPrey = null;
  }

  getState() {
    return this.world.getLocalGrid(this.pos.x, this.pos.y, 13, 6, {
      energyFraction: this.energy / this.maxEnergy
    });
  }

  // Returns the action that steers toward the nearest visible prey, or null if none nearby
  _getSeekAction() {
    const nearby = this.world.getCreaturesNear(this.pos.x, this.pos.y, 250);
    const prey = nearby.filter(c => c.type === 'herbivore' && c.alive);
    if (prey.length === 0) return null;

    const closest = prey.reduce((a, b) =>
      a.pos.distTo(this.pos) < b.pos.distTo(this.pos) ? a : b
    );
    const dx = closest.pos.x - this.pos.x;
    const dy = closest.pos.y - this.pos.y;
    const targetAngle = Math.atan2(dy, dx);

    let angleDiff = targetAngle - this.facing;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    if (Math.abs(angleDiff) < Math.PI / 6) return 0; // roughly aligned — go forward
    return angleDiff < 0 ? 1 : 2;                    // turn left or right
  }

  think() {
    const state = this.getState();

    // Biased exploration: when epsilon is high, use heuristic seek instead of pure random
    let action;
    if (Math.random() < this.agent.epsilon) {
      const seekAction = this._getSeekAction();
      // 70% heuristic (if prey visible), else random
      action = (seekAction !== null && Math.random() < 0.7)
        ? seekAction
        : Math.floor(Math.random() * this.agent.numActions);
    } else {
      action = this.agent.getGreedyAction(state);
    }

    if (this.lastState !== null && this.agent) {
      const reward = this.computeReward();
      this.agent.remember(this.lastState, this.lastAction, reward, state, false);
    }

    if (this.lastState) this.lastState.dispose();
    this.lastState = state;
    this.lastAction = action;
    this.applyAction(action);
  }

  computeReward() {
    let reward = 0;

    const nearby = this.world.getCreaturesNear(this.pos.x, this.pos.y, 80);
    const prey = nearby.filter(c => c.type === 'herbivore' && c.alive);

    if (prey.length > 0) {
      const closest = prey.reduce((a, b) =>
        a.pos.distTo(this.pos) < b.pos.distTo(this.pos) ? a : b
      );
      const currDist = closest.pos.distTo(this.pos);

      // Dense approach reward: reward closing distance to nearest prey
      if (this.prevDistToPrey !== null) {
        const delta = this.prevDistToPrey - currDist;
        reward += Math.max(-0.5, Math.min(0.5, delta * 0.05));
      }
      this.prevDistToPrey = currDist;

      reward += 0.3; // prey in range

      if (currDist < 20) {
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

    if (this.vel.length() > 5) reward += 0.01;

    return reward;
  }
}
