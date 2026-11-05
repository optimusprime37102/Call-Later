import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  consumePendingReminderOpen,
  dismissAlarmOverlay,
} from 'call-later-alarm';
import { useReminders } from '@/src/context/RemindersContext';
import {
  ACTION_CALL_NOW,
  getSnoozeMinutesFromAction,
} from '@/src/services/notifications';
import { openDialer } from '@/src/services/dialer';

const handledResponses = new Set<string>();

function responseKey(response: Notifications.NotificationResponse): string {
  return `${response.notification.request.identifier}:${response.actionIdentifier}:${response.notification.date}`;
}

function readReminderData(notification: Notifications.Notification) {
  const data = notification.request.content.data as {
    reminderId?: string;
    phoneNumber?: string;
    contactName?: string;
    notes?: string | null;
  };
  return data;
}

/**
 * Notification taps (full-screen on or off) open reminder detail in-app.
 * Any native overlay that was showing is dismissed automatically.
 */
export function useNotificationResponses() {
  const { snooze, getById, refresh } = useReminders();
  const handlingRef = useRef(false);

  useEffect(() => {
    async function openReminderDetail(reminderId: string, alarmId?: string | null) {
      try {
        await dismissAlarmOverlay(alarmId ?? reminderId);
      } catch {
        // Native module may be unavailable.
      }
      await refresh();
      router.push(`/reminder/${reminderId}`);
    }

    async function consumeNativeTap() {
      try {
        const pending = await consumePendingReminderOpen();
        if (!pending?.reminderId) return;
        await openReminderDetail(pending.reminderId, pending.alarmId);
      } catch (error) {
        console.warn('Failed to consume pending reminder open', error);
      }
    }

    async function handleResponse(response: Notifications.NotificationResponse) {
      const key = responseKey(response);
      if (handledResponses.has(key) || handlingRef.current) return;

      handledResponses.add(key);
      handlingRef.current = true;

      try {
        const data = readReminderData(response.notification);
        const reminderId = data?.reminderId;
        const actionId = response.actionIdentifier;

        if (!reminderId) return;

        if (actionId === ACTION_CALL_NOW) {
          const reminder = await getById(reminderId);
          const phone = reminder?.phoneNumber ?? data.phoneNumber;
          if (phone) {
            try {
              await openDialer(phone);
            } catch (error) {
              console.warn('Failed to open dialer from notification', error);
            }
          }
          await openReminderDetail(reminderId);
          return;
        }

        const snoozeMinutes = getSnoozeMinutesFromAction(actionId);
        if (snoozeMinutes != null) {
          try {
            await dismissAlarmOverlay(reminderId);
          } catch {
            // Ignore.
          }
          await snooze(reminderId, snoozeMinutes);
          return;
        }

        if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          await openReminderDetail(reminderId);
        }
      } catch (error) {
        handledResponses.delete(key);
        console.warn('Failed to handle notification response', error);
      } finally {
        handlingRef.current = false;
        try {
          await Notifications.clearLastNotificationResponseAsync();
        } catch {
          // Older clients may not support clearing.
        }
      }
    }

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        void handleResponse(response);
      }
    });

    void consumeNativeTap();
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void consumeNativeTap();
      }
    };
    const appStateSub = AppState.addEventListener('change', onAppState);

    return () => {
      responseSub.remove();
      appStateSub.remove();
    };
  }, [getById, refresh, snooze]);
}
