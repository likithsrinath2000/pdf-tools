import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  addRecentTool,
  clearPreferences,
  getCompressionQuality,
  getLanguage,
  getPreferences,
  getRecentTools,
  getTheme,
  setCompressionQuality,
  setLanguage,
  setPreferences,
  setTheme,
  updatePreference,
} from './preferences';

let cookieStore = '';

beforeEach(() => {
  cookieStore = '';
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => cookieStore,
    set: (value: string) => {
      const [pair] = value.split(';');
      const [name, raw = ''] = pair.split('=');
      if (value.includes('Thu, 01 Jan 1970')) {
        cookieStore = cookieStore.split(';').filter(c => !c.trim().startsWith(`${name}=`)).join('; ');
      } else {
        const others = cookieStore.split(';').filter(Boolean).filter(c => !c.trim().startsWith(`${name}=`));
        others.push(`${name}=${raw}`);
        cookieStore = others.join('; ');
      }
    },
  });
});

afterEach(() => vi.restoreAllMocks());

describe('preferences', () => {
  it('returns defaults without a cookie and merges partial stored preferences', () => {
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES);
    document.cookie = `user_preferences=${encodeURIComponent(JSON.stringify({ theme: 'dark', recentTools: ['merge-pdf'] }))}`;
    expect(getPreferences()).toEqual({ ...DEFAULT_PREFERENCES, theme: 'dark', recentTools: ['merge-pdf'] });
  });

  it('sets preferences with a 30-day expiry cookie', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    setPreferences({ ...DEFAULT_PREFERENCES, language: 'es' });
    expect(decodeURIComponent(cookieStore)).toContain('"language":"es"');
    expect(getPreferences().language).toBe('es');
    vi.useRealTimers();
  });

  it('updates individual preferences and convenience getters/setters', () => {
    setTheme('dark');
    setCompressionQuality(150);
    setLanguage('fr');
    updatePreference('recentTools', ['split-pdf']);

    expect(getTheme()).toBe('dark');
    expect(getCompressionQuality()).toBe(100);
    setCompressionQuality(-1);
    expect(getCompressionQuality()).toBe(0);
    expect(getLanguage()).toBe('fr');
    expect(getRecentTools()).toEqual(['split-pdf']);
  });

  it('adds recent tools with dedupe and a six item limit, and clears preferences', () => {
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'c'].forEach(addRecentTool);
    expect(getRecentTools()).toEqual(['c', 'g', 'f', 'e', 'd', 'b']);
    clearPreferences();
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('handles invalid cookies and serialization errors gracefully', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.cookie = 'user_preferences=%7Bbad';
    expect(getPreferences()).toEqual(DEFAULT_PREFERENCES);

    Object.defineProperty(document, 'cookie', { configurable: true, set: () => { throw new Error('blocked'); } });
    expect(() => setPreferences(DEFAULT_PREFERENCES)).not.toThrow();
    expect(error).toHaveBeenCalled();
  });
});
