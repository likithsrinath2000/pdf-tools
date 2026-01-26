import { useState, useEffect, useCallback } from 'react';
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  getPreferences,
  setPreferences,
  addRecentTool,
  updatePreference,
} from '@/lib/preferences';

/**
 * Custom hook for managing user preferences
 * Syncs with cookies on mount and provides reactive state updates
 * 
 * @returns Object containing current preferences and update functions
 */
export function usePreferences() {
  const [preferences, setLocalPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = getPreferences();
    setLocalPreferences(stored);
    setIsLoaded(true);
  }, []);

  const updateTheme = useCallback((theme: UserPreferences['theme']) => {
    setLocalPreferences(prev => {
      const updated = { ...prev, theme };
      setPreferences(updated);
      return updated;
    });
  }, []);

  const updateCompressionQuality = useCallback((quality: number) => {
    const clampedQuality = Math.max(0, Math.min(100, quality));
    setLocalPreferences(prev => {
      const updated = { ...prev, compressionQuality: clampedQuality };
      setPreferences(updated);
      return updated;
    });
  }, []);

  const updateLanguage = useCallback((language: string) => {
    setLocalPreferences(prev => {
      const updated = { ...prev, language };
      setPreferences(updated);
      return updated;
    });
  }, []);

  const trackToolUsage = useCallback((toolId: string) => {
    addRecentTool(toolId);
    setLocalPreferences(prev => {
      const recentTools = prev.recentTools.filter(id => id !== toolId);
      recentTools.unshift(toolId);
      return { ...prev, recentTools: recentTools.slice(0, 6) };
    });
  }, []);

  const updateAll = useCallback((newPreferences: Partial<UserPreferences>) => {
    setLocalPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      setPreferences(updated);
      return updated;
    });
  }, []);

  return {
    preferences,
    isLoaded,
    updateTheme,
    updateCompressionQuality,
    updateLanguage,
    trackToolUsage,
    updateAll,
    recentTools: preferences.recentTools,
    theme: preferences.theme,
    compressionQuality: preferences.compressionQuality,
    language: preferences.language,
  };
}
