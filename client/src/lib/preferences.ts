/**
 * Cookie-based User Preferences Library
 * 
 * Provides functions to get/set user preferences stored in browser cookies.
 * Uses native cookie handling for lightweight implementation.
 */

const COOKIE_EXPIRY_DAYS = 30;
const PREFERENCES_KEY = 'user_preferences';

/**
 * User preferences interface defining all stored preference types
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  recentTools: string[];
  compressionQuality: number;
  language: string;
}

/**
 * Default values for user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  recentTools: [],
  compressionQuality: 80,
  language: 'en',
};

/**
 * Calculates the expiry date for cookies based on COOKIE_EXPIRY_DAYS constant
 * @returns Date object set to 30 days from now
 */
function getExpiryDate(): Date {
  const date = new Date();
  date.setTime(date.getTime() + (COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
  return date;
}

/**
 * Sets a cookie with the specified name, value, and expiry
 * @param name - Cookie name
 * @param value - Cookie value (will be URI encoded)
 */
function setCookie(name: string, value: string): void {
  const expires = getExpiryDate().toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Retrieves a cookie value by name
 * @param name - Cookie name to retrieve
 * @returns Decoded cookie value or null if not found
 */
function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

/**
 * Retrieves all user preferences from cookies
 * Merges stored preferences with defaults to ensure all fields exist
 * @returns Complete UserPreferences object with stored or default values
 */
export function getPreferences(): UserPreferences {
  try {
    const stored = getCookie(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('Error reading preferences cookie:', error);
  }
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Saves all user preferences to cookies
 * Serializes the preferences object to JSON and stores with 30-day expiry
 * @param preferences - Complete preferences object to save
 */
export function setPreferences(preferences: UserPreferences): void {
  try {
    setCookie(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving preferences cookie:', error);
  }
}

/**
 * Updates a single preference value without affecting others
 * @param key - The preference key to update
 * @param value - The new value for the preference
 */
export function updatePreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void {
  const current = getPreferences();
  current[key] = value;
  setPreferences(current);
}

/**
 * Adds a tool to the recently used tools list
 * Maintains a maximum of 6 recent tools, removing oldest when limit exceeded
 * Moves tool to front if already in list
 * @param toolId - The ID of the tool to add to recent history
 */
export function addRecentTool(toolId: string): void {
  const preferences = getPreferences();
  const recentTools = preferences.recentTools.filter(id => id !== toolId);
  recentTools.unshift(toolId);
  preferences.recentTools = recentTools.slice(0, 6);
  setPreferences(preferences);
}

/**
 * Gets the list of recently used tool IDs
 * @returns Array of tool IDs in order of most recent first
 */
export function getRecentTools(): string[] {
  return getPreferences().recentTools;
}

/**
 * Gets the user's preferred theme setting
 * @returns Theme preference: 'light', 'dark', or 'system'
 */
export function getTheme(): UserPreferences['theme'] {
  return getPreferences().theme;
}

/**
 * Sets the user's preferred theme
 * @param theme - Theme to set: 'light', 'dark', or 'system'
 */
export function setTheme(theme: UserPreferences['theme']): void {
  updatePreference('theme', theme);
}

/**
 * Gets the user's default compression quality setting
 * @returns Compression quality percentage (0-100)
 */
export function getCompressionQuality(): number {
  return getPreferences().compressionQuality;
}

/**
 * Sets the user's default compression quality
 * @param quality - Quality percentage (0-100)
 */
export function setCompressionQuality(quality: number): void {
  updatePreference('compressionQuality', Math.max(0, Math.min(100, quality)));
}

/**
 * Gets the user's preferred language
 * @returns Language code (e.g., 'en', 'es', 'fr')
 */
export function getLanguage(): string {
  return getPreferences().language;
}

/**
 * Sets the user's preferred language
 * @param language - Language code to set
 */
export function setLanguage(language: string): void {
  updatePreference('language', language);
}

/**
 * Clears all stored preferences, resetting to defaults
 * Removes the preferences cookie entirely
 */
export function clearPreferences(): void {
  document.cookie = `${PREFERENCES_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
