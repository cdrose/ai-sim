export class Controls {
  constructor(container, world) {
    this.container = container;
    this.world = world;
    this.onSpeedChange = null;
    this._render();
  }

  _render() {
    const densityPct = Math.round(this.world.foodDensity * 100);
    const regrow = this.world.foodRegrowTime;

    this.container.innerHTML = `
      <label>Sim Speed: <span id="speed-val">1x</span>
        <input type="range" id="speed" min="0.1" max="5" step="0.1" value="1">
      </label>
      <label>Vegetation Density: <span id="density-val">${densityPct}%</span>
        <input type="range" id="density" min="0.5" max="15" step="0.5" value="${densityPct}">
      </label>
      <label>Regrow Time: <span id="regrow-val">${regrow}s</span>
        <input type="range" id="regrow" min="3" max="60" step="1" value="${regrow}">
      </label>
      <label>Herb Epsilon: <span id="herb-eps-val">1.0</span>
        <input type="range" id="herb-eps" min="0.01" max="1" step="0.01" value="1">
      </label>
      <label>Pred Epsilon: <span id="pred-eps-val">1.0</span>
        <input type="range" id="pred-eps" min="0.01" max="1" step="0.01" value="1">
      </label>
    `;

    document.getElementById('speed').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      document.getElementById('speed-val').textContent = v + 'x';
      if (this.onSpeedChange) this.onSpeedChange(v);
    });

    document.getElementById('density').addEventListener('input', e => {
      const pct = parseFloat(e.target.value);
      document.getElementById('density-val').textContent = pct + '%';
      this.world.foodDensity = pct / 100;
      this.world.resetFood();
    });

    document.getElementById('regrow').addEventListener('input', e => {
      const v = parseInt(e.target.value);
      document.getElementById('regrow-val').textContent = v + 's';
      this.world.foodRegrowTime = v;
    });
  }

  wireAgents(herbAgent, predAgent) {
    document.getElementById('herb-eps').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      document.getElementById('herb-eps-val').textContent = v.toFixed(2);
      if (herbAgent) herbAgent.epsilon = v;
    });
    document.getElementById('pred-eps').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      document.getElementById('pred-eps-val').textContent = v.toFixed(2);
      if (predAgent) predAgent.epsilon = v;
    });
  }
}
