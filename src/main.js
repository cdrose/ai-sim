import * as tf from '@tensorflow/tfjs';
import { World } from './world/World.js';
import { Renderer } from './world/Renderer.js';
import { Herbivore } from './creatures/Herbivore.js';
import { Predator } from './creatures/Predator.js';
import { Toolbar } from './ui/Toolbar.js';
import { HUD } from './ui/HUD.js';
import { Controls } from './ui/Controls.js';
import { LossChart } from './ui/LossChart.js';
import { ModelInspector } from './ui/ModelInspector.js';
import { DebugConsole } from './ui/DebugConsole.js';

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
const inspector = new ModelInspector(Herbivore.agent, Predator.agent);
document.getElementById('btn-inspect').addEventListener('click', () => inspector.open());

const debugConsole = new DebugConsole(document.getElementById('debug-console'));

// Log every Nth training step to avoid flooding; every step when paused.
const LOG_INTERVAL = 20;
const makeTrainLogger = (label) => (s) => {
  if (!simPaused && s.stepCount % LOG_INTERVAL !== 0) return;
  const ac = s.actionCounts.map((n, i) => `${i}:${n}`).join(' ');
  DebugConsole.log('TRAIN',
    `${label} step:${s.stepCount} loss:${s.loss.toFixed(4)} ε:${s.epsilon.toFixed(3)}\n` +
    `  buf:${s.bufferSize}/${s.bufferMax} (priority pool:${s.prioritySize})\n` +
    `  batch(${s.batchSize}) priority:${s.nPriority} uniform:${s.batchSize - s.nPriority}\n` +
    `  reward μ=${s.rewardMean.toFixed(3)} σ=${s.rewardStd.toFixed(3)} ` +
    `[${s.rewardMin.toFixed(2)}, ${s.rewardMax.toFixed(2)}]\n` +
    `  Q-spread:${s.qSpreadMean.toFixed(4)}  food-visible:${(s.foodVisibleFrac*100).toFixed(0)}%\n` +
    `  actions: ${ac}`
  );
};
Herbivore.agent.onTrainStep = makeTrainLogger('HERB');
Predator.agent.onTrainStep  = makeTrainLogger('PRED');

// Spawn a creature near an existing one of the same type (if any exist),
// otherwise fall back to a random position. Keeps populations spatially
// cohesive rather than scattering randomly across the world.
function spawnNear(CreatureClass, existing, world, spreadTiles = 40) {
  if (existing.length > 0) {
    const parent = existing[Math.floor(Math.random() * existing.length)];
    const spread = spreadTiles * world.tileSize;
    const x = Math.max(0, Math.min((world.gridW - 1) * world.tileSize,
      parent.pos.x + (Math.random() - 0.5) * 2 * spread));
    const y = Math.max(0, Math.min((world.gridH - 1) * world.tileSize,
      parent.pos.y + (Math.random() - 0.5) * 2 * spread));
    return new CreatureClass(x, y, world);
  }
  return new CreatureClass(
    Math.random() * world.gridW * world.tileSize,
    Math.random() * world.gridH * world.tileSize,
    world
  );
}


let simPaused   = false;
let stepOnce    = false;

debugConsole.onPauseToggle = (isPaused) => {
  simPaused = isPaused;
};
debugConsole.onStep = () => {
  stepOnce = true;
};

for (let i = 0; i < 70; i++) {
  const x = Math.random() * gridW * TILE_SIZE;
  const y = Math.random() * gridH * TILE_SIZE;
  world.addCreature(new Herbivore(x, y, world));
}
for (let i = 0; i < 16; i++) {
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

  const shouldTick = !simPaused || stepOnce;
  if (stepOnce) stepOnce = false;

  if (shouldTick) {
    const dt = Math.min(rawDt * simSpeed, 0.1);

    for (const creature of [...world.creatures]) {
      if (creature.alive) creature.think();
    }

    // Fire-and-forget training
    Herbivore.agent?.trainStep();
    Predator.agent?.trainStep();

    // Feed loss values into charts
    if (Herbivore.agent?.lastLoss) herbChart.addLoss(Herbivore.agent.lastLoss);
    if (Predator.agent?.lastLoss)  predChart.addLoss(Predator.agent.lastLoss);

    world.step(dt);

    world.creatures = world.creatures.filter(c => c.alive);

    const herbs = world.creatures.filter(c => c.type === 'herbivore' && c.alive);
    const preds = world.creatures.filter(c => c.type === 'predator' && c.alive);

    if (herbs.length < 20) {
      for (let i = 0; i < 20; i++)
        world.addCreature(spawnNear(Herbivore, herbs, world));
    }
    if (preds.length < 5) {
      for (let i = 0; i < 5; i++)
        world.addCreature(spawnNear(Predator, preds, world));
    }
  }

  renderer.render(toolbar.activeTool);
  hud.update(world, Herbivore.agent, Predator.agent);
  herbChart.render();
  predChart.render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
