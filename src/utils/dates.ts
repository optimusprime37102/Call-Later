import {
  addDays,
  addHours,
  addMinutes,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  setHours,
  setMinutes,
  setSeconds,
  startOfDay,
  isBefore,
} from 'date-fns';

export type QuickScheduleOption =
  | '15m'
  | '30m'
  | '1h'
  | '3h'
  | 'tonight'
  | 'tomorrow'
  | 'custom';

export const QUICK_SCHEDULE_OPTIONS: {
  id: QuickScheduleOption;
  label: string;
}[] = [
  { id: '15m', label: '15 min' },
  { id: '30m', label: '30 min' },
  { id: '1h', label: '1 hour' },
  { id: '3h', label: '3 hours' },
  { id: 'tonight', label: 'Tonight' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'custom', label: 'Custom' },
];

export function resolveQuickSchedule(
  option: Exclude<QuickScheduleOption, 'custom'>,
  from: Date = new Date(),
): Date {
  switch (option) {
    case '15m':
      return addMinutes(from, 15);
    case '30m':
      return addMinutes(from, 30);
    case '1h':
      return addHours(from, 1);
    case '3h':
      return addHours(from, 3);
    case 'tonight': {
      let tonight = setSeconds(setMinutes(setHours(from, 20), 0), 0);
      if (!isBefore(from, tonight)) {
        tonight = addDays(tonight, 1);
      }
      return tonight;
    }
    case 'tomorrow':
      return setSeconds(setMinutes(setHours(addDays(from, 1), 9), 0), 0);
    default:
      return addMinutes(from, 15);
  }
}

export function formatReminderWhen(timestamp: number, now: Date = new Date()): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return `Today · ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow · ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday · ${format(date, 'h:mm a')}`;
  }
  if (isSameDay(date, addDays(now, -1))) {
    return `Yesterday · ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d · h:mm a');
}

export function formatRelativeStatus(timestamp: number, now: Date = new Date()): string {
  const date = new Date(timestamp);
  const diffMs = date.getTime() - now.getTime();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);

  if (diffMs < 0) {
    if (absMinutes < 60) return `${absMinutes}m overdue`;
    const hours = Math.floor(absMinutes / 60);
    if (hours < 24) return `${hours}h overdue`;
    const days = Math.floor(hours / 24);
    return `${days}d overdue`;
  }

  if (absMinutes < 60) return `in ${Math.max(absMinutes, 1)}m`;
  const hours = Math.floor(absMinutes / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

export function isOverdue(timestamp: number, now: Date = new Date()): boolean {
  return timestamp < now.getTime();
}

export function isScheduledToday(timestamp: number): boolean {
  return isToday(new Date(timestamp));
}

export function startOfToday(): number {
  return startOfDay(new Date()).getTime();
}

export function endOfToday(): number {
  return addDays(startOfDay(new Date()), 1).getTime() - 1;
}
