/**
 * LocalStorage Cache Utility with TTL Support
 * 
 * Provides helper functions for caching data in localStorage with automatic
 * expiration. Used for:
 * - User preferences (theme, language, etc.)
 * - Recently used tools for quick access
 * - Any data that should persist between sessions
 * 
 * TTL (Time To Live) ensures stale data is automatically invalidated.
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const CACHE_PREFIX = 'pdftools_';

export function setCache<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): void {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn('Failed to set cache:', error);
  }
}

export function getCache<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;

    const cacheItem: CacheItem<T> = JSON.parse(item);
    const isExpired = Date.now() - cacheItem.timestamp > cacheItem.ttl;

    if (isExpired) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return cacheItem.data;
  } catch (error) {
    console.warn('Failed to get cache:', error);
    return null;
  }
}

export function removeCache(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (error) {
    console.warn('Failed to remove cache:', error);
  }
}

export function clearAllCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}

const USER_PREFERENCES_KEY = 'user_preferences';
const USER_PREFERENCES_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  compressQuality?: number;
  defaultOutputFormat?: string;
}

export function getUserPreferences(): UserPreferences {
  return getCache<UserPreferences>(USER_PREFERENCES_KEY) || {};
}

export function setUserPreferences(preferences: Partial<UserPreferences>): void {
  const current = getUserPreferences();
  setCache(USER_PREFERENCES_KEY, { ...current, ...preferences }, USER_PREFERENCES_TTL);
}

const RECENT_TOOLS_KEY = 'recent_tools';
const RECENT_TOOLS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_RECENT_TOOLS = 10;

export interface RecentTool {
  id: string;
  name: string;
  lastUsed: number;
}

export function getRecentTools(): RecentTool[] {
  return getCache<RecentTool[]>(RECENT_TOOLS_KEY) || [];
}

export function addRecentTool(tool: Omit<RecentTool, 'lastUsed'>): void {
  const recentTools = getRecentTools();
  const existingIndex = recentTools.findIndex(t => t.id === tool.id);
  
  if (existingIndex !== -1) {
    recentTools.splice(existingIndex, 1);
  }
  
  recentTools.unshift({
    ...tool,
    lastUsed: Date.now()
  });
  
  const trimmedTools = recentTools.slice(0, MAX_RECENT_TOOLS);
  setCache(RECENT_TOOLS_KEY, trimmedTools, RECENT_TOOLS_TTL);
}

export function clearRecentTools(): void {
  removeCache(RECENT_TOOLS_KEY);
}
