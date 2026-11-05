import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getDatabase } from '@/src/db/database';
import {
  createScheduledReminder,
  getReminder,
  groupPendingReminders,
  listCompletedReminders,
  listPendingReminders,
  markReminderCompleted,
  rehydratePendingNotifications,
  removeReminder,
  snoozeReminder,
  updateScheduledReminder,
} from '@/src/services/reminderService';
import { consumePendingActions } from 'call-later-alarm';
import { configureNotifications } from '@/src/services/notifications';
import type {
  CreateReminderInput,
  GroupedReminders,
  Reminder,
  UpdateReminderInput,
} from '@/src/types/reminder';
import { useAppTheme } from './ThemeContext';

interface RemindersContextValue {
  pending: Reminder[];
  completed: Reminder[];
  grouped: GroupedReminders;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createReminder: (input: CreateReminderInput) => Promise<Reminder>;
  updateReminder: (id: string, input: UpdateReminderInput) => Promise<Reminder>;
  completeReminder: (id: string) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<void>;
  snooze: (id: string, minutes: number) => Promise<Reminder>;
  getById: (id: string) => Promise<Reminder | null>;
}

const RemindersContext = createContext<RemindersContextValue | null>(null);

export function RemindersProvider({ children }: { children: React.ReactNode }) {
  const { settings, isReady: themeReady } = useAppTheme();
  const [pending, setPending] = useState<Reminder[]>([]);
  const [completed, setCompleted] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [pendingRows, completedRows] = await Promise.all([
        listPendingReminders(),
        listCompletedReminders(),
      ]);
      setPending(pendingRows);
      setCompleted(completedRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reminders';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, []);

  const applyingNativeActionsRef = useRef(false);

  /** Sync Stop/Snooze/Completed from native notification/overlay into SQLite + UI. */
  const applyPendingNativeActions = useCallback(async (): Promise<boolean> => {
    if (applyingNativeActionsRef.current) return false;
    applyingNativeActionsRef.current = true;
    let changed = false;
    try {
      const pendingActions = await consumePendingActions();
      for (const id of pendingActions.completedIds) {
        try {
          await markReminderCompleted(id);
          changed = true;
        } catch {
          // Reminder may already be completed/removed.
        }
      }
      for (const [id, triggerAt] of Object.entries(pendingActions.snoozed)) {
        try {
          await updateScheduledReminder(
            id,
            {
              scheduledAt: Number(triggerAt),
              status: 'pending',
              completedAt: null,
              notificationId: `native:${id}`,
            },
            { rescheduleNotification: false },
          );
          changed = true;
        } catch {
          // Reminder may no longer exist.
        }
      }
      if (changed) {
        await refresh();
      }
    } catch {
      // Native module may be unavailable before rebuild.
    } finally {
      applyingNativeActionsRef.current = false;
    }
    return changed;
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!themeReady) return;
      try {
        await getDatabase();
        await configureNotifications();

        await applyPendingNativeActions();

        await rehydratePendingNotifications(
          settings.notificationsEnabled,
          settings.alarmOverlayEnabled,
        );
        if (!cancelled) {
          await refresh();
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to start app data';
          setError(message);
          setIsLoading(false);
          setIsReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    themeReady,
    refresh,
    applyPendingNativeActions,
    settings.notificationsEnabled,
    settings.alarmOverlayEnabled,
  ]);

  // Native Snooze/Stop while app is open (or returns to foreground) must update Today tab.
  useEffect(() => {
    if (!isReady) return;

    const sync = () => {
      void applyPendingNativeActions();
    };

    sync();
    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') sync();
    };
    const appStateSub = AppState.addEventListener('change', onAppState);
    const interval = setInterval(sync, 2000);

    return () => {
      appStateSub.remove();
      clearInterval(interval);
    };
  }, [isReady, applyPendingNativeActions]);

  const createReminder = useCallback(
    async (input: CreateReminderInput) => {
      const reminder = await createScheduledReminder(input, {
        scheduleNotification: settings.notificationsEnabled,
        alarmOverlayEnabled: settings.alarmOverlayEnabled,
      });
      await refresh();
      return reminder;
    },
    [refresh, settings.alarmOverlayEnabled, settings.notificationsEnabled],
  );

  const updateReminder = useCallback(
    async (id: string, input: UpdateReminderInput) => {
      const reminder = await updateScheduledReminder(id, input, {
        rescheduleNotification: settings.notificationsEnabled,
        alarmOverlayEnabled: settings.alarmOverlayEnabled,
      });
      await refresh();
      return reminder;
    },
    [refresh, settings.alarmOverlayEnabled, settings.notificationsEnabled],
  );

  const completeReminder = useCallback(
    async (id: string) => {
      const reminder = await markReminderCompleted(id);
      await refresh();
      return reminder;
    },
    [refresh],
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      await removeReminder(id);
      await refresh();
    },
    [refresh],
  );

  const snooze = useCallback(
    async (id: string, minutes: number) => {
      const reminder = await snoozeReminder(id, minutes, {
        alarmOverlayEnabled: settings.alarmOverlayEnabled,
      });
      await refresh();
      return reminder;
    },
    [refresh, settings.alarmOverlayEnabled],
  );

  const getById = useCallback(async (id: string) => getReminder(id), []);

  const grouped = useMemo(() => groupPendingReminders(pending), [pending]);

  const value = useMemo<RemindersContextValue>(
    () => ({
      pending,
      completed,
      grouped,
      isLoading,
      isReady,
      error,
      refresh,
      createReminder,
      updateReminder,
      completeReminder,
      deleteReminder,
      snooze,
      getById,
    }),
    [
      pending,
      completed,
      grouped,
      isLoading,
      isReady,
      error,
      refresh,
      createReminder,
      updateReminder,
      completeReminder,
      deleteReminder,
      snooze,
      getById,
    ],
  );

  return (
    <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>
  );
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) {
    throw new Error('useReminders must be used within RemindersProvider');
  }
  return ctx;
}
