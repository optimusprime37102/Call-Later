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
  const { colors } = useAppTheme();
  const overdue = !showCompletedMeta && isOverdue(reminder.scheduledAt);
  const accent = overdue ? colors.danger : colors.primary;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 240)).springify()}>
      <View
        style={[
          styles.card,
          shadows.soft,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.content, { opacity: pressed ? 0.92 : 1 }]}
        >
          <View style={styles.topRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
              <AppText variant="callout" tone="primary">
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
                style={[styles.callButton, { backgroundColor: colors.primaryMuted }]}
              >
                <Ionicons name="call" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>

          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: overdue ? colors.dangerMuted : colors.backgroundSecondary,
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
              size={14}
              color={overdue ? colors.danger : colors.textMuted}
            />
            <AppText variant="caption" tone={overdue ? 'danger' : 'secondary'}>
              {showCompletedMeta && reminder.completedAt
                ? `Completed · ${formatReminderWhen(reminder.completedAt)}`
                : `${formatReminderWhen(reminder.scheduledAt)} · ${formatRelativeStatus(reminder.scheduledAt)}`}
            </AppText>
          </View>

          {reminder.notes ? (
            <AppText variant="caption" tone="muted" numberOfLines={2} style={styles.notes}>
              {reminder.notes}
            </AppText>
          ) : null}
        </Pressable>
      </View>
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
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  notes: {
    marginTop: -2,
  },
});
