export type ThemePreference = 'light' | 'dark' | 'system';

export type SnoozeDurationMinutes = 10 | 30 | 60;

export interface AppSettings {
  theme: ThemePreference;
  defaultSnoozeMinutes: SnoozeDurationMinutes;
  notificationsEnabled: boolean;
  /** Full-screen alarm UI when a reminder notification fires or is opened */
  alarmOverlayEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultSnoozeMinutes: 10,
  notificationsEnabled: true,
  alarmOverlayEnabled: true,
};
