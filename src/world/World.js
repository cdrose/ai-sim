import * as tf from '@tensorflow/tfjs';
import { Vec2 } from '../utils/Vec2.js';

export const TileType = { GRASS: 0, WATER: 1, DANGER: 2 };

export class World {
  constructor(gridW, gridH, tileSize) {
    this.gridW = gridW;
    this.gridH = gridH;
    this.tileSize = tileSize;
    this.tiles = [];
    this.creatures = [];
    this.foodSources = new Set();
  }

  init() {
    // Initialize all tiles as GRASS
    for (let tx = 0; tx < this.gridW; tx++) {
      this.tiles[tx] = [];
      for (let ty = 0; ty < this.gridH; ty++) {
        this.tiles[tx][ty] = { type: TileType.GRASS, food: 0, foodTimer: 0 };
      }
    }

    // Place 3-5 water blobs
    const numWater = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numWater; i++) {
      this._placeBlob(TileType.WATER, 20);
    }

    // Place 2-3 danger zones
    const numDanger = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numDanger; i++) {
      this._placeBlob(TileType.DANGER, 15);
    }

    // Scatter food on 15% of GRASS tiles
    for (let tx = 0; tx < this.gridW; tx++) {
      for (let ty = 0; ty < this.gridH; ty++) {
        if (this.tiles[tx][ty].type === TileType.GRASS && Math.random() < 0.15) {
          this.addFood(tx, ty);
        }
      }
    }
  }

  _placeBlob(type, size) {
    const cx = Math.floor(Math.random() * this.gridW);
    const cy = Math.floor(Math.random() * this.gridH);
    for (let i = 0; i < size; i++) {
      const tx = cx + Math.floor((Math.random() - 0.5) * 10);
      const ty = cy + Math.floor((Math.random() - 0.5) * 10);
      if (tx >= 0 && tx < this.gridW && ty >= 0 && ty < this.gridH) {
        this.tiles[tx][ty].type = type;
      }
    }
  }

  step(dt) {
    // Regrow food on food sources
    const foodThreshold = 5;
    for (const key of this.foodSources) {
      const [tx, ty] = key.split(',').map(Number);
      const tile = this.getTile(tx, ty);
      if (tile && tile.food === 0) {
        tile.foodTimer += dt;
        if (tile.foodTimer >= foodThreshold) {
          tile.food = 1;
          tile.foodTimer = 0;
        }
      }
    }

    // Tick all creatures (movement + energy drain)
    for (const creature of this.creatures) {
      if (creature.alive) {
        creature.step(dt);
      }
    }
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= this.gridW || ty < 0 || ty >= this.gridH) return null;
    return this.tiles[tx][ty];
  }

  getTileAt(worldX, worldY) {
    const tx = Math.floor(worldX / this.tileSize);
    const ty = Math.floor(worldY / this.tileSize);
    return this.getTile(tx, ty);
  }

  setTile(tx, ty, type) {
    const tile = this.getTile(tx, ty);
    if (tile) tile.type = type;
  }

  addFood(tx, ty) {
    const tile = this.getTile(tx, ty);
    if (tile) {
      tile.food = 1;
      this.foodSources.add(`${tx},${ty}`);
    }
  }

  removeFood(tx, ty) {
    const tile = this.getTile(tx, ty);
    if (tile) {
      tile.food = 0;
      tile.foodTimer = 0;
      this.foodSources.delete(`${tx},${ty}`);
    }
  }

  addCreature(creature) {
    this.creatures.push(creature);
  }

  removeCreature(creature) {
    const idx = this.creatures.indexOf(creature);
    if (idx !== -1) this.creatures.splice(idx, 1);
  }

  getCreaturesNear(x, y, radius) {
    const origin = new Vec2(x, y);
    return this.creatures.filter(c => c.alive && c.pos.distTo(origin) <= radius);
  }

  getLocalGrid(cx, cy, gridSize) {
    const half = Math.floor(gridSize / 2);
    const data = new Float32Array(gridSize * gridSize * 4);

    const centerTx = Math.floor(cx / this.tileSize);
    const centerTy = Math.floor(cy / this.tileSize);

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const tx = centerTx + gx - half;
        const ty = centerTy + gy - half;
        const base = (gy * gridSize + gx) * 4;

        const tile = this.getTile(tx, ty);
        if (!tile) {
          data[base + 0] = 1.0; // OOB = danger
          continue;
        }

        data[base + 0] = tile.type / 2.0;
        data[base + 1] = tile.food > 0 ? 1.0 : 0.0;

        const creaturesOnTile = this.creatures.filter(c =>
          c.alive &&
          Math.floor(c.pos.x / this.tileSize) === tx &&
          Math.floor(c.pos.y / this.tileSize) === ty
        );
        data[base + 2] = creaturesOnTile.some(c => c.type === 'herbivore') ? 1.0 : 0.0;
        data[base + 3] = creaturesOnTile.some(c => c.type === 'predator') ? 1.0 : 0.0;
      }
    }

    return tf.tensor4d(data, [1, gridSize, gridSize, 4]);
  }
}
