export class LossChart {
  constructor(canvas, label, color) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.label = label;
    this.color = color;
    this.history = [];
  }

  addLoss(loss) {
    if (loss == null || isNaN(loss)) return;
    this.history.push(loss);
  }

  render() {
    const { canvas, ctx, label, color, history } = this;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#0d1b2e';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#aaa';
    ctx.font = '9px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillText(label, 4, 10);

    if (history.length < 2) {
      ctx.fillStyle = '#444';
      ctx.font = '9px Segoe UI';
      ctx.fillText('collecting data…', W / 2 - 30, H / 2 + 4);
      return;
    }

    let yMin = Infinity, yMax = -Infinity;
    for (const v of history) {
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
    if (yMax === yMin) yMax = yMin + 0.001;

    const PAD_L = 28, PAD_R = 4, PAD_T = 14, PAD_B = 14;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    // Y-axis labels
    ctx.fillStyle = '#555';
    ctx.font = '8px Segoe UI';
    ctx.textAlign = 'right';
    ctx.fillText(yMax.toFixed(3), PAD_L - 2, PAD_T + 4);
    ctx.fillText(yMin.toFixed(3), PAD_L - 2, PAD_T + plotH);
    ctx.textAlign = 'left';

    // Axis line
    ctx.strokeStyle = '#1e2f45';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T);
    ctx.lineTo(PAD_L, PAD_T + plotH);
    ctx.stroke();

    // Single loss line — x rescales so all history always fills the plot width
    const n = history.length;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = PAD_L + (i / (n - 1)) * plotW;
      const y = PAD_T + plotH - ((history[i] - yMin) / (yMax - yMin)) * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
