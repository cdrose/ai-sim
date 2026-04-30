import { Vec2 } from '../utils/Vec2.js';

// 8 discrete heading angles in degrees (E=0, increases clockwise in screen coords)
const DIRS = [0, 45, 90, 135, 180, 225, 270, 315];
const DEG2RAD = Math.PI / 180;

export class Creature {
  constructor(x, y, world) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(0, 0);
    // Discrete heading: index into DIRS (0=E, 1=SE, 2=S, ...)
    this.dirIndex = Math.floor(Math.random() * 8);
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

  // Returns sin and cos of current heading for state encoding
  get headingSin() { return Math.sin(DIRS[this.dirIndex] * DEG2RAD); }
  get headingCos() { return Math.cos(DIRS[this.dirIndex] * DEG2RAD); }

  getState() {
    return this.world.getLocalGrid(this.pos.x, this.pos.y, 7, 5, {
      energyFraction: this.energy / this.maxEnergy,
      headingSin: this.headingSin,
      headingCos: this.headingCos,
    });
  }

  applyAction(action) {
    // Actions relative to current heading:
    // 0 = straight, 1 = left 45°, 2 = left 90°, 3 = right 45°, 4 = right 90°
    const turns = [0, -1, -2, 1, 2]; // steps of 45° (negative = CCW = left on screen)
    this.dirIndex = ((this.dirIndex + turns[action]) % 8 + 8) % 8;
    const rad = DIRS[this.dirIndex] * DEG2RAD;
    const speed = this.speed || 25;
    this.vel = new Vec2(Math.cos(rad), Math.sin(rad)).scale(speed);
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
