// Minimum absolute reward for an experience to be added to the priority pool.
// Eating food yields ~15-30, predator penalty ~-20, approach reward ~0.1-0.5.
const PRIORITY_THRESHOLD = 1.0;
// Priority pool capped at this fraction of the main buffer.
const PRIORITY_MAX_FRACTION = 0.1;

export class ReplayBuffer {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.buffer = [];
    this.index = 0;
    // Separate circular buffer for high-reward experiences so the sampler
    // can always include a meaningful fraction of non-zero-reward transitions,
    // counteracting the reward-sparsity problem.
    this._priority = [];
    this._priorityIndex = 0;
    this._priorityMax = Math.max(50, Math.floor(maxSize * PRIORITY_MAX_FRACTION));
  }

  push(experience) {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(experience);
    } else {
      const evicted = this.buffer[this.index % this.maxSize];
      if (evicted) {
        evicted.state?.dispose();
        evicted.nextState?.dispose();
      }
      this.buffer[this.index % this.maxSize] = experience;
    }
    this.index++;

    if (Math.abs(experience.reward) >= PRIORITY_THRESHOLD) {
      // Priority buffer stores references only — no extra tensor copies needed;
      // the main buffer already owns the cloned tensors.
      const slot = this._priorityIndex % this._priorityMax;
      this._priority[slot] = experience;
      this._priorityIndex++;
    }
  }

  // Draw `priorityFrac` of the batch from the priority pool (if populated),
  // the remainder uniformly from the main buffer.
  sample(batchSize, priorityFrac = 0.5) {
    const n = Math.min(batchSize, this.buffer.length);
    const nPriority = this._priority.length > 0
      ? Math.min(Math.floor(n * priorityFrac), this._priority.length)
      : 0;
    const nUniform = n - nPriority;

    const pick = (arr, count) => {
      const sampled = [];
      const used = new Set();
      while (sampled.length < count) {
        const i = Math.floor(Math.random() * arr.length);
        if (!used.has(i)) { used.add(i); sampled.push(arr[i]); }
      }
      return sampled;
    };

    return [
      ...pick(this.buffer, nUniform),
      ...(nPriority > 0 ? pick(this._priority, nPriority) : []),
    ];
  }

  get size() { return this.buffer.length; }
  get prioritySize() { return this._priority.length; }

  setMaxSize(newMax) {
    this.maxSize = newMax;
    this._priorityMax = Math.max(50, Math.floor(newMax * PRIORITY_MAX_FRACTION));
    if (this.buffer.length > newMax) {
      const evicted = this.buffer.slice(0, this.buffer.length - newMax);
      evicted.forEach(e => { e.state?.dispose(); e.nextState?.dispose(); });
      this.buffer = this.buffer.slice(-newMax);
    }
    if (this._priority.length > this._priorityMax) {
      this._priority = this._priority.slice(-this._priorityMax);
    }
  }
}
