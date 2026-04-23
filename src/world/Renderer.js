import { TileType } from './World.js';

const COLORS = {
  [TileType.GRASS]: '#2d5a27',
  [TileType.WATER]: '#1a6b8a',
  [TileType.DANGER]: '#8b1a1a',
  FOOD: '#90ee90',
  HERBIVORE: '#4fc3f7',
  PREDATOR: '#ff7043',
  SELECTED: '#ffffff',
};

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
  }

  render(selectedTool) {
    const { ctx, world } = this;
    const { tileSize, gridW, gridH } = world;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw tiles
    for (let tx = 0; tx < gridW; tx++) {
      for (let ty = 0; ty < gridH; ty++) {
        const tile = world.tiles[tx][ty];
        ctx.fillStyle = COLORS[tile.type] || COLORS[TileType.GRASS];
        ctx.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);

        // Draw food as small circle
        if (tile.food > 0) {
          ctx.fillStyle = COLORS.FOOD;
          ctx.beginPath();
          ctx.arc(
            tx * tileSize + tileSize / 2,
            ty * tileSize + tileSize / 2,
            tileSize * 0.25,
            0, Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // Draw creatures
    for (const creature of world.creatures) {
      if (!creature.alive) continue;

      const { x, y } = creature.pos;
      const radius = 4;
      const color = creature.type === 'predator' ? COLORS.PREDATOR : COLORS.HERBIVORE;

      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Direction indicator
      ctx.strokeStyle = COLORS.SELECTED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(creature.facing) * radius * 1.8,
        y + Math.sin(creature.facing) * radius * 1.8
      );
      ctx.stroke();

      // Energy bar above creature
      const barW = 10;
      const barH = 2;
      const energyPct = creature.energy / creature.maxEnergy;
      ctx.fillStyle = '#333';
      ctx.fillRect(x - barW / 2, y - radius - 4, barW, barH);
      ctx.fillStyle = energyPct > 0.5 ? '#4caf50' : energyPct > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(x - barW / 2, y - radius - 4, barW * energyPct, barH);
    }
  }
}
