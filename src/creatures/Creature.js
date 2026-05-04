import { Vec2 } from '../utils/Vec2.js';

// 8 absolute world directions: N, NE, E, SE, S, SW, W, NW
const DIR_OFFSETS = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];

export class Creature {
  constructor(x, y, world) {
    this.world = world;
    // Logical tile position (integer grid coords)
    this.tileX = Math.floor(x / world.tileSize);
    this.tileY = Math.floor(y / world.tileSize);
    // Pixel position snapped to tile centre for rendering
    this.pos = new Vec2(
      (this.tileX + 0.5) * world.tileSize,
      (this.tileY + 0.5) * world.tileSize
    );
    this.targetTileX = this.tileX;
    this.targetTileY = this.tileY;
    this._moveDx = 0;
    this._moveDy = 0;
    this.isMoving = false;
    this.moveProgress = 0;
    this.moveDuration = 0.25; // seconds per tile; overridden by subclass
    // Unit direction of last/current move — reserved for future momentum reward
    this.velX = 0;
    this.velY = 0;
    this.energy = 100;
    this.maxEnergy = 100;
    this.age = 0;
    this.alive = true;
    this.brain = null;
    this.agent = null;
    this.lastState = null;
    this.lastAction = null;
  }

  // Direction indicator for renderer — angle of last move in radians
  get facing() { return Math.atan2(this.velY, this.velX); }

  getState() {
    return this.world.getLocalGrid(this.tileX, this.tileY, 7, 5, {
      energyFraction: this.energy / this.maxEnergy,
    });
  }

  applyAction(action) {
    const [dx, dy] = DIR_OFFSETS[action];
    const tx = this.tileX + dx;
    const ty = this.tileY + dy;

    if (tx >= 0 && tx < this.world.gridW && ty >= 0 && ty < this.world.gridH) {
      this.targetTileX = tx;
      this.targetTileY = ty;
      const len = Math.hypot(dx, dy);
      this.velX = dx / len;
      this.velY = dy / len;
      this._moveDx = dx;
      this._moveDy = dy;
    } else {
      // OOB — stay at current tile; still run the move timer to enforce decision cadence
      this.targetTileX = this.tileX;
      this.targetTileY = this.tileY;
      this.velX = 0;
      this.velY = 0;
      this._moveDx = 0;
      this._moveDy = 0;
    }
    this.isMoving = true;
    this.moveProgress = 0;
  }

  step(dt) {
    if (!this.alive) return;
    this.age += dt;
    this.energy -= dt * (this.energyDrain || 2);
    if (this.energy <= 0) { this.alive = false; return; }

    if (!this.isMoving) return;

    this.moveProgress += dt / this.moveDuration;
    if (this.moveProgress >= 1.0) {
      this.tileX = this.targetTileX;
      this.tileY = this.targetTileY;
      const ts = this.world.tileSize;
      this.pos.x = (this.tileX + 0.5) * ts;
      this.pos.y = (this.tileY + 0.5) * ts;
      this.moveProgress = 1.0;
      this.isMoving = false;
    } else {
      const ts = this.world.tileSize;
      this.pos.x = (this.tileX + this.moveProgress * this._moveDx + 0.5) * ts;
      this.pos.y = (this.tileY + this.moveProgress * this._moveDy + 0.5) * ts;
    }
  }

  computeReward() { return 0; }

  think() {
    if (this.isMoving) return; // only decide when arrived at a tile

    const state = this.getState();
    const numActions = (this.agent && this.agent.numActions) || 8;
    const action = this.agent
      ? this.agent.selectAction(state)
      : Math.floor(Math.random() * numActions);

    if (this.lastState !== null && this.agent) {
      const reward = this.computeReward();
      this.agent.remember(this.lastState, this.lastAction, reward, state, false);
    }

    if (this.lastState) this.lastState.dispose();
    this.lastState = state;
    this.lastAction = action;
    this.applyAction(action);
  }
}
