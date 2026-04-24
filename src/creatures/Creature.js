import { Vec2 } from '../utils/Vec2.js';

const TURN_RATE = Math.PI / 4; // 45 degrees per action

export class Creature {
  constructor(x, y, world) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(0, 0);
    this.facing = Math.random() * Math.PI * 2; // random initial heading
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
    return this.world.getLocalGrid(this.pos.x, this.pos.y, 7, 5, { energyFraction: this.energy / this.maxEnergy });
  }

  applyAction(action) {
    // Actions: 0=forward, 1=turn-left+forward, 2=turn-right+forward, 3=slow, 4=stay
    const speed = this.speed || 25;
    switch (action) {
      case 0: // forward
        this.vel = new Vec2(Math.cos(this.facing), Math.sin(this.facing)).scale(speed);
        break;
      case 1: // turn left and move
        this.facing -= TURN_RATE;
        this.vel = new Vec2(Math.cos(this.facing), Math.sin(this.facing)).scale(speed);
        break;
      case 2: // turn right and move
        this.facing += TURN_RATE;
        this.vel = new Vec2(Math.cos(this.facing), Math.sin(this.facing)).scale(speed);
        break;
      case 3: // slow / brake
        this.vel = this.vel.scale(0.3);
        break;
      case 4: // stay
        this.vel = new Vec2(0, 0);
        break;
    }
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
