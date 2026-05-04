import * as tf from '@tensorflow/tfjs';
import { Brain } from './Brain.js';
import { ReplayBuffer } from './ReplayBuffer.js';

export class DQNAgent {
  constructor(options = {}) {
    this.gridSize = options.gridSize || 7;
    this.numActions = options.numActions || 8;
    this.gamma = options.gamma || 0.95;
    this.epsilon = options.epsilon || 1.0;
    this.epsilonMin = options.epsilonMin || 0.1;
    this.epsilonDecay = options.epsilonDecay || 0.9995;
    this.batchSize = options.batchSize || 32;
    this.targetSyncInterval = options.targetSyncInterval || 500;
    this.brain = new Brain(this.gridSize, this.numActions, options.numChannels || 5);
    this.buffer = new ReplayBuffer(options.bufferSize || 10000);
    this.stepCount = 0;
    this.lastLoss = 0;
    this._training = false; // guard against concurrent async calls
    this.onTrainStep = null; // (stats) => void — wired by main.js for debug logging
  }

  selectAction(stateTensor) {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.numActions);
    }
    return this.getGreedyAction(stateTensor);
  }

  getGreedyAction(stateTensor) {
    return tf.tidy(() => {
      const qValues = this.brain.predict(stateTensor);
      return qValues.argMax(1).dataSync()[0];
    });
  }

  remember(state, action, reward, nextState, done) {
    // Clip rewards to [-1, 1] — bounds Q* to ~20 (= 1/1-γ) and keeps
    // Bellman targets stable throughout training.
    const clipped = Math.max(-1, Math.min(1, reward));
    this.buffer.push({
      state: state.clone(),
      action,
      reward: clipped,
      nextState: nextState.clone(),
      done
    });
  }

  async trainStep() {
    // Skip if a training step is already in progress — prevents concurrent
    // model.fit() calls that cause diverging Q-value targets.
    if (this._training) return;
    if (this.buffer.size < this.batchSize) return;

    this._training = true;
    try {
      const batch = this.buffer.sample(this.batchSize);

      const states = tf.concat(batch.map(e => e.state));
      const nextStates = tf.concat(batch.map(e => e.nextState));

      const currentQsData = tf.tidy(() => this.brain.predict(states).arraySync());
      const nextQsData = tf.tidy(() => this.brain.predictTarget(nextStates).arraySync());

      for (let i = 0; i < batch.length; i++) {
        const { action, reward, done } = batch[i];
        const target = done ? reward : reward + this.gamma * Math.max(...nextQsData[i]);
        currentQsData[i][action] = target;
      }

      const targets = tf.tensor2d(currentQsData);
      const result = await this.brain.trainOnBatch(states, targets);

      states.dispose();
      nextStates.dispose();
      targets.dispose();

      if (this.epsilon > this.epsilonMin) this.epsilon *= this.epsilonDecay;
      this.stepCount++;
      if (this.stepCount % this.targetSyncInterval === 0) this.brain.syncTargetModel();
      if (result?.history?.loss) this.lastLoss = result.history.loss[0];

      if (this.onTrainStep) {
        const rewards = batch.map(e => e.reward);
        const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
        const std  = Math.sqrt(rewards.map(r => (r - mean) ** 2)
                               .reduce((a, b) => a + b, 0) / rewards.length);
        const actionCounts = Array(this.numActions).fill(0);
        batch.forEach(e => actionCounts[e.action]++);
        this.onTrainStep({
          stepCount:  this.stepCount,
          loss:       this.lastLoss,
          epsilon:    this.epsilon,
          bufferSize: this.buffer.size,
          bufferMax:  this.buffer.maxSize,
          prioritySize: this.buffer.prioritySize,
          batchSize:  batch.length,
          nPriority:  batch.filter(e => Math.abs(e.reward) >= 0.05).length,
          rewardMean: mean,
          rewardStd:  std,
          rewardMin:  Math.min(...rewards),
          rewardMax:  Math.max(...rewards),
          actionCounts,
        });
      }
    } finally {
      this._training = false;
    }
  }

  setBufferSize(size) {
    this.buffer.setMaxSize(size);
  }
}
