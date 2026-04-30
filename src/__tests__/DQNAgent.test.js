import { describe, test, expect, beforeAll } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { DQNAgent } from '../ai/DQNAgent.js';

// Creates a tiny agent — small gridSize keeps model creation and inference fast
function makeTinyAgent() {
  return new DQNAgent({
    gridSize:   3,
    numChannels: 2,
    numActions:  3,
    bufferSize:  100,
    batchSize:   4,
  });
}

// Fills an agent's buffer with `count` identical synthetic experiences
function fillBuffer(agent, count) {
  const s = tf.zeros([1, agent.gridSize, agent.gridSize, agent.brain.numChannels]);
  for (let i = 0; i < count; i++) {
    agent.remember(s, i % agent.numActions, Math.random() * 2 - 1, s, false);
  }
  s.dispose();
}

describe('DQNAgent — training guard', () => {
  beforeAll(() => tf.ready());

  test('_training flag starts as false', () => {
    expect(makeTinyAgent()._training).toBe(false);
  });

  test('_training flag is false after a completed trainStep', async () => {
    const agent = makeTinyAgent();
    fillBuffer(agent, 10);
    await agent.trainStep();
    expect(agent._training).toBe(false);
  });

  test('concurrent trainStep call while _training=true is a no-op', async () => {
    const agent = makeTinyAgent();
    fillBuffer(agent, 10);

    // Simulate an in-progress training step
    agent._training = true;
    const stepsBefore = agent.stepCount;
    await agent.trainStep(); // should return immediately
    expect(agent.stepCount).toBe(stepsBefore);

    agent._training = false; // clean up
  });
});

describe('DQNAgent — buffer interaction', () => {
  beforeAll(() => tf.ready());

  test('remember adds entries to the buffer', () => {
    const agent = makeTinyAgent();
    expect(agent.buffer.size).toBe(0);
    fillBuffer(agent, 5);
    expect(agent.buffer.size).toBe(5);
  });

  test('trainStep does not run when buffer is below batchSize', async () => {
    const agent = makeTinyAgent(); // batchSize = 4
    fillBuffer(agent, 2);         // only 2 entries
    await agent.trainStep();
    expect(agent.stepCount).toBe(0);
  });
});

describe('DQNAgent — training step side effects', () => {
  beforeAll(() => tf.ready());

  test('trainStep increments stepCount', async () => {
    const agent = makeTinyAgent();
    fillBuffer(agent, 10);
    await agent.trainStep();
    expect(agent.stepCount).toBe(1);
  });

  test('trainStep produces a finite, non-negative lastLoss', async () => {
    const agent = makeTinyAgent();
    fillBuffer(agent, 10);
    await agent.trainStep();
    expect(Number.isFinite(agent.lastLoss)).toBe(true);
    expect(agent.lastLoss).toBeGreaterThanOrEqual(0);
  });

  test('epsilon decays after a training step', async () => {
    const agent = makeTinyAgent();
    agent.epsilon = 1.0;
    fillBuffer(agent, 10);
    await agent.trainStep();
    expect(agent.epsilon).toBeLessThan(1.0);
  });

  test('epsilon is not reduced below epsilonMin', async () => {
    const agent = makeTinyAgent();
    agent.epsilon = agent.epsilonMin; // already at floor
    fillBuffer(agent, 10);
    await agent.trainStep();
    expect(agent.epsilon).toBe(agent.epsilonMin);
  });

  test('running multiple sequential trainSteps does not throw', async () => {
    const agent = makeTinyAgent();
    fillBuffer(agent, 20);
    await agent.trainStep();
    await agent.trainStep();
    await agent.trainStep();
    expect(agent.stepCount).toBe(3);
  });

  test('target network syncs after targetSyncInterval steps', async () => {
    const agent = new DQNAgent({
      gridSize: 3, numChannels: 2, numActions: 3,
      bufferSize: 100, batchSize: 4, targetSyncInterval: 2,
    });
    fillBuffer(agent, 20);

    const weightsBefore = agent.brain.targetModel.getWeights().map(w => w.dataSync().slice());
    await agent.trainStep();
    await agent.trainStep(); // stepCount hits 2 → sync fires

    const weightsAfter = agent.brain.targetModel.getWeights().map(w => w.dataSync());
    const mainWeights  = agent.brain.model.getWeights().map(w => w.dataSync());

    // After sync, target weights should match main model weights
    for (let i = 0; i < mainWeights.length; i++) {
      for (let j = 0; j < mainWeights[i].length; j++) {
        expect(weightsAfter[i][j]).toBeCloseTo(mainWeights[i][j], 5);
      }
    }
  });
});
