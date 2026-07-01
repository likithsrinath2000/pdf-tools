import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addRecentTool,
  clearAllCache,
  clearRecentTools,
  getCache,
  getRecentTools,
  getUserPreferences,
  removeCache,
  setCache,
  setUserPreferences,
} from './cache';

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('cache', () => {
  it('sets, gets, expires and removes cache entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    setCache('answer', { value: 42 }, 100);
    expect(getCache<{ value: number }>('answer')).toEqual({ value: 42 });

    vi.setSystemTime(1_200);
    expect(getCache('answer')).toBeNull();
    expect(localStorage.getItem('pdftools_answer')).toBeNull();

    setCache('answer', 'x');
    removeCache('answer');
    expect(getCache('answer')).toBeNull();
  });

  it('clears only pdftools-prefixed entries', () => {
    localStorage.setItem('pdftools_a', '1');
    localStorage.setItem('other', '2');
    setCache('b', 2);

    clearAllCache();

    expect(localStorage.getItem('pdftools_a')).toBeNull();
    expect(localStorage.getItem('pdftools_b')).toBeNull();
    expect(localStorage.getItem('other')).toBe('2');
  });

  it('handles storage and JSON errors without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => setCache('bad', 1)).not.toThrow();
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem('pdftools_bad', '{nope');
    expect(getCache('bad')).toBeNull();
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('no'); });
    expect(() => removeCache('bad')).not.toThrow();
    expect(warn).toBeDefined();
  });

  it('merges user preferences', () => {
    expect(getUserPreferences()).toEqual({});
    setUserPreferences({ theme: 'dark' });
    setUserPreferences({ language: 'fr' });
    expect(getUserPreferences()).toEqual({ theme: 'dark', language: 'fr' });
  });

  it('tracks recent tools, deduplicates, trims, and clears', () => {
    for (let i = 0; i < 12; i++) addRecentTool({ id: `tool-${i}`, name: `Tool ${i}` });
    addRecentTool({ id: 'tool-5', name: 'Tool 5' });

    const recent = getRecentTools();
    expect(recent).toHaveLength(10);
    expect(recent[0].id).toBe('tool-5');
    expect(new Set(recent.map(t => t.id)).size).toBe(10);

    clearRecentTools();
    expect(getRecentTools()).toEqual([]);
  });
});
