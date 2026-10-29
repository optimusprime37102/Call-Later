import type {
  CreateReminderInput,
  Reminder,
  ReminderStatus,
  UpdateReminderInput,
} from '@/src/types/reminder';
import { createId } from '@/src/utils/id';
import { getDatabase } from './database';

type ReminderRow = {
  id: string;
  contact_name: string;
  phone_number: string;
  scheduled_at: number;
  notes: string | null;
  status: ReminderStatus;
  notification_id: string | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
};

function mapRow(row: ReminderRow): Reminder {
  return {
    id: row.id,
    contactName: row.contact_name,
    phoneNumber: row.phone_number,
    scheduledAt: row.scheduled_at,
    notes: row.notes,
    status: row.status,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export async function getAllReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM reminders ORDER BY scheduled_at ASC`,
  );
  return rows.map(mapRow);
}

export async function getPendingReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM reminders WHERE status = 'pending' ORDER BY scheduled_at ASC`,
  );
  return rows.map(mapRow);
}

export async function getCompletedReminders(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM reminders
     WHERE status = 'completed'
     ORDER BY completed_at DESC, updated_at DESC`,
  );
  return rows.map(mapRow);
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReminderRow>(
    `SELECT * FROM reminders WHERE id = ?`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const db = await getDatabase();
  const now = Date.now();
  const reminder: Reminder = {
    id: createId(),
    contactName: input.contactName.trim(),
    phoneNumber: input.phoneNumber.trim(),
    scheduledAt: input.scheduledAt,
    notes: input.notes?.trim() || null,
    status: 'pending',
    notificationId: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  await db.runAsync(
    `INSERT INTO reminders (
      id, contact_name, phone_number, scheduled_at, notes, status,
      notification_id, created_at, updated_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id,
      reminder.contactName,
      reminder.phoneNumber,
      reminder.scheduledAt,
      reminder.notes,
      reminder.status,
      reminder.notificationId,
      reminder.createdAt,
      reminder.updatedAt,
      reminder.completedAt,
    ],
  );

  return reminder;
}

export async function updateReminder(
  id: string,
  input: UpdateReminderInput,
): Promise<Reminder | null> {
  const existing = await getReminderById(id);
  if (!existing) return null;

  const updated: Reminder = {
    ...existing,
    contactName: input.contactName?.trim() ?? existing.contactName,
    phoneNumber: input.phoneNumber?.trim() ?? existing.phoneNumber,
    scheduledAt: input.scheduledAt ?? existing.scheduledAt,
    notes:
      input.notes !== undefined
        ? input.notes?.trim() || null
        : existing.notes,
    status: input.status ?? existing.status,
    notificationId:
      input.notificationId !== undefined
        ? input.notificationId
        : existing.notificationId,
    completedAt:
      input.completedAt !== undefined ? input.completedAt : existing.completedAt,
    updatedAt: Date.now(),
  };

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE reminders SET
      contact_name = ?,
      phone_number = ?,
      scheduled_at = ?,
      notes = ?,
      status = ?,
      notification_id = ?,
      updated_at = ?,
      completed_at = ?
     WHERE id = ?`,
    [
      updated.contactName,
      updated.phoneNumber,
      updated.scheduledAt,
      updated.notes,
      updated.status,
      updated.notificationId,
      updated.updatedAt,
      updated.completedAt,
      updated.id,
    ],
  );

  return updated;
}

export async function deleteReminder(id: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.runAsync(`DELETE FROM reminders WHERE id = ?`, [id]);
  return result.changes > 0;
}

export async function completeReminder(id: string): Promise<Reminder | null> {
  return updateReminder(id, {
    status: 'completed',
    completedAt: Date.now(),
    notificationId: null,
  });
}

export async function setReminderNotificationId(
  id: string,
  notificationId: string | null,
): Promise<void> {
  await updateReminder(id, { notificationId });
}
