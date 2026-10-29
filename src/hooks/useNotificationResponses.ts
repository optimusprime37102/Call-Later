import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useReminders } from '@/src/context/RemindersContext';
import { useAppTheme } from '@/src/context/ThemeContext';
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
 * Handles notification action buttons / taps for the classic (non-overlay) path.
 * When full-screen alarm overlay is enabled, Android shows a native overlay
 * service/activity and does not open the React Native app.
 */
export function useNotificationResponses() {
  const { snooze, getById, refresh } = useReminders();
  const { settings } = useAppTheme();
  const handlingRef = useRef(false);

  useEffect(() => {
    // Native overlay owns the alarm UX — ignore JS handlers for those alarms.
    if (settings.alarmOverlayEnabled) {
      return;
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
          router.push(`/reminder/${reminderId}`);
          return;
        }

        const snoozeMinutes = getSnoozeMinutesFromAction(actionId);
        if (snoozeMinutes != null) {
          await snooze(reminderId, snoozeMinutes);
          return;
        }

        if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          await refresh();
          router.push(`/reminder/${reminderId}`);
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

    return () => {
      responseSub.remove();
    };
  }, [
    getById,
    refresh,
    settings.alarmOverlayEnabled,
    settings.defaultSnoozeMinutes,
    snooze,
  ]);
}
