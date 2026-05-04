import { Creature } from './Creature.js';
import { DQNAgent } from '../ai/DQNAgent.js';
import { DebugConsole } from '../ui/DebugConsole.js';

export class Herbivore extends Creature {
  static agent = new DQNAgent({ gridSize: 13, numChannels: 5, numActions: 8, bufferSize: 20000 });

  constructor(x, y, world) {
    super(x, y, world);
    this.type = 'herbivore';
    this.energyDrain = 3;
    this.moveDuration = 0.5; // 2 tiles/second
    this.agent = Herbivore.agent;
    this._targetFood = null; // { tx, ty, dist } — locked-on food tile; switches only when eaten/lost
    this._dbgStep = 0; // throttle for approach-reward logging
  }

  getState() {
    return this.world.getLocalGrid(this.tileX, this.tileY, 13, 5, {
      energyFraction: this.energy / this.maxEnergy,
    });
  }

  // Returns the nearest food tile within searchRadius as { tx, ty, dist }.
  _getNearestFood(searchRadius = 6) {
    let nearest = null;
    let minDist = Infinity;
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const tile = this.world.getTile(this.tileX + dx, this.tileY + dy);
        if (tile && tile.food > 0) {
          const d = Math.hypot(dx, dy);
          if (d < minDist) { minDist = d; nearest = { tx: this.tileX + dx, ty: this.tileY + dy, dist: d }; }
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
        this._targetFood = null; // target consumed
        DebugConsole.log('EVENT',
          `HERB ate food  +${(2.0 * hungerFactor).toFixed(2)}  ` +
          `energy:${this.energy.toFixed(0)}  tile:(${this.tileX},${this.tileY})`);
      }
      // No reward or eating when sated — leave food for others
    } else if (hungry) {
      // Approach reward — locked onto a specific tile for directional consistency.
      // Only switch target when the current one is eaten or drifts out of range.
      const searchRadius = 6;
      if (this._targetFood !== null) {
        const ttile = this.world.getTile(this._targetFood.tx, this._targetFood.ty);
        const dx = this._targetFood.tx - this.tileX;
        const dy = this._targetFood.ty - this.tileY;
        const currentDist = Math.hypot(dx, dy);
        const stillValid = ttile && ttile.food > 0 && currentDist <= searchRadius;

        if (stillValid) {
          const prevDist = this._targetFood.dist;
          const delta = prevDist - currentDist; // positive = approaching
          const approachReward = Math.max(-0.5, Math.min(0.5, delta * 0.5));
          reward += approachReward;
          this._targetFood = { tx: this._targetFood.tx, ty: this._targetFood.ty, dist: currentDist };
          this._dbgStep++;
          if (this._dbgStep % 50 === 0) {
            DebugConsole.log('EVENT',
              `HERB approach  delta:${delta.toFixed(2)}  reward:${approachReward.toFixed(3)}  ` +
              `dist:${currentDist.toFixed(1)}  prev:${prevDist.toFixed(1)}`);
          }
        } else {
          // Previous target gone/out-of-range — re-acquire nearest
          this._targetFood = this._getNearestFood();
          this._dbgStep++;
          if (this._targetFood && this._dbgStep % 50 === 0) {
            DebugConsole.log('EVENT',
              `HERB new-target  dist:${this._targetFood.dist.toFixed(1)}  ` +
              `tile:(${this._targetFood.tx},${this._targetFood.ty})`);
          }
        }
      } else {
        // No target yet — acquire nearest food
        this._targetFood = this._getNearestFood();
        this._dbgStep++;
        if (this._targetFood && this._dbgStep % 50 === 0) {
          DebugConsole.log('EVENT',
            `HERB food-sight  dist:${this._targetFood.dist.toFixed(1)}  tile:(${this.tileX},${this.tileY})`);
        }
        if (!this._targetFood && this._dbgStep % 200 === 0) {
          DebugConsole.log('EVENT',
            `HERB no-food-visible  tile:(${this.tileX},${this.tileY})  energy:${this.energy.toFixed(0)}`);
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
