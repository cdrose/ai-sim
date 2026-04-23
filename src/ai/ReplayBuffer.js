export class ReplayBuffer {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.buffer = [];
    this.index = 0;
  }

  push(experience) {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(experience);
    } else {
      this.buffer[this.index % this.maxSize] = experience;
    }
    this.index++;
  }

  sample(batchSize) {
    const n = Math.min(batchSize, this.buffer.length);
    const sampled = [];
    const used = new Set();
    while (sampled.length < n) {
      const i = Math.floor(Math.random() * this.buffer.length);
      if (!used.has(i)) { used.add(i); sampled.push(this.buffer[i]); }
    }
    return sampled;
  }

  get size() { return this.buffer.length; }

  setMaxSize(newMax) {
    this.maxSize = newMax;
    if (this.buffer.length > newMax) {
      this.buffer = this.buffer.slice(-newMax);
    }
  }
}
