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
