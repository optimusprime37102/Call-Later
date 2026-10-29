export type ReminderStatus = 'pending' | 'completed';

export interface Reminder {
  id: string;
  contactName: string;
  phoneNumber: string;
  scheduledAt: number;
  notes: string | null;
  status: ReminderStatus;
  notificationId: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface CreateReminderInput {
  contactName: string;
  phoneNumber: string;
  scheduledAt: number;
  notes?: string | null;
}

export interface UpdateReminderInput {
  contactName?: string;
  phoneNumber?: string;
  scheduledAt?: number;
  notes?: string | null;
  status?: ReminderStatus;
  notificationId?: string | null;
  completedAt?: number | null;
}

export type ReminderSection = 'overdue' | 'today' | 'upcoming';

export interface GroupedReminders {
  overdue: Reminder[];
  today: Reminder[];
  upcoming: Reminder[];
}
