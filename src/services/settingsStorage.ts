import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAlarmSoundId } from '@/src/constants/alarmSounds';
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

function isBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
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
      notificationsEnabled: isBoolean(
        parsed.notificationsEnabled,
        DEFAULT_SETTINGS.notificationsEnabled,
      ),
      alarmOverlayEnabled: isBoolean(
        parsed.alarmOverlayEnabled,
        DEFAULT_SETTINGS.alarmOverlayEnabled,
      ),
      alarmSoundEnabled: isBoolean(
        parsed.alarmSoundEnabled,
        DEFAULT_SETTINGS.alarmSoundEnabled,
      ),
      alarmVibrateEnabled: isBoolean(
        parsed.alarmVibrateEnabled,
        DEFAULT_SETTINGS.alarmVibrateEnabled,
      ),
      alarmSoundId: isAlarmSoundId(parsed.alarmSoundId)
        ? parsed.alarmSoundId
        : DEFAULT_SETTINGS.alarmSoundId,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
