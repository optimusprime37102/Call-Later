import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { loadSettings, saveSettings } from '@/src/services/settingsStorage';
import { setAlarmOverlayPreference } from '@/src/services/notifications';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  SnoozeDurationMinutes,
  ThemePreference,
} from '@/src/types/settings';
import {
  ColorSchemeName,
  ThemeColors,
  themes,
} from '@/src/theme/tokens';

interface ThemeContextValue {
  settings: AppSettings;
  colors: ThemeColors;
  colorScheme: ColorSchemeName;
  isReady: boolean;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setDefaultSnooze: (minutes: SnoozeDurationMinutes) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setAlarmOverlayEnabled: (enabled: boolean) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  const refreshSettings = useCallback(async () => {
    const loaded = await loadSettings();
    setAlarmOverlayPreference(loaded.alarmOverlayEnabled);
    setSettings(loaded);
    setIsReady(true);
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  const persist = useCallback(async (next: AppSettings) => {
    setAlarmOverlayPreference(next.alarmOverlayEnabled);
    setSettings(next);
    await saveSettings(next);
  }, []);

  const setTheme = useCallback(
    async (theme: ThemePreference) => {
      await persist({ ...settings, theme });
    },
    [persist, settings],
  );

  const setDefaultSnooze = useCallback(
    async (minutes: SnoozeDurationMinutes) => {
      await persist({ ...settings, defaultSnoozeMinutes: minutes });
    },
    [persist, settings],
  );

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      await persist({ ...settings, notificationsEnabled: enabled });
    },
    [persist, settings],
  );

  const setAlarmOverlayEnabled = useCallback(
    async (enabled: boolean) => {
      await persist({ ...settings, alarmOverlayEnabled: enabled });
    },
    [persist, settings],
  );

  const colorScheme: ColorSchemeName =
    settings.theme === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : settings.theme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      colors: themes[colorScheme],
      colorScheme,
      isReady,
      setTheme,
      setDefaultSnooze,
      setNotificationsEnabled,
      setAlarmOverlayEnabled,
      refreshSettings,
    }),
    [
      settings,
      colorScheme,
      isReady,
      setTheme,
      setDefaultSnooze,
      setNotificationsEnabled,
      setAlarmOverlayEnabled,
      refreshSettings,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return ctx;
}
