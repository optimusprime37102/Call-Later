import { useAppTheme } from '@/src/context/ThemeContext';
import { radius, shadows, spacing } from '@/src/theme/tokens';
import type { Reminder } from '@/src/types/reminder';
import { formatRelativeStatus, formatReminderWhen, isOverdue } from '@/src/utils/dates';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { AppText } from './ui/AppText';

interface ReminderCardProps {
  reminder: Reminder;
  index?: number;
  onPress: () => void;
  onCall?: () => void;
  showCompletedMeta?: boolean;
  /** Same reminder currently featured in the Next Up hero card. */
  isNextUp?: boolean;
}

export function ReminderCard({
  reminder,
  index = 0,
  onPress,
  onCall,
  showCompletedMeta = false,
  isNextUp = false,
}: ReminderCardProps) {
  const { colors, colorScheme } = useAppTheme();
  const overdue = !showCompletedMeta && isOverdue(reminder.scheduledAt);
  const accent = overdue ? colors.danger : colors.primary;
  const nextUp = isNextUp && !showCompletedMeta && !overdue;
  // Blue stands apart from teal brand accents used elsewhere on Home.
  const nextUpAccent = colorScheme === 'dark' ? '#60A5FA' : '#2563EB';
  const nextUpRingFill =
    colorScheme === 'dark' ? 'rgba(96, 165, 250, 0.16)' : 'rgba(37, 99, 235, 0.10)';
  const ripple = useSharedValue(0);
  const corePulse = useSharedValue(1);

  useEffect(() => {
    if (!nextUp) {
      cancelAnimation(ripple);
      cancelAnimation(corePulse);
      ripple.value = 0;
      corePulse.value = 1;
      return;
    }

    ripple.value = 0;
    ripple.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withDelay(350, withTiming(0, { duration: 1 })),
      ),
      -1,
      false,
    );

    corePulse.value = 1;
    corePulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 550, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 550, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(ripple);
      cancelAnimation(corePulse);
    };
  }, [corePulse, nextUp, ripple]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.85 * (1 - ripple.value),
    transform: [{ scale: 1 + ripple.value * 0.85 }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: 1,
    transform: [{ scale: corePulse.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 240)).springify()}>
      <Pressable
        onPress={onPress}
        accessibilityState={{ selected: nextUp }}
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
        <View
          style={[
            styles.accent,
            {
              backgroundColor: accent,
              width: nextUp ? 4 : 3,
            },
          ]}
        />

        <View style={[styles.content, nextUp ? styles.contentNextUp : null]}>
          <View style={styles.topRow}>
            <View
              style={[
                styles.avatarWrap,
                nextUp
                  ? {
                      borderColor: nextUpAccent,
                      backgroundColor: nextUpRingFill,
                      overflow: 'visible',
                    }
                  : { borderColor: 'transparent' },
              ]}
            >
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
              {nextUp ? (
                <View style={styles.liveAnchor} pointerEvents="none">
                  <Animated.View
                    style={[
                      styles.liveRipple,
                      rippleStyle,
                      { borderColor: nextUpAccent },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.liveDot,
                      coreStyle,
                      {
                        backgroundColor: nextUpAccent,
                        borderColor: colors.surface,
                      },
                    ]}
                  />
                </View>
              ) : null}
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
              nextUp ? (
                <View style={styles.nextStatus}>
                  <View style={[styles.nextStatusDot, { backgroundColor: nextUpAccent }]} />
                  <AppText
                    variant="callout"
                    style={[styles.nextStatusText, { color: nextUpAccent }]}
                  >
                    Next up
                  </AppText>
                </View>
              ) : (
                <AppText variant="caption" tone={overdue ? 'danger' : 'muted'}>
                  {formatRelativeStatus(reminder.scheduledAt)}
                </AppText>
              )
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
    overflow: 'visible',
  },
  accent: {
    width: 3,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  contentNextUp: {
    overflow: 'visible',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.md + 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
  liveAnchor: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRipple: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
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
  nextStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nextStatusText: {
    fontWeight: '700',
  },
  notes: {
    marginTop: -4,
  },
});
