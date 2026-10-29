import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

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

type CallLaterAlarmNative = {
  scheduleAlarm: (params: ScheduleAlarmParams) => Promise<string>;
  cancelAlarm: (id: string) => Promise<void>;
  startAlarmFeedback: () => Promise<void>;
  stopAlarmFeedback: () => Promise<void>;
  canUseFullScreenIntent: () => Promise<boolean>;
  openFullScreenIntentSettings: () => Promise<void>;
  canDrawOverlays: () => Promise<boolean>;
  openOverlaySettings: () => Promise<void>;
  consumePendingActions: () => Promise<PendingAlarmActions>;
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

export const isAndroidAlarmSupported = Platform.OS === 'android';
