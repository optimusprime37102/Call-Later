import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { ReminderAlarmOverlay } from '@/src/components/ReminderAlarmOverlay';
import { useReminders } from '@/src/context/RemindersContext';
import type { Reminder } from '@/src/types/reminder';

export interface AlarmOverlayPayload {
  reminderId: string;
  contactName?: string;
  phoneNumber?: string;
  notes?: string | null;
}

interface AlarmOverlayContextValue {
  visible: boolean;
  showAlarm: (payload: AlarmOverlayPayload) => void;
  dismissAlarm: () => void;
}

const AlarmOverlayContext = createContext<AlarmOverlayContextValue | null>(null);

export function AlarmOverlayProvider({ children }: { children: React.ReactNode }) {
  const { getById } = useReminders();
  const [payload, setPayload] = useState<AlarmOverlayPayload | null>(null);
  const [reminder, setReminder] = useState<Reminder | null>(null);

  const dismissAlarm = useCallback(() => {
    setPayload(null);
    setReminder(null);
  }, []);

  const showAlarm = useCallback(
    (next: AlarmOverlayPayload) => {
      if (!next.reminderId) return;
      setPayload(next);
      void (async () => {
        const row = await getById(next.reminderId);
        setReminder(row);
      })();
    },
    [getById],
  );

  const value = useMemo(
    () => ({
      visible: Boolean(payload),
      showAlarm,
      dismissAlarm,
    }),
    [payload, showAlarm, dismissAlarm],
  );

  const displayName =
    reminder?.contactName ?? payload?.contactName ?? 'Contact';
  const displayPhone =
    reminder?.phoneNumber ?? payload?.phoneNumber ?? '';
  const displayNotes = reminder?.notes ?? payload?.notes ?? null;
  const displayScheduledAt = reminder?.scheduledAt ?? Date.now();

  return (
    <AlarmOverlayContext.Provider value={value}>
      {children}
      <ReminderAlarmOverlay
        visible={Boolean(payload)}
        reminderId={payload?.reminderId ?? null}
        contactName={displayName}
        phoneNumber={displayPhone}
        notes={displayNotes}
        scheduledAt={displayScheduledAt}
        onClose={dismissAlarm}
      />
    </AlarmOverlayContext.Provider>
  );
}

export function useAlarmOverlay(): AlarmOverlayContextValue {
  const ctx = useContext(AlarmOverlayContext);
  if (!ctx) {
    throw new Error('useAlarmOverlay must be used within AlarmOverlayProvider');
  }
  return ctx;
}
