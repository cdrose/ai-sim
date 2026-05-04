import * as tf from '@tensorflow/tfjs';

// 8 absolute world directions: N, NE, E, SE, S, SW, W, NW
const ACTION_NAMES = ['N ↑', 'NE ↗', 'E →', 'SE ↘', 'S ↓', 'SW ↙', 'W ←', 'NW ↖'];

function herbScenarios() {
  const c = 6; // centre of 13×13
  return [
    { title: 'Food to the North',        expected: 0, overrides: [{gx:c,   gy:c-4, ch:1, val:1}] },
    { title: 'Food to the NE',           expected: 1, overrides: [{gx:c+3, gy:c-3, ch:1, val:1}] },
    { title: 'Food to the East',         expected: 2, overrides: [{gx:c+4, gy:c,   ch:1, val:1}] },
    { title: 'Food to the SE',           expected: 3, overrides: [{gx:c+3, gy:c+3, ch:1, val:1}] },
    { title: 'Food to the South',        expected: 4, overrides: [{gx:c,   gy:c+4, ch:1, val:1}] },
    { title: 'Predator East, food North', expected: 0, overrides: [
      {gx:c+2, gy:c,   ch:3, val:1},
      {gx:c,   gy:c-3, ch:1, val:1},
    ]},
  ];
}

function predScenarios() {
  const c = 6;
  const prey = (gx, gy) => [{gx, gy, ch:2, val:1}];
  return [
    { title: 'Prey to the North',   expected: 0, overrides: prey(c,   c-4) },
    { title: 'Prey to the NE',      expected: 1, overrides: prey(c+3, c-3) },
    { title: 'Prey to the East',    expected: 2, overrides: prey(c+4, c)   },
    { title: 'Prey to the SE',      expected: 3, overrides: prey(c+3, c+3) },
    { title: 'Prey to the West',    expected: 6, overrides: prey(c-4, c)   },
    { title: 'No prey visible',     expected: null, overrides: []           },
  ];
}

function buildTensor(gridSize, numChannels, overrides) {
  const data = new Float32Array(gridSize * gridSize * numChannels);
  // Initialise energy at 40% for all cells
  for (let i = 0; i < gridSize * gridSize; i++) {
    if (numChannels >= 5) data[i * numChannels + 4] = 0.4;
  }
  for (const {gx, gy, ch, val} of overrides) {
    if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {
      data[(gy * gridSize + gx) * numChannels + ch] = val;
    }
  }
  return tf.tensor4d(data, [1, gridSize, gridSize, numChannels]);
}

function runInference(agent, tensor) {
  return tf.tidy(() => {
    const qTensor = agent.brain.predict(tensor);
    return Array.from(qTensor.dataSync());
  });
}

function drawGrid(canvas, gridSize, overrides) {
  const CELL = Math.floor(canvas.width / gridSize);
  const ctx = canvas.getContext('2d');
  const center = Math.floor(gridSize / 2);

  // Build cell lookup
  const cells = {};
  for (const {gx, gy, ch, val} of overrides) {
    const k = `${gx},${gy}`;
    if (!cells[k]) cells[k] = {};
    cells[k][ch] = val;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const cell = cells[`${gx},${gy}`] || {};
      const px = gx * CELL, py = gy * CELL;
      const isCenter = gx === center && gy === center;

      // Background by tile type
      const tileType = cell[0] || 0;
      ctx.fillStyle = tileType >= 0.9 ? '#2a1010' : tileType >= 0.4 ? '#101a2a' : '#0f1f0f';
      ctx.fillRect(px, py, CELL, CELL);

      // Food
      if (cell[1]) {
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
      }
      // Herbivore present
      if (cell[2]) {
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Predator present
      if (cell[3]) {
        ctx.fillStyle = '#ff7043';
        ctx.beginPath();
        ctx.arc(px + CELL / 2, py + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Grid line
      ctx.strokeStyle = '#0a150a';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, CELL, CELL);

      // Self highlight
      if (isCenter) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
      }
    }
  }

  // North indicator — small 'N' label in top-right corner
  ctx.fillStyle = 'rgba(255,255,200,0.5)';
  ctx.font = `${Math.max(7, CELL - 2)}px sans-serif`;
  ctx.fillText('N', canvas.width - CELL + 2, CELL - 2);
}

function renderQBars(container, qValues, expected) {
  const max = Math.max(0.001, ...qValues.map(Math.abs));
  const argmax = qValues.indexOf(Math.max(...qValues));

  container.innerHTML = '';
  qValues.forEach((q, i) => {
    const isMax = i === argmax;
    const isExpected = i === expected;
    const halfPct = (Math.abs(q) / max) * 47;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:3px;margin:2px 0;';

    const lbl = document.createElement('span');
    lbl.style.cssText = `font-size:9px;width:62px;text-align:right;flex-shrink:0;
      color:${isExpected ? '#ffeb3b' : '#777'};`;
    lbl.textContent = (isExpected ? '★ ' : '  ') + ACTION_NAMES[i];

    const bg = document.createElement('div');
    bg.style.cssText = 'flex:1;height:13px;background:#0d1a0d;position:relative;border-radius:2px;overflow:hidden;';

    // Center divider
    const mid = document.createElement('div');
    mid.style.cssText = 'position:absolute;left:50%;top:0;width:1px;height:100%;background:#1e3a1e;';
    bg.appendChild(mid);

    const bar = document.createElement('div');
    const color = isMax ? '#e8f5e9' : (q >= 0 ? '#4caf50' : '#ef5350');
    bar.style.cssText = `position:absolute;height:100%;background:${color};border-radius:2px;
      width:${halfPct}%;${q >= 0 ? 'left:50%;' : `left:${50 - halfPct}%;`}`;
    bg.appendChild(bar);

    const val = document.createElement('span');
    val.style.cssText = `font-size:8px;width:44px;flex-shrink:0;font-family:monospace;
      color:${isMax ? '#e8f5e9' : '#555'};font-weight:${isMax ? 'bold' : 'normal'};`;
    val.textContent = q.toFixed(4);

    row.appendChild(lbl);
    row.appendChild(bg);
    row.appendChild(val);
    container.appendChild(row);
  });

  const best = document.createElement('div');
  best.style.cssText = 'font-size:9px;color:#90caf9;margin-top:3px;padding-left:65px;';
  best.textContent = `Best: ${ACTION_NAMES[argmax]}`;
  container.appendChild(best);
}

export class ModelInspector {
  constructor(herbAgent, predAgent) {
    this.herbAgent = herbAgent;
    this.predAgent = predAgent;
    this._el = null;
    this._tab = 'herb';
  }

  open() {
    if (this._el) this._el.remove();
    this._el = this._buildShell();
    document.body.appendChild(this._el);
    this._renderTab();
  }

  close() {
    this._el?.remove();
    this._el = null;
  }

  _buildShell() {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:1000;
      display:flex;flex-direction:column;align-items:center;overflow-y:auto;padding:16px 12px;
    `;

    el.innerHTML = `
      <div style="width:100%;max-width:860px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="color:#4fc3f7;font-size:1.1rem;font-weight:bold;">🔬 Model Inspector</span>
          <div style="display:flex;gap:6px;align-items:center;">
            <button id="mi-herb-tab"  style="${this._tabStyle(true)}">🌿 Herbivore</button>
            <button id="mi-pred-tab"  style="${this._tabStyle(false)}">🦊 Predator</button>
            <button id="mi-refresh"   style="${this._btnStyle('#1e3a5f','#4fc3f7')}">↺ Refresh</button>
            <button id="mi-close"     style="${this._btnStyle('#3a1a1a','#ff7043')}">✕ Close</button>
          </div>
        </div>
        <div id="mi-info" style="font-size:0.75rem;color:#777;margin-bottom:10px;"></div>
        <div id="mi-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"></div>
      </div>
    `;

    el.querySelector('#mi-herb-tab').onclick = () => { this._tab = 'herb'; this._renderTab(); };
    el.querySelector('#mi-pred-tab').onclick = () => { this._tab = 'pred'; this._renderTab(); };
    el.querySelector('#mi-refresh').onclick  = () => this._renderTab();
    el.querySelector('#mi-close').onclick    = () => this.close();
    return el;
  }

  _renderTab() {
    const isHerb = this._tab === 'herb';
    const agent = isHerb ? this.herbAgent : this.predAgent;
    const scenarios = isHerb ? herbScenarios() : predScenarios();
    const gridSize = 13;
    const numChannels = 5;

    // Update tab button styles
    this._el.querySelector('#mi-herb-tab').style.cssText = this._tabStyle(isHerb);
    this._el.querySelector('#mi-pred-tab').style.cssText = this._tabStyle(!isHerb);

    // Info line
    this._el.querySelector('#mi-info').textContent =
      `ε = ${agent.epsilon.toFixed(3)}  |  training steps = ${agent.stepCount}  |  ` +
      `buffer = ${agent.buffer.size}  |  last loss = ${(agent.lastLoss||0).toFixed(5)}  |  ` +
      `heading: North is up for all scenarios`;

    const grid = this._el.querySelector('#mi-grid');
    grid.innerHTML = '';

    for (const sc of scenarios) {
      const tensor = buildTensor(gridSize, numChannels, sc.overrides);
      const qValues = runInference(agent, tensor);
      tensor.dispose();

      const card = document.createElement('div');
      card.style.cssText = `
        background:#0d1a0d;border:1px solid #1e3a1e;border-radius:6px;
        padding:10px;display:flex;flex-direction:column;gap:6px;
      `;

      const title = document.createElement('div');
      title.style.cssText = 'font-size:0.78rem;color:#ccc;font-weight:bold;';
      title.textContent = sc.title;
      card.appendChild(title);

      const body = document.createElement('div');
      body.style.cssText = 'display:flex;gap:8px;align-items:flex-start;';

      // Grid canvas
      const canvas = document.createElement('canvas');
      const CELL = 9;
      canvas.width = gridSize * CELL;
      canvas.height = gridSize * CELL;
      canvas.style.cssText = 'flex-shrink:0;border-radius:3px;';
      drawGrid(canvas, gridSize, sc.overrides);

      // Q-value bars
      const bars = document.createElement('div');
      bars.style.cssText = 'flex:1;';
      renderQBars(bars, qValues, sc.expected);

      body.appendChild(canvas);
      body.appendChild(bars);
      card.appendChild(body);

      if (sc.expected !== null) {
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:8px;color:#555;';
        hint.textContent = `Expected optimal: ${ACTION_NAMES[sc.expected]}`;
        card.appendChild(hint);
      }

      grid.appendChild(card);
    }
  }

  _tabStyle(active) {
    return `padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.78rem;
      background:${active ? '#4fc3f7' : '#0f3460'};
      color:${active ? '#1a1a2e' : '#e0e0e0'};
      border:1px solid ${active ? '#4fc3f7' : '#1e4a80'};`;
  }

  _btnStyle(bg, border) {
    return `padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.78rem;
      background:${bg};color:#e0e0e0;border:1px solid ${border};`;
  }
}
