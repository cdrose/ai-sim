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

const SIDEBAR_W = 264; // px — must match sidebar width in index.html + border

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
    this._open     = false;
    this._isPaused = false;

    // Callbacks wired by main.js
    this.onPauseToggle = null; // (isPaused: bool) => void
    this.onStep        = null; // () => void

    this._container = containerEl;
    this._buildSidebarStrip();
    this._buildFlyout();
  }

  /** Called by main.js so buttons reflect externally-driven pause state. */
  setExternalPause(isPaused) {
    this._isPaused = isPaused;
    this._pauseBtn.textContent = isPaused ? '▶' : '⏸';
    this._pauseBtn.classList.toggle('active', isPaused);
    this._stepBtn.disabled = !isPaused;
    this._stepBtn.style.opacity = isPaused ? '1' : '0.35';
  }

  // ── Sidebar strip ──────────────────────────────────────────────────────────
  _buildSidebarStrip() {
    this._container.style.cssText = 'display:flex;gap:4px;align-items:center;';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'tool-btn';
    toggleBtn.style.cssText = 'flex:1;text-align:left;font-size:0.78rem;';
    toggleBtn.textContent = '🖥 Debug Console';
    toggleBtn.title = 'Open / close debug console';
    toggleBtn.addEventListener('click', () => this._toggleFlyout());
    this._toggleBtn = toggleBtn;

    this._pauseBtn = this._makeBtn('⏸', () => {
      this._isPaused = !this._isPaused;
      this.setExternalPause(this._isPaused);
      this.onPauseToggle?.(this._isPaused);
    });
    this._pauseBtn.title = 'Pause / resume simulation';

    this._stepBtn = this._makeBtn('⏭', () => {
      if (!this._isPaused) return;
      this.onStep?.();
    });
    this._stepBtn.title = 'Step one simulation frame (paused only)';
    this._stepBtn.disabled = true;
    this._stepBtn.style.opacity = '0.35';

    this._container.append(toggleBtn, this._pauseBtn, this._stepBtn);
  }

  // ── Flyout panel ───────────────────────────────────────────────────────────
  _buildFlyout() {
    const panel = document.createElement('div');
    panel.style.cssText = [
      'position:fixed',
      `right:${SIDEBAR_W}px`,
      'bottom:0',
      'width:520px',
      'height:60vh',
      'min-height:300px',
      'background:#0d0d1f',
      'border:1px solid #0f3460',
      'border-bottom:none',
      'border-radius:8px 0 0 0',
      'display:flex',
      'flex-direction:column',
      'z-index:1000',
      'box-shadow:-4px -4px 20px rgba(0,0,0,0.6)',
      'transform:translateY(100%)',
      'transition:transform 0.2s ease',
    ].join(';');
    this._panel = panel;

    // Panel header
    const header = document.createElement('div');
    header.style.cssText = [
      'display:flex', 'align-items:center', 'gap:6px',
      'padding:6px 10px', 'background:#111130',
      'border-bottom:1px solid #0f3460',
      'border-radius:8px 0 0 0', 'flex-shrink:0',
    ].join(';');

    const title = document.createElement('span');
    title.style.cssText = 'color:#4fc3f7;font-size:0.82rem;font-weight:bold;flex:1;font-family:monospace;';
    title.textContent = '🖥 Debug Console';

    // Filter buttons
    const filterWrap = document.createElement('div');
    filterWrap.style.cssText = 'display:flex;gap:3px;';
    ['ALL', 'TRAIN', 'EVENT', 'WARN', 'INFO'].forEach(f => {
      const btn = this._makeBtn(f, () => {
        this._filter = f;
        filterWrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._render();
      });
      btn.style.cssText += 'font-size:0.65rem;padding:2px 5px;';
      if (f === 'ALL') btn.classList.add('active');
      filterWrap.appendChild(btn);
    });

    const clearBtn = this._makeBtn('🗑', () => { this._entries = []; this._render(); });
    clearBtn.title = 'Clear log';

    const closeBtn = this._makeBtn('✕', () => this._toggleFlyout());
    closeBtn.title = 'Close';

    header.append(title, filterWrap, clearBtn, closeBtn);
    panel.appendChild(header);

    // Log body
    const logBody = document.createElement('div');
    logBody.style.cssText = [
      'flex:1', 'overflow-y:auto', 'padding:6px 10px',
      'font-family:monospace', 'font-size:0.72rem', 'line-height:1.6',
      'background:#060610',
    ].join(';');
    this._logEl = logBody;
    panel.appendChild(logBody);

    document.body.appendChild(panel);
  }

  _toggleFlyout() {
    this._open = !this._open;
    this._panel.style.transform = this._open ? 'translateY(0)' : 'translateY(100%)';
    this._toggleBtn.classList.toggle('active', this._open);
    if (this._open) this._render();
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
    if (this._open) this._render();
  }

  _render() {
    const el = this._logEl;
    const visible = this._filter === 'ALL'
      ? this._entries
      : this._entries.filter(e => e.level === this._filter);

    el.innerHTML = '';
    for (const entry of visible) {
      const row = document.createElement('div');
      row.style.cssText = 'border-bottom:1px solid #0f1a30;padding:2px 0;white-space:pre-wrap;';
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


