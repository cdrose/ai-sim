import * as tf from '@tensorflow/tfjs';
import { Brain } from './Brain.js';
import { ReplayBuffer } from './ReplayBuffer.js';

export class DQNAgent {
  constructor(options = {}) {
    this.gridSize = options.gridSize || 7;
    this.numActions = options.numActions || 5;
    this.gamma = options.gamma || 0.95;
    this.epsilon = options.epsilon || 1.0;
    this.epsilonMin = options.epsilonMin || 0.1;
    this.epsilonDecay = options.epsilonDecay || 0.9995;
    this.batchSize = options.batchSize || 32;
    this.targetSyncInterval = options.targetSyncInterval || 200;
    this.brain = new Brain(this.gridSize, this.numActions);
    this.buffer = new ReplayBuffer(options.bufferSize || 500);
    this.stepCount = 0;
    this.lastLoss = 0;
  }

  selectAction(stateTensor) {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.numActions);
    }
    return tf.tidy(() => {
      const qValues = this.brain.predict(stateTensor);
      return qValues.argMax(1).dataSync()[0];
    });
  }

  remember(state, action, reward, nextState, done) {
    this.buffer.push({ state, action, reward, nextState, done });
  }

  async trainStep() {
    if (this.buffer.size < this.batchSize) return;

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
  }

  setBufferSize(size) {
    this.buffer.setMaxSize(size);
  }
}
