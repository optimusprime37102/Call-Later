import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/src/context/ThemeContext';
import type { Reminder } from '@/src/types/reminder';
import { formatRelativeStatus, formatReminderWhen, isOverdue } from '@/src/utils/dates';
import { radius, shadows, spacing } from '@/src/theme/tokens';
import { AppText } from './ui/AppText';

interface ReminderCardProps {
  reminder: Reminder;
  index?: number;
  onPress: () => void;
  onCall?: () => void;
  showCompletedMeta?: boolean;
}

export function ReminderCard({
  reminder,
  index = 0,
  onPress,
  onCall,
  showCompletedMeta = false,
}: ReminderCardProps) {
  const { colors, colorScheme } = useAppTheme();
  const overdue = !showCompletedMeta && isOverdue(reminder.scheduledAt);
  const accent = overdue ? colors.danger : colors.primary;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 240)).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          shadows.soft,
          {
            backgroundColor: colors.surface,
            borderColor: overdue
              ? colorScheme === 'dark'
                ? 'rgba(240, 89, 90, 0.28)'
                : 'rgba(225, 29, 72, 0.16)'
              : colors.borderSubtle,
            opacity: pressed ? 0.94 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: overdue ? colors.dangerMuted : colors.primaryMuted,
                },
              ]}
            >
              <AppText
                variant="callout"
                tone={overdue ? 'danger' : 'primary'}
                style={styles.avatarLetter}
              >
                {reminder.contactName.charAt(0).toUpperCase()}
              </AppText>
            </View>

            <View style={styles.titleBlock}>
              <AppText variant="headline" numberOfLines={1}>
                {reminder.contactName}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {reminder.phoneNumber}
              </AppText>
            </View>

            {onCall ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Call ${reminder.contactName}`}
                onPress={onCall}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.callButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Ionicons name="call" size={16} color={colors.primaryText} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: overdue
                    ? colors.dangerMuted
                    : colors.backgroundSecondary,
                },
              ]}
            >
              <Ionicons
                name={
                  overdue
                    ? 'alert-circle'
                    : showCompletedMeta
                      ? 'checkmark-circle'
                      : 'time-outline'
                }
                size={13}
                color={overdue ? colors.danger : colors.textMuted}
              />
              <AppText variant="caption" tone={overdue ? 'danger' : 'secondary'}>
                {showCompletedMeta && reminder.completedAt
                  ? `Completed · ${formatReminderWhen(reminder.completedAt)}`
                  : formatReminderWhen(reminder.scheduledAt)}
              </AppText>
            </View>
            {!showCompletedMeta ? (
              <AppText variant="caption" tone={overdue ? 'danger' : 'muted'}>
                {formatRelativeStatus(reminder.scheduledAt)}
              </AppText>
            ) : null}
          </View>

          {reminder.notes ? (
            <AppText variant="caption" tone="muted" numberOfLines={2} style={styles.notes}>
              {reminder.notes}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accent: {
    width: 3,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontWeight: '700',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  callButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaPill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  notes: {
    marginTop: -4,
  },
});
