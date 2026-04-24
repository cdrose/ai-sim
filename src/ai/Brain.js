import * as tf from '@tensorflow/tfjs';

export class Brain {
  constructor(gridSize = 7, numActions = 5, numChannels = 5) {
    this.gridSize = gridSize;
    this.numActions = numActions;
    this.numChannels = numChannels;
    this.model = this._buildModel();
    this.targetModel = this._buildModel();
    this.syncTargetModel();
  }

  _buildModel() {
    const model = tf.sequential();
    model.add(tf.layers.conv2d({
      inputShape: [this.gridSize, this.gridSize, this.numChannels],
      filters: 16, kernelSize: 3, padding: 'same', activation: 'relu'
    }));
    model.add(tf.layers.conv2d({
      filters: 32, kernelSize: 3, padding: 'same', activation: 'relu'
    }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: this.numActions }));
    model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
    return model;
  }

  syncTargetModel() {
    const weights = this.model.getWeights();
    this.targetModel.setWeights(weights.map(w => w.clone()));
  }

  predict(stateTensor) {
    return tf.tidy(() => this.model.predict(stateTensor));
  }

  predictTarget(stateTensor) {
    return tf.tidy(() => this.targetModel.predict(stateTensor));
  }

  async trainOnBatch(states, targets) {
    return await this.model.fit(states, targets, { epochs: 1, verbose: 0 });
  }

  dispose() {
    this.model.dispose();
    this.targetModel.dispose();
  }
}
