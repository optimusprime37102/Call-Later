import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SnoozeSheet } from '@/src/components/SnoozeSheet';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { useDialog } from '@/src/context/DialogContext';
import { useReminders } from '@/src/context/RemindersContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { openDialer } from '@/src/services/dialer';
import type { Reminder } from '@/src/types/reminder';
import { SnoozeDurationMinutes } from '@/src/types/settings';
import {
  formatRelativeStatus,
  formatReminderWhen,
  isOverdue,
} from '@/src/utils/dates';
import { radius, shadows, spacing } from '@/src/theme/tokens';

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, settings } = useAppTheme();
  const { alert, confirm } = useDialog();
  const {
    getById,
    completeReminder,
    deleteReminder,
    snooze,
    refresh,
  } = useReminders();

  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const row = await getById(id);
    setReminder(row);
    setLoading(false);
  }, [getById, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<void>, successMessage?: string) => {
    setBusy(true);
    try {
      await action();
      await refresh();
      await load();
      if (successMessage) {
        alert('Done', successMessage);
      }
    } catch (err) {
      alert(
        'Action failed',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCall = async () => {
    if (!reminder) return;
    try {
      await openDialer(reminder.phoneNumber);
    } catch (err) {
      alert(
        'Unable to open dialer',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    }
  };

  const handleSnooze = async (minutes: SnoozeDurationMinutes) => {
    if (!reminder) return;
    setSnoozeOpen(false);
    await run(async () => {
      await snooze(reminder.id, minutes);
    }, `Snoozed for ${minutes === 60 ? '1 hour' : `${minutes} minutes`}`);
  };

  const handleComplete = () => {
    if (!reminder) return;
    confirm({
      title: 'Mark completed?',
      message: 'This removes the pending reminder from Home.',
      confirmLabel: 'Complete',
      icon: 'checkmark-circle-outline',
      onConfirm: () => {
        void run(async () => {
          await completeReminder(reminder.id);
          router.back();
        });
      },
    });
  };

  const handleDelete = () => {
    if (!reminder) return;
    confirm({
      title: 'Delete reminder?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      icon: 'trash-outline',
      onConfirm: () => {
        void run(async () => {
          await deleteReminder(reminder.id);
          router.back();
        });
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText tone="secondary">Loading…</AppText>
      </View>
    );
  }

  if (!reminder) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText tone="secondary">Reminder not found.</AppText>
        <Button label="Go back" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const overdue = reminder.status === 'pending' && isOverdue(reminder.scheduledAt);

  return (
    <>
      <Stack.Screen options={{ title: reminder.contactName }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.hero,
            shadows.soft,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
            <AppText variant="title" tone="primary">
              {reminder.contactName.charAt(0).toUpperCase()}
            </AppText>
          </View>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {reminder.contactName}
          </AppText>
          <AppText variant="body" tone="secondary">
            {reminder.phoneNumber}
          </AppText>
          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: overdue ? colors.dangerMuted : colors.backgroundSecondary,
              },
            ]}
          >
            <Ionicons
              name={overdue ? 'alert-circle' : 'time-outline'}
              size={16}
              color={overdue ? colors.danger : colors.textMuted}
            />
            <AppText variant="callout" tone={overdue ? 'danger' : 'secondary'}>
              {reminder.status === 'completed' && reminder.completedAt
                ? `Completed · ${formatReminderWhen(reminder.completedAt)}`
                : `${formatReminderWhen(reminder.scheduledAt)} · ${formatRelativeStatus(reminder.scheduledAt)}`}
            </AppText>
          </View>
          {reminder.notes ? (
            <View style={[styles.notes, { backgroundColor: colors.inputBackground }]}>
              <AppText variant="label" tone="muted">
                NOTES
              </AppText>
              <AppText variant="body" style={{ marginTop: 6 }}>
                {reminder.notes}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label="Call Now"
            onPress={() => void handleCall()}
            icon={<Ionicons name="call" size={18} color={colors.primaryText} />}
            disabled={busy}
          />

          {reminder.status === 'pending' ? (
            <>
              <Button
                label="Snooze"
                variant="secondary"
                onPress={() => setSnoozeOpen(true)}
                disabled={busy}
              />
              <Button
                label="Reschedule / Edit"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: '/schedule', params: { id: reminder.id } })
                }
                disabled={busy}
              />
              <Button
                label="Mark completed"
                variant="success"
                onPress={handleComplete}
                disabled={busy}
              />
            </>
          ) : (
            <Button
              label="Reschedule again"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/schedule', params: { id: reminder.id } })
              }
              disabled={busy}
            />
          )}

          <Button
            label="Delete"
            variant="danger"
            onPress={handleDelete}
            disabled={busy}
          />
        </View>
      </ScrollView>

      <SnoozeSheet
        visible={snoozeOpen}
        onClose={() => setSnoozeOpen(false)}
        onSelect={(minutes) => void handleSnooze(minutes)}
        defaultMinutes={settings.defaultSnoozeMinutes}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  content: {
    padding: spacing.xxl,
    gap: spacing.xl,
    paddingBottom: spacing.huge,
  },
  hero: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  notes: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  actions: {
    gap: spacing.sm,
  },
});
