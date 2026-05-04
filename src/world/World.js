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
    this.foodDensity = 0.015;   // fraction of GRASS tiles with food (live-adjustable)
    this.foodRegrowTime = 15;   // seconds before an eaten tile regrows (live-adjustable)
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

    this._scatterFoodClustered();
  }

  // Clear existing food sources and re-scatter at current foodDensity.
  // Safe to call while the sim is running — creatures keep their state.
  resetFood() {
    for (const key of this.foodSources) {
      const [tx, ty] = key.split(',').map(Number);
      const tile = this.getTile(tx, ty);
      if (tile) { tile.food = 0; tile.foodTimer = 0; }
    }
    this.foodSources.clear();
    this._scatterFoodClustered();
  }

  // Scatter food in clusters so there are food-rich zones separated by
  // sparse areas. Creatures must explore to find new patches rather than
  // waiting in one spot. Expected total food count matches
  // foodDensity * grassTileCount regardless of cluster layout.
  _scatterFoodClustered() {
    const grassTiles = [];
    for (let tx = 0; tx < this.gridW; tx++) {
      for (let ty = 0; ty < this.gridH; ty++) {
        if (this.tiles[tx][ty].type === TileType.GRASS) grassTiles.push([tx, ty]);
      }
    }
    if (grassTiles.length === 0) return;

    const numClusters = Math.max(5, Math.round(grassTiles.length / 2500));
    const clusterRadius = Math.max(10, Math.round(Math.min(this.gridW, this.gridH) * 0.10));

    const centers = Array.from({ length: numClusters }, () =>
      grassTiles[Math.floor(Math.random() * grassTiles.length)]);

    const inCluster = grassTiles.filter(([tx, ty]) =>
      centers.some(([cx, cy]) => Math.hypot(tx - cx, ty - cy) <= clusterRadius));

    // Scale probability so expected food = foodDensity * grassTiles.length
    const prob = Math.min(1, this.foodDensity * grassTiles.length / Math.max(1, inCluster.length));
    for (const [tx, ty] of inCluster) {
      if (Math.random() < prob) this.addFood(tx, ty);
    }
  }

  // Uniform scatter — kept for tests and fallback use.
  _scatterFood() {
    for (let tx = 0; tx < this.gridW; tx++) {
      for (let ty = 0; ty < this.gridH; ty++) {
        if (this.tiles[tx][ty].type === TileType.GRASS && Math.random() < this.foodDensity) {
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
    // Regrow food on food sources using live-adjustable regrow time
    for (const key of this.foodSources) {
      const [tx, ty] = key.split(',').map(Number);
      const tile = this.getTile(tx, ty);
      if (tile && tile.food === 0) {
        tile.foodTimer += dt;
        if (tile.foodTimer >= this.foodRegrowTime) {
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

  getLocalGrid(tileX, tileY, gridSize, numChannels = 5, options = {}) {
    const half = Math.floor(gridSize / 2);
    const data = new Float32Array(gridSize * gridSize * numChannels);

    const energyFraction = options.energyFraction !== undefined ? options.energyFraction : 1.0;

    // Pre-bucket creatures in the visible window — O(N) instead of O(N × gridSize²)
    const tileMinX = tileX - half;
    const tileMinY = tileY - half;
    const creatureMap = new Map();
    for (const c of this.creatures) {
      if (!c.alive) continue;
      if (c.tileX < tileMinX || c.tileX > tileX + half) continue;
      if (c.tileY < tileMinY || c.tileY > tileY + half) continue;
      const key = `${c.tileX},${c.tileY}`;
      const entry = creatureMap.get(key) || { herb: false, pred: false };
      if (c.type === 'herbivore') entry.herb = true;
      else if (c.type === 'predator') entry.pred = true;
      creatureMap.set(key, entry);
    }

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const tx = tileX + gx - half;
        const ty = tileY + gy - half;
        const base = (gy * gridSize + gx) * numChannels;

        const tile = this.getTile(tx, ty);
        if (!tile) {
          data[base + 0] = 1.0; // OOB = danger
          if (numChannels >= 5) data[base + 4] = energyFraction;
          continue;
        }

        data[base + 0] = tile.type / 2.0;
        data[base + 1] = tile.food > 0 ? 1.0 : 0.0;

        const entry = creatureMap.get(`${tx},${ty}`);
        data[base + 2] = entry?.herb ? 1.0 : 0.0;
        data[base + 3] = entry?.pred ? 1.0 : 0.0;

        if (numChannels >= 5) data[base + 4] = energyFraction;
      }
    }

    return tf.tensor4d(data, [1, gridSize, gridSize, numChannels]);
  }
}
