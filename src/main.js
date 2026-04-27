import * as tf from '@tensorflow/tfjs';
import { World } from './world/World.js';
import { Renderer } from './world/Renderer.js';
import { Herbivore } from './creatures/Herbivore.js';
import { Predator } from './creatures/Predator.js';
import { Toolbar } from './ui/Toolbar.js';
import { HUD } from './ui/HUD.js';
import { Controls } from './ui/Controls.js';
import { LossChart } from './ui/LossChart.js';

const canvas = document.getElementById('sim-canvas');

function resizeCanvas() {
  const sidebar = document.getElementById('sidebar');
  canvas.width = window.innerWidth - sidebar.offsetWidth - 4;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const TILE_SIZE = 10;
const gridW = Math.floor(canvas.width / TILE_SIZE);
const gridH = Math.floor(canvas.height / TILE_SIZE);

const world = new World(gridW, gridH, TILE_SIZE);
world.init();

const renderer = new Renderer(canvas, world);
const toolbar = new Toolbar(canvas, world);
const hud = new HUD(document.getElementById('hud'));
const controls = new Controls(document.getElementById('controls'), world);
const herbChart = new LossChart(document.getElementById('chart-herb'), '🌿 Herb Loss', '#4caf50');
const predChart = new LossChart(document.getElementById('chart-pred'), '🦊 Pred Loss', '#ff7043');

for (let i = 0; i < 30; i++) {
  const x = Math.random() * gridW * TILE_SIZE;
  const y = Math.random() * gridH * TILE_SIZE;
  world.addCreature(new Herbivore(x, y, world));
}
for (let i = 0; i < 8; i++) {
  const x = Math.random() * gridW * TILE_SIZE;
  const y = Math.random() * gridH * TILE_SIZE;
  world.addCreature(new Predator(x, y, world));
}

controls.wireAgents(Herbivore.agent, Predator.agent);

let lastTime = performance.now();
let simSpeed = 1;

controls.onSpeedChange = (s) => { simSpeed = s; };

async function loop(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = Math.min(rawDt * simSpeed, 0.1);

  for (const creature of [...world.creatures]) {
    if (creature.alive) {
      creature.think();
    }
  }

  // Fire-and-forget training
  Herbivore.agent?.trainStep();
  Predator.agent?.trainStep();

  // Feed loss values into charts
  if (Herbivore.agent?.lastLoss) herbChart.addLoss(Herbivore.agent.lastLoss);
  if (Predator.agent?.lastLoss) predChart.addLoss(Predator.agent.lastLoss);

  world.step(dt);

  world.creatures = world.creatures.filter(c => c.alive);

  if (world.creatures.filter(c => c.type === 'herbivore').length < 5) {
    for (let i = 0; i < 10; i++) {
      world.addCreature(new Herbivore(
        Math.random() * gridW * TILE_SIZE,
        Math.random() * gridH * TILE_SIZE,
        world
      ));
    }
  }
  if (world.creatures.filter(c => c.type === 'predator').length < 2) {
    for (let i = 0; i < 3; i++) {
      world.addCreature(new Predator(
        Math.random() * gridW * TILE_SIZE,
        Math.random() * gridH * TILE_SIZE,
        world
      ));
    }
  }

  renderer.render(toolbar.activeTool);
  hud.update(world, Herbivore.agent, Predator.agent);
  herbChart.render();
  predChart.render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
