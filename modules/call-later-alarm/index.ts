import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type ScheduleAlarmParams = {
  id: string;
  triggerAt: number;
  title: string;
  body: string;
  reminderId: string;
  contactName: string;
  phoneNumber: string;
  notes?: string | null;
};

export type PendingAlarmActions = {
  completedIds: string[];
  snoozed: Record<string, number>;
};

export type AlarmFeedbackOptions = {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  /** Full-screen overlay on/off — read at fire time by native AlarmReceiver. */
  overlayEnabled?: boolean;
};

export type PendingReminderOpen = {
  reminderId: string;
  alarmId: string;
};

type CallLaterAlarmNative = {
  scheduleAlarm: (params: ScheduleAlarmParams) => Promise<string>;
  cancelAlarm: (id: string) => Promise<void>;
  setAlarmFeedbackOptions: (params: AlarmFeedbackOptions) => Promise<void>;
  startAlarmFeedback: () => Promise<void>;
  stopAlarmFeedback: () => Promise<void>;
  canUseFullScreenIntent: () => Promise<boolean>;
  openFullScreenIntentSettings: () => Promise<void>;
  canDrawOverlays: () => Promise<boolean>;
  openOverlaySettings: () => Promise<void>;
  consumePendingActions: () => Promise<PendingAlarmActions>;
  dismissAlarmOverlay: (alarmId?: string | null) => Promise<void>;
  consumePendingReminderOpen: () => Promise<PendingReminderOpen | null>;
};

function loadNative(): CallLaterAlarmNative | null {
  if (Platform.OS !== 'android') return null;
  try {
    return requireNativeModule<CallLaterAlarmNative>('CallLaterAlarm');
  } catch {
    return null;
  }
}

const native = loadNative();

export async function scheduleAlarm(params: ScheduleAlarmParams): Promise<string> {
  if (!native) return `native:${params.id}`;
  return native.scheduleAlarm(params);
}

export async function cancelAlarm(id: string): Promise<void> {
  if (!native) return;
  await native.cancelAlarm(id);
}

export async function setAlarmFeedbackOptions(
  options: AlarmFeedbackOptions,
): Promise<void> {
  if (!native) return;
  await native.setAlarmFeedbackOptions(options);
}

export async function startAlarmFeedback(): Promise<void> {
  if (!native) return;
  await native.startAlarmFeedback();
}

export async function stopAlarmFeedback(): Promise<void> {
  if (!native) return;
  await native.stopAlarmFeedback();
}

export async function canUseFullScreenIntent(): Promise<boolean> {
  if (!native) return false;
  return native.canUseFullScreenIntent();
}

export async function openFullScreenIntentSettings(): Promise<void> {
  if (!native) return;
  await native.openFullScreenIntentSettings();
}

export async function canDrawOverlays(): Promise<boolean> {
  if (!native) return false;
  return native.canDrawOverlays();
}

export async function openOverlaySettings(): Promise<void> {
  if (!native) return;
  await native.openOverlaySettings();
}

export async function consumePendingActions(): Promise<PendingAlarmActions> {
  if (!native) return { completedIds: [], snoozed: {} };
  const result = await native.consumePendingActions();
  return {
    completedIds: result?.completedIds ?? [],
    snoozed: (result?.snoozed as Record<string, number>) ?? {},
  };
}

export async function dismissAlarmOverlay(alarmId?: string | null): Promise<void> {
  if (!native) return;
  await native.dismissAlarmOverlay(alarmId ?? null);
}

export async function consumePendingReminderOpen(): Promise<PendingReminderOpen | null> {
  if (!native) return null;
  const result = await native.consumePendingReminderOpen();
  if (!result?.reminderId) return null;
  return {
    reminderId: result.reminderId,
    alarmId: result.alarmId ?? result.reminderId,
  };
}

export const isAndroidAlarmSupported = Platform.OS === 'android';
