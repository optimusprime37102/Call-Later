import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/src/components/ui/AppText';
import { useReminders } from '@/src/context/RemindersContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { useAlarmFeedback } from '@/src/hooks/useAlarmFeedback';
import { openDialer } from '@/src/services/dialer';
import { SnoozeDurationMinutes } from '@/src/types/settings';
import { formatRelativeStatus, formatReminderWhen } from '@/src/utils/dates';
import { radius, spacing } from '@/src/theme/tokens';

const SNOOZE_OPTIONS: { minutes: SnoozeDurationMinutes; label: string }[] = [
  { minutes: 10, label: '10m' },
  { minutes: 30, label: '30m' },
  { minutes: 60, label: '1h' },
];

interface ReminderAlarmOverlayProps {
  visible: boolean;
  reminderId: string | null;
  contactName: string;
  phoneNumber: string;
  notes: string | null;
  scheduledAt: number;
  onClose: () => void;
}

export function ReminderAlarmOverlay({
  visible,
  reminderId,
  contactName,
  phoneNumber,
  notes,
  scheduledAt,
  onClose,
}: ReminderAlarmOverlayProps) {
  const insets = useSafeAreaInsets();
  const { colors, settings } = useAppTheme();
  const { snooze, completeReminder, refresh } = useReminders();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAlarmFeedback(visible);

  const dismissTray = async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      // Best-effort.
    }
  };

  const finish = async () => {
    setError(null);
    await dismissTray();
    await refresh();
    onClose();
  };

  const handleCall = async () => {
    if (!phoneNumber) return;
    setBusy(true);
    setError(null);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await openDialer(phoneNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open dialer');
    } finally {
      setBusy(false);
    }
  };

  const handleSnooze = async (minutes: SnoozeDurationMinutes) => {
    if (!reminderId) return;
    setBusy(true);
    setError(null);
    try {
      void Haptics.selectionAsync();
      await snooze(reminderId, minutes);
      await finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not snooze');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!reminderId) return;
    setBusy(true);
    setError(null);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await completeReminder(reminderId);
      await finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete');
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = async () => {
    void Haptics.selectionAsync();
    await finish();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {
        void handleDismiss();
      }}
    >
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.splashBackground,
            paddingTop: insets.top + spacing.xl,
            paddingBottom: Math.max(insets.bottom, spacing.xl),
          },
        ]}
      >
        <View style={styles.glow} />

        <Animated.View entering={FadeIn.duration(280)} style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="call" size={16} color="#2DD4BF" />
            <AppText variant="label" style={{ color: '#2DD4BF' }}>
              TIME TO CALL
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss alarm"
            onPress={() => void handleDismiss()}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={20} color="#E8EEF2" />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.hero}>
          <View style={styles.avatar}>
            <AppText variant="display" style={styles.avatarLetter}>
              {contactName.charAt(0).toUpperCase() || '?'}
            </AppText>
          </View>
          <AppText variant="display" style={styles.name}>
            {contactName}
          </AppText>
          <AppText variant="headline" style={styles.phone}>
            {phoneNumber || 'No number'}
          </AppText>
          <View style={styles.metaPill}>
            <Ionicons name="time-outline" size={15} color="rgba(184, 205, 216, 0.9)" />
            <AppText variant="callout" style={styles.metaText}>
              {formatReminderWhen(scheduledAt)} · {formatRelativeStatus(scheduledAt)}
            </AppText>
          </View>
          {notes ? (
            <View style={styles.notesCard}>
              <AppText variant="label" style={styles.notesLabel}>
                NOTES
              </AppText>
              <AppText variant="body" style={styles.notesBody}>
                {notes}
              </AppText>
            </View>
          ) : null}
          {error ? (
            <AppText variant="caption" style={styles.errorText}>
              {error}
            </AppText>
          ) : null}
        </Animated.View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !phoneNumber}
            onPress={() => void handleCall()}
            style={({ pressed }) => [
              styles.callButton,
              {
                backgroundColor: colors.primary,
                opacity: busy || !phoneNumber ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <>
                <Ionicons name="call" size={20} color={colors.primaryText} />
                <AppText variant="bodyMedium" style={{ color: colors.primaryText }}>
                  Call Now
                </AppText>
              </>
            )}
          </Pressable>

          <AppText variant="caption" style={styles.snoozeLabel}>
            Snooze
          </AppText>
          <View style={styles.snoozeRow}>
            {SNOOZE_OPTIONS.map((option) => {
              const preferred = option.minutes === settings.defaultSnoozeMinutes;
              return (
                <Pressable
                  key={option.minutes}
                  disabled={busy || !reminderId}
                  onPress={() => void handleSnooze(option.minutes)}
                  style={({ pressed }) => [
                    styles.snoozeChip,
                    {
                      backgroundColor: preferred
                        ? 'rgba(45, 212, 191, 0.22)'
                        : 'rgba(255,255,255,0.08)',
                      borderColor: preferred
                        ? 'rgba(45, 212, 191, 0.45)'
                        : 'rgba(255,255,255,0.12)',
                      opacity: pressed || busy ? 0.75 : 1,
                    },
                  ]}
                >
                  <AppText
                    variant="callout"
                    style={{ color: preferred ? '#2DD4BF' : '#E8EEF2' }}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={busy || !reminderId}
            onPress={() => void handleComplete()}
            style={({ pressed }) => [
              styles.secondaryButton,
              { opacity: busy || !reminderId ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            <AppText variant="bodyMedium" style={styles.secondaryLabel}>
              Mark completed
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleDismiss()}
            style={({ pressed }) => [
              styles.dismissButton,
              { opacity: busy ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            <AppText variant="bodyMedium" style={styles.dismissLabel}>
              Dismiss
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    top: '18%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(45, 212, 191, 0.14)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(45, 212, 191, 0.16)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.16)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    marginBottom: spacing.md,
  },
  avatarLetter: {
    color: '#2DD4BF',
  },
  name: {
    color: '#F4F7F9',
    textAlign: 'center',
  },
  phone: {
    color: 'rgba(184, 205, 216, 0.92)',
    textAlign: 'center',
    fontWeight: '500',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  metaText: {
    color: 'rgba(184, 205, 216, 0.9)',
  },
  notesCard: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  notesLabel: {
    color: 'rgba(184, 205, 216, 0.7)',
  },
  notesBody: {
    color: '#F4F7F9',
    marginTop: 6,
  },
  errorText: {
    color: '#F0595A',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  callButton: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  snoozeLabel: {
    color: 'rgba(184, 205, 216, 0.7)',
    marginTop: spacing.sm,
    marginBottom: 2,
    textAlign: 'center',
  },
  snoozeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  snoozeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryLabel: {
    color: '#F4F7F9',
  },
  dismissButton: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissLabel: {
    color: 'rgba(184, 205, 216, 0.85)',
  },
});
