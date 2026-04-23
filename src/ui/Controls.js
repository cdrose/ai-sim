export class Controls {
  constructor(container, world) {
    this.container = container;
    this.world = world;
    this.onSpeedChange = null;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <label>Sim Speed: <span id="speed-val">1x</span>
        <input type="range" id="speed" min="0.1" max="5" step="0.1" value="1">
      </label>
      <label>Herb Buffer Size: <span id="herb-buf-val">500</span>
        <input type="range" id="herb-buf" min="1" max="2000" step="1" value="500">
      </label>
      <label>Pred Buffer Size: <span id="pred-buf-val">500</span>
        <input type="range" id="pred-buf" min="1" max="2000" step="1" value="500">
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
  }

  wireAgents(herbAgent, predAgent) {
    document.getElementById('herb-buf').addEventListener('input', e => {
      const v = parseInt(e.target.value);
      document.getElementById('herb-buf-val').textContent = v;
      herbAgent?.setBufferSize(v);
    });
    document.getElementById('pred-buf').addEventListener('input', e => {
      const v = parseInt(e.target.value);
      document.getElementById('pred-buf-val').textContent = v;
      predAgent?.setBufferSize(v);
    });
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
