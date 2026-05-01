const MAX_ENTRIES = 150;
const LEVEL_COLORS = {
  TRAIN: '#4fc3f7',
  EVENT: '#a5d6a7',
  WARN:  '#ffcc02',
  INFO:  '#aaa',
};
const LEVEL_LABELS = {
  TRAIN: 'TRAIN',
  EVENT: 'EVENT',
  WARN:  'WARN ',
  INFO:  'INFO ',
};

// Singleton so any module can call DebugConsole.log() without holding a ref.
let _instance = null;

export class DebugConsole {
  /** Called by DQNAgent / game events to add a log line. */
  static log(level, message) {
    _instance?._addEntry(level, message);
  }

  constructor(containerEl) {
    _instance = this;
    this._entries  = [];
    this._filter   = 'ALL';
    this._expanded = false;

    // Callbacks wired by main.js
    this.onPauseToggle = null; // (isPaused: bool) => void
    this.onStep        = null; // () => void

    this._isPaused = false;
    this._container = containerEl;
    this._build();
  }

  // Called by main.js so the button reflects externally-driven pause state
  setExternalPause(isPaused) {
    this._isPaused = isPaused;
    this._pauseBtn.textContent = isPaused ? '▶' : '⏸';
    this._pauseBtn.classList.toggle('active', isPaused);
    this._stepBtn.disabled = !isPaused;
    this._stepBtn.style.opacity = isPaused ? '1' : '0.35';
  }

  _build() {
    this._container.innerHTML = '';
    this._container.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    // ── Header row ──────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap;';

    const toggle = document.createElement('button');
    toggle.className = 'tool-btn';
    toggle.style.cssText = 'flex:1;text-align:left;font-size:0.78rem;';
    toggle.textContent = '▶ Debug Console';
    toggle.addEventListener('click', () => {
      this._expanded = !this._expanded;
      toggle.textContent = (this._expanded ? '▼' : '▶') + ' Debug Console';
      filterRow.style.display = this._expanded ? 'flex' : 'none';
      logBody.style.display   = this._expanded ? 'flex' : 'none';
      if (this._expanded) this._render();
    });

    // Pause button – toggles sim loop
    this._pauseBtn = this._makeBtn('⏸', () => {
      this._isPaused = !this._isPaused;
      this.setExternalPause(this._isPaused);
      this.onPauseToggle?.(this._isPaused);
    });
    this._pauseBtn.title = 'Pause / resume simulation';

    // Step button – advance one frame when paused
    this._stepBtn = this._makeBtn('⏭', () => {
      if (!this._isPaused) return;
      this.onStep?.();
    });
    this._stepBtn.title = 'Advance one simulation frame (only when paused)';
    this._stepBtn.disabled = true;
    this._stepBtn.style.opacity = '0.35';

    const clearBtn = this._makeBtn('🗑', () => { this._entries = []; this._render(); });
    clearBtn.title = 'Clear log';

    header.append(toggle, this._pauseBtn, this._stepBtn, clearBtn);
    this._container.appendChild(header);

    // ── Filter row ───────────────────────────────────────────────────────────
    const filterRow = document.createElement('div');
    filterRow.style.cssText = 'display:none;gap:4px;flex-wrap:wrap;';

    ['ALL', 'TRAIN', 'EVENT', 'WARN', 'INFO'].forEach(f => {
      const btn = this._makeBtn(f, () => {
        this._filter = f;
        filterRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._render();
      });
      btn.style.fontSize = '0.7rem';
      if (f === 'ALL') btn.classList.add('active');
      filterRow.appendChild(btn);
    });
    this._container.appendChild(filterRow);

    // ── Log body ─────────────────────────────────────────────────────────────
    const logBody = document.createElement('div');
    logBody.style.cssText = [
      'display:none', 'flex-direction:column', 'background:#060610',
      'border:1px solid #0f3460', 'border-radius:4px', 'padding:4px 6px',
      'height:240px', 'overflow-y:auto', 'font-family:monospace',
      'font-size:0.68rem', 'line-height:1.5', 'gap:0',
    ].join(';');
    this._logEl = logBody;
    this._container.appendChild(logBody);
  }

  _makeBtn(label, onClick) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.style.cssText = 'font-size:0.72rem;padding:3px 6px;';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  _addEntry(level, message) {
    const now = new Date();
    const ts = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, '0')).join(':');
    this._entries.push({ level, message, ts });
    if (this._entries.length > MAX_ENTRIES) this._entries.shift();
    if (this._expanded) this._render();
  }

  _render() {
    const el = this._logEl;
    const visible = this._filter === 'ALL'
      ? this._entries
      : this._entries.filter(e => e.level === this._filter);

    el.innerHTML = '';
    for (const entry of visible) {
      const row = document.createElement('div');
      row.style.cssText =
        'border-bottom:1px solid #0f1a30;padding:1px 0;white-space:pre-wrap;';
      const color = LEVEL_COLORS[entry.level] ?? '#aaa';
      const label = LEVEL_LABELS[entry.level] ?? entry.level.padEnd(5);
      row.innerHTML =
        `<span style="color:#444">${entry.ts}</span> ` +
        `<span style="color:${color};font-weight:bold">[${label}]</span> ` +
        `<span style="color:#c8c8c8">${entry.message}</span>`;
      el.appendChild(row);
    }
    el.scrollTop = el.scrollHeight;
  }
}

