import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { palette, radius, shadows, spacing } from '@/src/theme/tokens';

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, colorScheme, settings } = useAppTheme();
  const { alert, confirm } = useDialog();
  const {
    pending: pendingReminders,
    completed: completedReminders,
    getById,
    completeReminder,
    deleteReminder,
    snooze,
    refresh,
  } = useReminders();

  const reminderFromStore = useMemo(() => {
    if (!id) return null;
    return (
      pendingReminders.find((row) => row.id === id) ??
      completedReminders.find((row) => row.id === id) ??
      null
    );
  }, [pendingReminders, completedReminders, id]);

  const [reminder, setReminder] = useState<Reminder | null>(reminderFromStore);
  const [loading, setLoading] = useState(!reminderFromStore);
  const [busy, setBusy] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  // Context refresh (edit save / app resume) updates detail immediately.
  useEffect(() => {
    if (reminderFromStore) {
      setReminder(reminderFromStore);
      setLoading(false);
    }
  }, [reminderFromStore]);

  // Soft SQLite reload on focus (return from Edit, deep link, first open).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        if (!id) return;
        try {
          const row = await getById(id);
          if (!cancelled) {
            setReminder(row);
            setLoading(false);
          }
        } catch {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id, getById]),
  );

  const run = async (action: () => Promise<void>, successMessage?: string) => {
    setBusy(true);
    try {
      await action();
      await refresh();
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
  const pending = reminder.status === 'pending';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Reminder',
          headerStyle: {
            backgroundColor:
              colorScheme === 'dark' ? palette.ink900 : palette.teal800,
          },
          headerTintColor: palette.mist50,
          headerTitleStyle: {
            color: palette.mist50,
            fontWeight: '700',
            fontSize: 17,
          },
        }}
      />
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.huge },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(280)} style={styles.heroWrap}>
            <LinearGradient
              colors={
                colorScheme === 'dark'
                  ? ['#12352F', '#0F2A28', palette.ink900]
                  : ['#F3FBFA', '#E5F5F2', '#D8EFEB']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.heroPanel,
                shadows.soft,
                {
                  borderColor:
                    colorScheme === 'dark'
                      ? 'rgba(45,212,191,0.18)'
                      : 'rgba(13,148,136,0.16)',
                },
              ]}
            >
              <View
                style={[
                  styles.heroOrb,
                  styles.heroOrbOne,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(45,212,191,0.14)'
                        : 'rgba(45,212,191,0.22)',
                  },
                ]}
              />
              <View
                style={[
                  styles.heroOrb,
                  styles.heroOrbTwo,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(15,118,110,0.08)',
                  },
                ]}
              />
              <View
                style={[
                  styles.heroOrb,
                  styles.heroOrbThree,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(45,212,191,0.16)'
                        : 'rgba(20,184,166,0.18)',
                  },
                ]}
              />
              <View style={styles.heroGrid}>
                {Array.from({ length: 18 }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.heroGridDot,
                      {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'rgba(244,247,249,0.35)'
                            : 'rgba(15,118,110,0.28)',
                      },
                    ]}
                  />
                ))}
              </View>

              <View
                style={[
                  styles.avatarRing,
                  {
                    backgroundColor:
                      colorScheme === 'dark'
                        ? 'rgba(255,255,255,0.10)'
                        : palette.white,
                    borderColor:
                      colorScheme === 'dark'
                        ? 'rgba(45,212,191,0.24)'
                        : 'rgba(13,148,136,0.18)',
                  },
                ]}
              >
                <AppText
                  variant="display"
                  style={{
                    color:
                      colorScheme === 'dark' ? palette.mist50 : colors.primary,
                  }}
                >
                  {reminder.contactName.charAt(0).toUpperCase()}
                </AppText>
              </View>

              <AppText
                variant="title"
                style={[
                  styles.name,
                  {
                    color:
                      colorScheme === 'dark' ? palette.mist50 : colors.text,
                  },
                ]}
              >
                {reminder.contactName}
              </AppText>
              <AppText
                variant="body"
                style={{
                  color:
                    colorScheme === 'dark'
                      ? 'rgba(232,238,242,0.78)'
                      : colors.textSecondary,
                }}
              >
                {reminder.phoneNumber}
              </AppText>

              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: overdue
                      ? colorScheme === 'dark'
                        ? 'rgba(240, 89, 90, 0.28)'
                        : 'rgba(225, 29, 72, 0.18)'
                      : reminder.status === 'completed'
                        ? colorScheme === 'dark'
                          ? 'rgba(37, 99, 235, 0.24)'
                          : 'rgba(37, 99, 235, 0.14)'
                        : colorScheme === 'dark'
                          ? 'rgba(245, 158, 11, 0.22)'
                          : 'rgba(217, 119, 6, 0.16)',
                    borderColor: overdue
                      ? 'transparent'
                      : reminder.status === 'completed'
                        ? 'transparent'
                        : colorScheme === 'dark'
                          ? 'rgba(245, 158, 11, 0.35)'
                          : 'rgba(217, 119, 6, 0.28)',
                    borderWidth:
                      !overdue && reminder.status !== 'completed'
                        ? StyleSheet.hairlineWidth * 2
                        : 0,
                  },
                ]}
              >
                <Ionicons
                  name={
                    overdue
                      ? 'alert-circle'
                      : reminder.status === 'completed'
                        ? 'checkmark-circle'
                        : 'time-outline'
                  }
                  size={16}
                  color={
                    overdue
                      ? colors.danger
                      : reminder.status === 'completed'
                        ? '#2563EB'
                        : colors.warning
                  }
                />
                <AppText
                  variant="callout"
                  tone={
                    overdue
                      ? 'danger'
                      : reminder.status === 'completed'
                        ? 'default'
                        : 'warning'
                  }
                  style={
                    reminder.status === 'completed'
                      ? { color: '#2563EB' }
                      : undefined
                  }
                >
                  {reminder.status === 'completed' && reminder.completedAt
                    ? `Completed · ${formatReminderWhen(reminder.completedAt)}`
                    : `${formatReminderWhen(reminder.scheduledAt)} · ${formatRelativeStatus(reminder.scheduledAt)}`}
                </AppText>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.callBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${reminder.contactName}`}
              disabled={busy}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                void handleCall();
              }}
              style={({ pressed }) => [
                styles.callButton,
                shadows.float,
                {
                  backgroundColor: colors.primary,
                  opacity: busy ? 0.5 : pressed ? 0.92 : 1,
                  transform: [{ scale: pressed && !busy ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={styles.callIconWrap}>
                <Ionicons name="call" size={22} color={colors.primary} />
              </View>
              <View style={styles.callCopy}>
                <AppText variant="bodyMedium" tone="inverse">
                  Call now
                </AppText>
                <AppText variant="caption" style={styles.callSub}>
                  Opens your phone dialer
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.actionGrid}>
            {pending ? (
              <>
                <ActionTile
                  icon="time-outline"
                  label="Snooze"
                  color={colors.primary}
                  background={colors.primaryMuted}
                  disabled={busy}
                  onPress={() => setSnoozeOpen(true)}
                />
                <ActionTile
                  icon="calendar-outline"
                  label="Edit"
                  color={colors.primary}
                  background={colors.primaryMuted}
                  disabled={busy}
                  onPress={() =>
                    router.push({ pathname: '/schedule', params: { id: reminder.id } })
                  }
                />
                <ActionTile
                  icon="checkmark-circle-outline"
                  label="Completed"
                  color="#2563EB"
                  background={
                    colorScheme === 'dark'
                      ? 'rgba(37, 99, 235, 0.14)'
                      : 'rgba(37, 99, 235, 0.10)'
                  }
                  disabled={busy}
                  onPress={handleComplete}
                />
              </>
            ) : (
              <ActionTile
                icon="refresh-outline"
                label="Reschedule"
                color={colors.primary}
                background={colors.primaryMuted}
                disabled={busy}
                onPress={() =>
                  router.push({ pathname: '/schedule', params: { id: reminder.id } })
                }
                wide
              />
            )}
          </Animated.View>

          {reminder.notes ? (
            <Animated.View
              entering={FadeInDown.delay(110).springify()}
              style={[
                styles.notesCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <AppText variant="label" tone="muted">
                NOTES
              </AppText>
              <AppText variant="body" style={styles.notesBody}>
                {reminder.notes}
              </AppText>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(140).springify()}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete reminder"
              disabled={busy}
              onPress={() => {
                void Haptics.selectionAsync();
                handleDelete();
              }}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(240, 89, 90, 0.08)'
                      : 'rgba(225, 29, 72, 0.04)',
                  borderColor: colors.danger,
                  opacity: busy ? 0.45 : pressed ? 0.82 : 1,
                  transform: [{ scale: pressed && !busy ? 0.98 : 1 }],
                },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <AppText variant="bodyMedium" tone="danger">
                Delete reminder
              </AppText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>

      <SnoozeSheet
        visible={snoozeOpen}
        onClose={() => setSnoozeOpen(false)}
        onSelect={(minutes) => void handleSnooze(minutes)}
        defaultMinutes={settings.defaultSnoozeMinutes}
      />
    </>
  );
}

function ActionTile({
  icon,
  label,
  color,
  background,
  onPress,
  disabled,
  wide,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  background: string;
  onPress: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        wide ? styles.tileWide : null,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <AppText variant="callout">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  heroWrap: {
    borderRadius: radius.xl,
  },
  heroPanel: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
  },
  heroOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  heroOrbOne: {
    width: 180,
    height: 180,
    top: -60,
    right: -40,
  },
  heroOrbTwo: {
    width: 120,
    height: 120,
    bottom: -36,
    left: -28,
  },
  heroOrbThree: {
    width: 64,
    height: 64,
    top: 48,
    left: 28,
  },
  heroGrid: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 54,
    height: 54,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroGridDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginBottom: spacing.sm,
  },
  name: {
    textAlign: 'center',
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
  callBlock: {
    marginTop: spacing.xs,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 72,
  },
  callIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  callCopy: {
    flex: 1,
    gap: 2,
  },
  callSub: {
    color: 'rgba(255,255,255,0.72)',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    minWidth: '28%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tileWide: {
    minWidth: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  notesBody: {
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
