import { describe, test, expect, vi } from 'vitest';
import { ReplayBuffer } from '../ai/ReplayBuffer.js';

// Minimal fake experience — ReplayBuffer only calls dispose() on state/nextState
// when evicting entries, so these mocks let us spy on that.
const mockEntry = () => ({
  state:     { dispose: vi.fn() },
  nextState: { dispose: vi.fn() },
});

describe('ReplayBuffer', () => {
  test('starts empty', () => {
    expect(new ReplayBuffer(10).size).toBe(0);
  });

  test('push increases size', () => {
    const buf = new ReplayBuffer(10);
    buf.push(mockEntry());
    buf.push(mockEntry());
    expect(buf.size).toBe(2);
  });

  test('size is capped at maxSize after overflow', () => {
    const buf = new ReplayBuffer(3);
    for (let i = 0; i < 10; i++) buf.push(mockEntry());
    expect(buf.size).toBe(3);
  });

  test('evicted entry has dispose() called on both state tensors', () => {
    const buf = new ReplayBuffer(2);
    const e1 = mockEntry();
    buf.push(e1);
    buf.push(mockEntry());
    buf.push(mockEntry()); // evicts e1
    expect(e1.state.dispose).toHaveBeenCalledOnce();
    expect(e1.nextState.dispose).toHaveBeenCalledOnce();
  });

  test('non-evicted entries are not disposed', () => {
    const buf = new ReplayBuffer(5);
    const entries = Array.from({ length: 3 }, mockEntry);
    entries.forEach(e => buf.push(e));
    entries.forEach(e => {
      expect(e.state.dispose).not.toHaveBeenCalled();
    });
  });

  test('sample returns exactly the requested count', () => {
    const buf = new ReplayBuffer(20);
    for (let i = 0; i < 20; i++) buf.push({ ...mockEntry(), id: i });
    expect(buf.sample(8).length).toBe(8);
  });

  test('sample returns no duplicate entries', () => {
    const buf = new ReplayBuffer(10);
    for (let i = 0; i < 10; i++) buf.push({ ...mockEntry(), id: i });
    const ids = buf.sample(10).map(e => e.id);
    expect(new Set(ids).size).toBe(10);
  });

  test('sample when buffer is smaller than requested count returns all entries', () => {
    const buf = new ReplayBuffer(10);
    buf.push(mockEntry());
    buf.push(mockEntry());
    expect(buf.sample(8).length).toBe(2);
  });

  test('setMaxSize trims excess entries and calls dispose on the removed ones', () => {
    const buf = new ReplayBuffer(10);
    const entries = Array.from({ length: 10 }, mockEntry);
    entries.forEach(e => buf.push(e));

    buf.setMaxSize(3);
    expect(buf.size).toBe(3);

    // First 7 entries should have been trimmed and disposed
    for (let i = 0; i < 7; i++) {
      expect(entries[i].state.dispose).toHaveBeenCalledOnce();
      expect(entries[i].nextState.dispose).toHaveBeenCalledOnce();
    }
    // Last 3 should be untouched
    for (let i = 7; i < 10; i++) {
      expect(entries[i].state.dispose).not.toHaveBeenCalled();
    }
  });

  test('setMaxSize to a larger value does not touch existing entries', () => {
    const buf = new ReplayBuffer(5);
    const entries = Array.from({ length: 5 }, mockEntry);
    entries.forEach(e => buf.push(e));
    buf.setMaxSize(20);
    entries.forEach(e => expect(e.state.dispose).not.toHaveBeenCalled());
    expect(buf.size).toBe(5);
  });
});

describe('ReplayBuffer — priority sampling', () => {
  const lowReward  = (id) => ({ ...mockEntry(), reward:  0.0, id });
  const highReward = (id) => ({ ...mockEntry(), reward: 10.0, id });
  const negReward  = (id) => ({ ...mockEntry(), reward: -5.0, id });

  test('prioritySize starts at 0', () => {
    expect(new ReplayBuffer(20).prioritySize).toBe(0);
  });

  test('low-reward entries do not enter priority pool', () => {
    const buf = new ReplayBuffer(20);
    for (let i = 0; i < 10; i++) buf.push(lowReward(i));
    expect(buf.prioritySize).toBe(0);
  });

  test('high-reward entries enter priority pool', () => {
    const buf = new ReplayBuffer(20);
    buf.push(highReward(1));
    buf.push(highReward(2));
    expect(buf.prioritySize).toBe(2);
  });

  test('negative reward entries enter priority pool', () => {
    const buf = new ReplayBuffer(20);
    buf.push(negReward(1));
    expect(buf.prioritySize).toBe(1);
  });

  test('priority pool is capped at priorityMax', () => {
    const buf = new ReplayBuffer(100); // _priorityMax = max(50, floor(100*0.1)) = 50
    for (let i = 0; i < 200; i++) buf.push(highReward(i));
    expect(buf.prioritySize).toBeLessThanOrEqual(buf._priorityMax);
  });

  test('sample with no priority entries still returns correct batch size', () => {
    const buf = new ReplayBuffer(20);
    for (let i = 0; i < 20; i++) buf.push(lowReward(i));
    expect(buf.sample(8).length).toBe(8);
  });

  test('sample with priority entries returns correct batch size', () => {
    const buf = new ReplayBuffer(20);
    for (let i = 0; i < 16; i++) buf.push(lowReward(i));
    for (let i = 0; i < 4;  i++) buf.push(highReward(100 + i));
    expect(buf.sample(8).length).toBe(8);
  });

  test('sample includes priority entries when available', () => {
    const buf = new ReplayBuffer(100);
    for (let i = 0; i < 80; i++) buf.push(lowReward(i));
    for (let i = 0; i < 4;  i++) buf.push(highReward(1000 + i));
    // With priorityFrac=0.5 and batchSize=8, expect up to 4 priority entries
    const batch = buf.sample(8, 0.5);
    const nHigh = batch.filter(e => e.reward === 10).length;
    expect(nHigh).toBeGreaterThan(0);
  });
});
