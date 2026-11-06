import type { Reminder } from '@/src/types/reminder';
import { formatReminderWhen } from '@/src/utils/dates';
import {
    cancelAlarm,
    isAndroidAlarmSupported,
    scheduleAlarm,
} from 'call-later-alarm';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NOTIFICATION_CATEGORY = 'call-reminder';
export const ACTION_CALL_NOW = 'CALL_NOW';
export const ACTION_SNOOZE = 'SNOOZE';
export const ACTION_SNOOZE_10 = 'SNOOZE_10';
export const ACTION_SNOOZE_30 = 'SNOOZE_30';
export const ACTION_SNOOZE_60 = 'SNOOZE_60';

// Keep in sync with AlarmFeedbackPrefs channel ids (native).
// Bump when sound/vibrate behavior changes — Android won't update existing channels.
const CHANNEL_SOUND_VIBRATE_PREFIX = 'call-later-alert-sv-v2';
const CHANNEL_SOUND_ONLY_PREFIX = 'call-later-alert-s-v2';
const CHANNEL_VIBRATE_ONLY = 'call-later-alert-v-v2';
const CHANNEL_MUTE = 'call-later-alert-mute-v2';
const DEFAULT_ALARM_SOUND_FILE = 'alarm.wav';
const VIBRATE_PATTERN = [0, 400, 200, 400, 200, 400];

/** Synced from settings — when true, foreground banners are hidden (overlay covers the alert). */
let alarmOverlayPreferred = true;
let alarmSoundPreferred = true;
let alarmVibratePreferred = true;
let alarmSoundFileName = DEFAULT_ALARM_SOUND_FILE;

function soundChannelSuffix(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').toLowerCase();
}

export function setAlarmOverlayPreference(enabled: boolean): void {
  alarmOverlayPreferred = enabled;
}

export function setAlarmFeedbackNotificationPreferences(options: {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  soundFileName?: string;
}): void {
  const previousSound = alarmSoundFileName;
  alarmSoundPreferred = options.soundEnabled;
  alarmVibratePreferred = options.vibrateEnabled;
  if (options.soundFileName) {
    alarmSoundFileName = options.soundFileName;
  }
  if (
    Platform.OS === 'android' &&
    configured &&
    options.soundFileName &&
    options.soundFileName !== previousSound
  ) {
    // Channel setup is heavy — never block the UI thread on tone taps.
    setTimeout(() => {
      void ensureAndroidAlertChannels();
    }, 0);
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: !alarmOverlayPreferred,
    shouldShowList: true,
    shouldPlaySound: alarmSoundPreferred,
    shouldSetBadge: false,
  }),
});

let configured = false;

function androidChannelIdForPrefs(): string {
  const tone = soundChannelSuffix(alarmSoundFileName);
  if (alarmSoundPreferred && alarmVibratePreferred) {
    return `${CHANNEL_SOUND_VIBRATE_PREFIX}-${tone}`;
  }
  if (alarmSoundPreferred && !alarmVibratePreferred) {
    return `${CHANNEL_SOUND_ONLY_PREFIX}-${tone}`;
  }
  if (!alarmSoundPreferred && alarmVibratePreferred) return CHANNEL_VIBRATE_ONLY;
  return CHANNEL_MUTE;
}

async function ensureAndroidAlertChannels(): Promise<void> {
  const audioAttributes = {
    usage: Notifications.AndroidAudioUsage.ALARM,
    contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    flags: {
      enforceAudibility: true,
      requestHardwareAudioVideoSynchronization: false,
    },
  } as const;

  const tone = soundChannelSuffix(alarmSoundFileName);
  const soundVibrateId = `${CHANNEL_SOUND_VIBRATE_PREFIX}-${tone}`;
  const soundOnlyId = `${CHANNEL_SOUND_ONLY_PREFIX}-${tone}`;

  await Notifications.setNotificationChannelAsync(soundVibrateId, {
    name: 'Call reminders',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: VIBRATE_PATTERN,
    lightColor: '#0D9488',
    sound: alarmSoundFileName,
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes,
  });

  await Notifications.setNotificationChannelAsync(soundOnlyId, {
    name: 'Call reminders (sound)',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0],
    lightColor: '#0D9488',
    sound: alarmSoundFileName,
    enableVibrate: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_VIBRATE_ONLY, {
    name: 'Call reminders (vibrate)',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: VIBRATE_PATTERN,
    lightColor: '#0D9488',
    sound: null,
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_MUTE, {
    name: 'Call reminders (silent)',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0],
    lightColor: '#0D9488',
    sound: null,
    enableVibrate: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function configureNotifications(): Promise<void> {
  if (configured) return;

  if (Platform.OS === 'android') {
    await ensureAndroidAlertChannels();
  }

  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
    {
      identifier: ACTION_CALL_NOW,
      buttonTitle: 'Call Now',
      options: { opensAppToForeground: true },
    },
    {
      identifier: ACTION_SNOOZE_10,
      buttonTitle: 'Snooze 10m',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_SNOOZE_30,
      buttonTitle: 'Snooze 30m',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_SNOOZE_60,
      buttonTitle: 'Snooze 1h',
      options: { opensAppToForeground: false },
    },
  ]);

  configured = true;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice && Platform.OS !== 'android') {
    // Emulators often still support local notifications on Android.
  }

  await configureNotifications();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export function buildReminderNotificationContent(reminder: Reminder) {
  const bodyParts = [
    `Time to call ${reminder.contactName}`,
    reminder.phoneNumber,
  ];
  if (reminder.notes) {
    bodyParts.push(reminder.notes);
  }

  const channelId = androidChannelIdForPrefs();

  return {
    title: 'Call Later',
    body: bodyParts.join(' · '),
    data: {
      reminderId: reminder.id,
      phoneNumber: reminder.phoneNumber,
      contactName: reminder.contactName,
      notes: reminder.notes,
    },
    categoryIdentifier: NOTIFICATION_CATEGORY,
    sound: alarmSoundPreferred ? alarmSoundFileName : undefined,
    ...(Platform.OS === 'android'
      ? {
          channelId,
          color: '#0D9488',
          priority: Notifications.AndroidNotificationPriority.MAX,
          ...(alarmVibratePreferred
            ? { vibrate: VIBRATE_PATTERN }
            : { vibrate: [] }),
        }
      : {}),
  };
}

export async function scheduleReminderNotification(
  reminder: Reminder,
  // Callers still pass this; native reads overlay pref at fire time.
  _options?: { alarmOverlayEnabled?: boolean },
): Promise<string | null> {
  const triggerDate = new Date(reminder.scheduledAt);
  if (triggerDate.getTime() <= Date.now() + 1500) {
    return null;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) {
    throw new Error('Notification permission is required to schedule reminders');
  }

  await configureNotifications();

  if (reminder.notificationId) {
    await cancelNotification(reminder.notificationId, reminder.id);
  }

  // Android: AlarmManager.setAlarmClock only (Doze-exempt). Never fall back to
  // Expo date triggers — those are delayed under Doze / battery optimization.
  if (isAndroidAlarmSupported) {
    const content = buildReminderNotificationContent(reminder);
    return await scheduleAlarm({
      id: reminder.id,
      triggerAt: reminder.scheduledAt,
      title: content.title,
      body: content.body,
      reminderId: reminder.id,
      contactName: reminder.contactName,
      phoneNumber: reminder.phoneNumber,
      notes: reminder.notes,
    });
  }

  const content = buildReminderNotificationContent(reminder);
  return await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelNotification(
  notificationId: string | null | undefined,
  reminderId?: string | null,
): Promise<void> {
  if (!notificationId && !reminderId) return;

  if (
    notificationId?.startsWith('native:') ||
    (reminderId && notificationId == null)
  ) {
    try {
      await cancelAlarm(notificationId ?? reminderId ?? '');
    } catch {
      // Already cancelled.
    }
  }

  if (reminderId) {
    try {
      await cancelAlarm(reminderId);
    } catch {
      // Ignore.
    }
  }

  if (notificationId && !notificationId.startsWith('native:')) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {
      // Notification may already have fired or been removed.
    }
  }
}

export async function cancelAllReminderNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function getSnoozeMinutesFromAction(actionId: string | null): number | null {
  switch (actionId) {
    case ACTION_SNOOZE:
    case ACTION_SNOOZE_10:
      return 10;
    case ACTION_SNOOZE_30:
      return 30;
    case ACTION_SNOOZE_60:
      return 60;
    default:
      return null;
  }
}

export function describeNotificationLimitations(): string {
  return [
    'Allow “Alarms & reminders” and set battery to Unrestricted so alerts fire on time in Doze.',
    'Full-screen overlay also needs “Full screen notifications” / display-over-apps when enabled.',
  ].join(' ');
}

export function formatScheduledLabel(scheduledAt: number): string {
  return formatReminderWhen(scheduledAt);
}
