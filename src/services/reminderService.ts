import { addMinutes } from 'date-fns';
import * as remindersRepo from '@/src/db/remindersRepository';
import type {
  CreateReminderInput,
  GroupedReminders,
  Reminder,
  UpdateReminderInput,
} from '@/src/types/reminder';
import { endOfToday, isOverdue, isScheduledToday, startOfToday } from '@/src/utils/dates';
import {
  cancelNotification,
  scheduleReminderNotification,
} from './notifications';

export async function listPendingReminders(): Promise<Reminder[]> {
  return remindersRepo.getPendingReminders();
}

export async function listCompletedReminders(): Promise<Reminder[]> {
  return remindersRepo.getCompletedReminders();
}

export async function getReminder(id: string): Promise<Reminder | null> {
  return remindersRepo.getReminderById(id);
}

export function groupPendingReminders(
  reminders: Reminder[],
  now: Date = new Date(),
): GroupedReminders {
  const overdue: Reminder[] = [];
  const today: Reminder[] = [];
  const upcoming: Reminder[] = [];

  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  for (const reminder of reminders) {
    if (reminder.status !== 'pending') continue;

    if (isOverdue(reminder.scheduledAt, now)) {
      overdue.push(reminder);
      continue;
    }

    if (
      isScheduledToday(reminder.scheduledAt) ||
      (reminder.scheduledAt >= todayStart && reminder.scheduledAt <= todayEnd)
    ) {
      today.push(reminder);
      continue;
    }

    upcoming.push(reminder);
  }

  return { overdue, today, upcoming };
}

export async function createScheduledReminder(
  input: CreateReminderInput,
  options?: { scheduleNotification?: boolean; alarmOverlayEnabled?: boolean },
): Promise<Reminder> {
  if (!input.contactName.trim()) {
    throw new Error('Name is required');
  }
  if (!input.phoneNumber.trim()) {
    throw new Error('Phone number is required');
  }
  if (input.scheduledAt <= Date.now()) {
    throw new Error('Choose a future date and time');
  }

  let reminder = await remindersRepo.createReminder(input);

  if (options?.scheduleNotification !== false) {
    try {
      const notificationId = await scheduleReminderNotification(reminder, {
        alarmOverlayEnabled: options?.alarmOverlayEnabled === true,
      });
      if (notificationId) {
        await remindersRepo.setReminderNotificationId(reminder.id, notificationId);
        reminder = (await remindersRepo.getReminderById(reminder.id)) ?? {
          ...reminder,
          notificationId,
        };
      }
    } catch (error) {
      // Keep the reminder even if notification scheduling fails.
      console.warn('Failed to schedule notification', error);
    }
  }

  return reminder;
}

export async function updateScheduledReminder(
  id: string,
  input: UpdateReminderInput,
  options?: { rescheduleNotification?: boolean; alarmOverlayEnabled?: boolean },
): Promise<Reminder> {
  const existing = await remindersRepo.getReminderById(id);
  if (!existing) {
    throw new Error('Reminder not found');
  }

  if (input.scheduledAt !== undefined && input.scheduledAt <= Date.now()) {
    throw new Error('Choose a future date and time');
  }

  const shouldReschedule =
    options?.rescheduleNotification !== false &&
    (input.scheduledAt !== undefined ||
      input.contactName !== undefined ||
      input.phoneNumber !== undefined ||
      input.notes !== undefined);

  if (shouldReschedule) {
    await cancelNotification(existing.notificationId, existing.id);
  }

  let updated = await remindersRepo.updateReminder(id, {
    ...input,
    ...(shouldReschedule ? { notificationId: null } : {}),
    ...(input.status === 'pending' ? { completedAt: null } : {}),
  });

  if (!updated) {
    throw new Error('Reminder not found');
  }

  if (shouldReschedule && updated.status === 'pending') {
    try {
      const notificationId = await scheduleReminderNotification(updated, {
        alarmOverlayEnabled: options?.alarmOverlayEnabled === true,
      });
      updated =
        (await remindersRepo.updateReminder(id, { notificationId })) ?? updated;
    } catch (error) {
      console.warn('Failed to reschedule notification', error);
    }
  }

  return updated;
}

export async function snoozeReminder(
  id: string,
  minutes: number,
  options?: { alarmOverlayEnabled?: boolean },
): Promise<Reminder> {
  const nextAt = addMinutes(new Date(), minutes).getTime();
  return updateScheduledReminder(
    id,
    {
      scheduledAt: nextAt,
      status: 'pending',
      completedAt: null,
    },
    {
      rescheduleNotification: true,
      alarmOverlayEnabled: options?.alarmOverlayEnabled === true,
    },
  );
}

export async function markReminderCompleted(id: string): Promise<Reminder> {
  const existing = await remindersRepo.getReminderById(id);
  if (!existing) {
    throw new Error('Reminder not found');
  }

  await cancelNotification(existing.notificationId, existing.id);
  const completed = await remindersRepo.completeReminder(id);
  if (!completed) {
    throw new Error('Reminder not found');
  }
  return completed;
}

export async function removeReminder(id: string): Promise<void> {
  const existing = await remindersRepo.getReminderById(id);
  if (!existing) return;
  await cancelNotification(existing.notificationId, existing.id);
  await remindersRepo.deleteReminder(id);
}

export async function rehydratePendingNotifications(
  enabled: boolean,
  alarmOverlayEnabled = true,
): Promise<void> {
  const pending = await remindersRepo.getPendingReminders();

  for (const reminder of pending) {
    if (!enabled) {
      await cancelNotification(reminder.notificationId, reminder.id);
      if (reminder.notificationId) {
        await remindersRepo.setReminderNotificationId(reminder.id, null);
      }
      continue;
    }

    if (reminder.scheduledAt <= Date.now()) {
      continue;
    }

    try {
      await cancelNotification(reminder.notificationId, reminder.id);
      const notificationId = await scheduleReminderNotification(reminder, {
        alarmOverlayEnabled,
      });
      if (notificationId !== reminder.notificationId) {
        await remindersRepo.setReminderNotificationId(reminder.id, notificationId);
      }
    } catch (error) {
      console.warn('Failed to rehydrate notification', reminder.id, error);
    }
  }
}
