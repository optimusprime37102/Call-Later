import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  cancelAlarm,
  isAndroidAlarmSupported,
  scheduleAlarm,
} from 'call-later-alarm';
import type { Reminder } from '@/src/types/reminder';
import { formatReminderWhen } from '@/src/utils/dates';

export const NOTIFICATION_CATEGORY = 'call-reminder';
export const ACTION_CALL_NOW = 'CALL_NOW';
export const ACTION_SNOOZE = 'SNOOZE';
export const ACTION_SNOOZE_10 = 'SNOOZE_10';
export const ACTION_SNOOZE_30 = 'SNOOZE_30';
export const ACTION_SNOOZE_60 = 'SNOOZE_60';

// Bump channel id when sound/importance changes — Android won't update an
// existing channel's sound after it has been created.
const ANDROID_CHANNEL_ID = 'call-reminders-v3';
const ALARM_SOUND = 'alarm.wav';

/** Synced from settings — when true, foreground banners are hidden (overlay covers the alert). */
let alarmOverlayPreferred = true;

export function setAlarmOverlayPreference(enabled: boolean): void {
  alarmOverlayPreferred = enabled;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: !alarmOverlayPreferred,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Call reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: '#0D9488',
      sound: ALARM_SOUND,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
    });
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
    sound: ALARM_SOUND,
    ...(Platform.OS === 'android'
      ? {
          channelId: ANDROID_CHANNEL_ID,
          color: '#0D9488',
          priority: Notifications.AndroidNotificationPriority.MAX,
        }
      : {}),
  };
}

export async function scheduleReminderNotification(
  reminder: Reminder,
  options?: { alarmOverlayEnabled?: boolean },
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

  const overlayEnabled = options?.alarmOverlayEnabled === true;

  // Android full-screen overlay path: AlarmManager + USE_FULL_SCREEN_INTENT
  // so the alarm UI can open over lock screen / other apps when it fires.
  if (overlayEnabled && isAndroidAlarmSupported) {
    const content = buildReminderNotificationContent(reminder);
    try {
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
    } catch (error) {
      console.warn('Native full-screen alarm failed; falling back to notification', error);
    }
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: buildReminderNotificationContent(reminder),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });

  return id;
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
    'Android may delay exact-time delivery when the device is in Doze or battery optimization modes.',
    'Full-screen alarm needs “Full screen notifications / Alarms & reminders” allowed in system settings.',
    'Keep Call Later unrestricted in battery settings for more reliable reminders.',
  ].join(' ');
}

export function formatScheduledLabel(scheduledAt: number): string {
  return formatReminderWhen(scheduledAt);
}
