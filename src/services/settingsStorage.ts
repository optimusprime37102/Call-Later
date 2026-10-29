import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  SnoozeDurationMinutes,
  ThemePreference,
} from '@/src/types/settings';

const SETTINGS_KEY = '@calllater/settings';

function isTheme(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isSnooze(value: unknown): value is SnoozeDurationMinutes {
  return value === 10 || value === 30 || value === 60;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
      defaultSnoozeMinutes: isSnooze(parsed.defaultSnoozeMinutes)
        ? parsed.defaultSnoozeMinutes
        : DEFAULT_SETTINGS.defaultSnoozeMinutes,
      notificationsEnabled:
        typeof parsed.notificationsEnabled === 'boolean'
          ? parsed.notificationsEnabled
          : DEFAULT_SETTINGS.notificationsEnabled,
      alarmOverlayEnabled:
        typeof parsed.alarmOverlayEnabled === 'boolean'
          ? parsed.alarmOverlayEnabled
          : DEFAULT_SETTINGS.alarmOverlayEnabled,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
