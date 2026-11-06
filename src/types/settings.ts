import {
  AlarmSoundId,
  DEFAULT_ALARM_SOUND_ID,
} from '@/src/constants/alarmSounds';

export type ThemePreference = 'light' | 'dark' | 'system';

export type SnoozeDurationMinutes = 10 | 30 | 60;

export type { AlarmSoundId };

export interface AppSettings {
  theme: ThemePreference;
  defaultSnoozeMinutes: SnoozeDurationMinutes;
  notificationsEnabled: boolean;
  /** Full-screen alarm UI when a reminder notification fires or is opened */
  alarmOverlayEnabled: boolean;
  /** Play looping alarm tone while the alert overlay is active */
  alarmSoundEnabled: boolean;
  /** Vibrate while the alert overlay is active */
  alarmVibrateEnabled: boolean;
  /** Selected alarm tone id from assets/sounds */
  alarmSoundId: AlarmSoundId;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultSnoozeMinutes: 10,
  notificationsEnabled: true,
  alarmOverlayEnabled: true,
  alarmSoundEnabled: true,
  alarmVibrateEnabled: true,
  alarmSoundId: DEFAULT_ALARM_SOUND_ID,
};
