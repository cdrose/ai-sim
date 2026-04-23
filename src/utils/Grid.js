export function worldToTile(x, y, tileSize) {
  return { tx: Math.floor(x / tileSize), ty: Math.floor(y / tileSize) };
}

export function tileToWorld(tx, ty, tileSize) {
  return { x: (tx + 0.5) * tileSize, y: (ty + 0.5) * tileSize };
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function getTilesInRadius(cx, cy, radius, gridW, gridH) {
  const tiles = [];
  for (let ty = 0; ty < gridH; ty++) {
    for (let tx = 0; tx < gridW; tx++) {
      const dx = tx - cx;
      const dy = ty - cy;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        tiles.push({ tx, ty });
      }
    }
  }
  return tiles;
}
