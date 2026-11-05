import {
    setAlarmFeedbackNotificationPreferences,
    setAlarmOverlayPreference,
} from '@/src/services/notifications';
import { loadSettings, saveSettings } from '@/src/services/settingsStorage';
import {
    ColorSchemeName,
    ThemeColors,
    themes,
} from '@/src/theme/tokens';
import {
    AppSettings,
    DEFAULT_SETTINGS,
    SnoozeDurationMinutes,
    ThemePreference,
} from '@/src/types/settings';
import { setAlarmFeedbackOptions } from 'call-later-alarm';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

interface ThemeContextValue {
  settings: AppSettings;
  colors: ThemeColors;
  colorScheme: ColorSchemeName;
  isReady: boolean;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setDefaultSnooze: (minutes: SnoozeDurationMinutes) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setAlarmOverlayEnabled: (enabled: boolean) => Promise<void>;
  setAlarmSoundEnabled: (enabled: boolean) => Promise<void>;
  setAlarmVibrateEnabled: (enabled: boolean) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function syncNativeFeedbackPrefs(settings: AppSettings) {
  setAlarmFeedbackNotificationPreferences({
    soundEnabled: settings.alarmSoundEnabled,
    vibrateEnabled: settings.alarmVibrateEnabled,
  });
  try {
    await setAlarmFeedbackOptions({
      soundEnabled: settings.alarmSoundEnabled,
      vibrateEnabled: settings.alarmVibrateEnabled,
      overlayEnabled: settings.alarmOverlayEnabled,
    });
  } catch {
    // Native module unavailable (e.g. iOS / Expo Go).
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const refreshSettings = useCallback(async () => {
    const loaded = await loadSettings();
    setAlarmOverlayPreference(loaded.alarmOverlayEnabled);
    await syncNativeFeedbackPrefs(loaded);
    settingsRef.current = loaded;
    setSettings(loaded);
    setIsReady(true);
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  // Update React state synchronously so Switch controls don't snap back,
  // then persist / sync native prefs in the background.
  const persistPatch = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    setAlarmOverlayPreference(next.alarmOverlayEnabled);
    void syncNativeFeedbackPrefs(next);
    void saveSettings(next);
  }, []);

  const setTheme = useCallback(
    async (theme: ThemePreference) => {
      persistPatch({ theme });
    },
    [persistPatch],
  );

  const setDefaultSnooze = useCallback(
    async (minutes: SnoozeDurationMinutes) => {
      persistPatch({ defaultSnoozeMinutes: minutes });
    },
    [persistPatch],
  );

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      persistPatch({ notificationsEnabled: enabled });
    },
    [persistPatch],
  );

  const setAlarmOverlayEnabled = useCallback(
    async (enabled: boolean) => {
      persistPatch({ alarmOverlayEnabled: enabled });
    },
    [persistPatch],
  );

  const setAlarmSoundEnabled = useCallback(
    async (enabled: boolean) => {
      persistPatch({ alarmSoundEnabled: enabled });
    },
    [persistPatch],
  );

  const setAlarmVibrateEnabled = useCallback(
    async (enabled: boolean) => {
      persistPatch({ alarmVibrateEnabled: enabled });
    },
    [persistPatch],
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
      setAlarmSoundEnabled,
      setAlarmVibrateEnabled,
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
      setAlarmSoundEnabled,
      setAlarmVibrateEnabled,
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
