import { TileType } from '../world/World.js';
import { Herbivore } from '../creatures/Herbivore.js';
import { Predator } from '../creatures/Predator.js';

export class Toolbar {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.world = world;
    this.activeTool = 'food';
    this.isDrawing = false;

    canvas.addEventListener('mousedown', e => { this.isDrawing = true; this.use(e); });
    canvas.addEventListener('mousemove', e => { if (this.isDrawing) this.use(e); });
    canvas.addEventListener('mouseup', () => { this.isDrawing = false; });

    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.dataset.tool;
        if (this.activeTool === 'clear') {
          this.world.creatures = [];
        }
      });
    });
  }

  use(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tx = Math.floor(x / this.world.tileSize);
    const ty = Math.floor(y / this.world.tileSize);
    const tile = this.world.getTile(tx, ty);
    if (!tile) return;

    switch (this.activeTool) {
      case 'food':
        this.world.addFood(tx, ty);
        break;
      case 'erase':
        this.world.removeFood(tx, ty);
        break;
      case 'grass':
        tile.type = TileType.GRASS;
        break;
      case 'water':
        tile.type = TileType.WATER;
        break;
      case 'danger':
        tile.type = TileType.DANGER;
        break;
      case 'spawnHerb':
        this.world.addCreature(new Herbivore(x, y, this.world));
        break;
      case 'spawnPred':
        this.world.addCreature(new Predator(x, y, this.world));
        break;
    }
  }
}
