import { Vec2 } from '../utils/Vec2.js';

export class Creature {
  constructor(x, y, world) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(0, 0);
    this.facing = 0;
    this.energy = 100;
    this.maxEnergy = 100;
    this.age = 0;
    this.alive = true;
    this.world = world;
    this.brain = null;
    this.agent = null;
    this.lastState = null;
    this.lastAction = null;
  }

  getState() {
    return this.world.getLocalGrid(this.pos.x, this.pos.y, 7);
  }

  applyAction(action) {
    const speed = 20;
    const moves = [
      new Vec2(0, -1), new Vec2(0, 1),
      new Vec2(-1, 0), new Vec2(1, 0),
      new Vec2(0, 0)
    ];
    this.vel = moves[action].scale(speed);
    if (action < 4) this.facing = Math.atan2(this.vel.y, this.vel.x);
  }

  step(dt) {
    if (!this.alive) return 0;
    this.age += dt;
    const drain = this.energyDrain || 2;
    this.energy -= dt * drain;
    if (this.energy <= 0) { this.alive = false; return 0; }

    this.pos = this.pos.add(this.vel.scale(dt));

    const maxX = this.world.gridW * this.world.tileSize;
    const maxY = this.world.gridH * this.world.tileSize;
    this.pos.x = Math.max(0, Math.min(maxX - 1, this.pos.x));
    this.pos.y = Math.max(0, Math.min(maxY - 1, this.pos.y));

    const atWall = this.pos.x <= 1 || this.pos.y <= 1 ||
      this.pos.x >= maxX - 2 || this.pos.y >= maxY - 2;

    return atWall ? -0.1 : 0;
  }

  computeReward() { return 0; }

  think() {
    const state = this.getState();
    const action = this.agent ? this.agent.selectAction(state) : Math.floor(Math.random() * 5);

    if (this.lastState !== null && this.agent) {
      const reward = this.computeReward();
      this.agent.remember(this.lastState, this.lastAction, reward, state, false);
    }

    // Dispose old state tensor to prevent memory leak
    if (this.lastState) this.lastState.dispose();

    this.lastState = state;
    this.lastAction = action;
    this.applyAction(action);
  }
}
