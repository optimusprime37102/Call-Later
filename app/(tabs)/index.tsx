import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  HomeFilter,
  HomeReminderTabs,
} from '@/src/components/HomeReminderTabs';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { AppText } from '@/src/components/ui/AppText';
import { useDialog } from '@/src/context/DialogContext';
import { useReminders } from '@/src/context/RemindersContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { openDialer } from '@/src/services/dialer';
import type { Reminder } from '@/src/types/reminder';
import { fabBottomOffset, tabBarContentInset } from '@/src/theme/layout';
import { palette, radius, shadows, spacing } from '@/src/theme/tokens';
import {
  formatRelativeStatus,
  formatReminderWhen,
  isOverdue,
} from '@/src/utils/dates';

function greetingForNow(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function preferredFilter(counts: Record<HomeFilter, number>): HomeFilter {
  if (counts.overdue > 0) return 'overdue';
  if (counts.today > 0) return 'today';
  return 'upcoming';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, colorScheme } = useAppTheme();
  const { alert } = useDialog();
  const { grouped, pending, isLoading, refresh, error } = useReminders();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<HomeFilter | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const nextUp = useMemo(() => {
    const pool = [...grouped.today, ...grouped.upcoming];
    if (pool.length === 0) return null;
    return pool.reduce((soonest, item) =>
      item.scheduledAt < soonest.scheduledAt ? item : soonest,
    );
  }, [grouped]);

  const lists = useMemo(() => {
    const excludeId = nextUp?.id;
    const withoutNext = (items: Reminder[]) =>
      excludeId ? items.filter((r) => r.id !== excludeId) : items;
    return {
      overdue: grouped.overdue,
      today: withoutNext(grouped.today),
      upcoming: withoutNext(grouped.upcoming),
    };
  }, [grouped, nextUp?.id]);

  const chipCounts = useMemo(
    () => ({
      overdue: grouped.overdue.length,
      today: grouped.today.length,
      upcoming: grouped.upcoming.length,
    }),
    [grouped],
  );

  const activeFilter = filter ?? preferredFilter(chipCounts);

  const handleCall = async (reminder: Reminder) => {
    try {
      await openDialer(reminder.phoneNumber);
    } catch (err) {
      alert(
        'Unable to open dialer',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    }
  };

  const hasAny =
    grouped.overdue.length > 0 ||
    grouped.today.length > 0 ||
    grouped.upcoming.length > 0;

  const gradientColors: [string, string, string] =
    colorScheme === 'dark'
      ? [palette.teal800, '#0B3D3A', palette.ink900]
      : [palette.teal700, palette.teal800, '#0F4C48'];

  const filterEmptyCopy = {
    overdue: {
      title: 'No overdue calls',
      description: 'You’re caught up. Upcoming reminders stay under Today and Later.',
    },
    today: {
      title: 'Nothing else today',
      description: nextUp
        ? 'Your next call is highlighted above.'
        : 'Schedule a callback for later today.',
    },
    upcoming: {
      title: 'Nothing later',
      description: 'No reminders scheduled after today.',
    },
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['rgba(45,212,191,0.14)', 'transparent']
            : ['rgba(13,148,136,0.12)', 'transparent']
        }
        style={styles.heroWash}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View style={[styles.body, { paddingTop: insets.top + spacing.lg }]}>
        <Animated.View entering={FadeIn.duration(280)} style={styles.header}>
          <AppText variant="label" tone="primary">
            {greetingForNow().toUpperCase()}
          </AppText>
          <View style={styles.titleRow}>
            <AppText variant="display" style={styles.title}>
              Callbacks
            </AppText>
            {chipCounts.overdue > 0 ? (
              <View style={[styles.alertPill, { backgroundColor: colors.dangerMuted }]}>
                <AppText variant="caption" tone="danger">
                  {chipCounts.overdue} overdue
                </AppText>
              </View>
            ) : pending.length > 0 ? (
              <AppText variant="caption" tone="muted">
                {pending.length} open
              </AppText>
            ) : null}
          </View>
        </Animated.View>

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerMuted }]}>
            <AppText variant="caption" tone="danger">
              {error}
            </AppText>
          </View>
        ) : null}

        {!hasAny ? (
          <EmptyState
            icon="call-outline"
            title="Nothing scheduled"
            description="Pick a contact, choose a time, and Call Later will nudge you when it’s time to dial."
            actionLabel="Schedule a call"
            onAction={() => router.push('/schedule')}
          />
        ) : (
          <>
            {nextUp ? (
              <Animated.View entering={FadeInDown.delay(40).springify()}>
                <NextUpCard
                  reminder={nextUp}
                  gradientColors={gradientColors}
                  onPress={() => router.push(`/reminder/${nextUp.id}`)}
                  onCall={() => void handleCall(nextUp)}
                />
              </Animated.View>
            ) : chipCounts.overdue > 0 ? (
              <Animated.View entering={FadeInDown.delay(40).springify()}>
                <View
                  style={[
                    styles.overdueBanner,
                    {
                      backgroundColor: colors.dangerMuted,
                      borderColor:
                        colorScheme === 'dark'
                          ? 'rgba(240,89,90,0.28)'
                          : 'rgba(225,29,72,0.16)',
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <AppText variant="callout" tone="danger" style={{ flex: 1 }}>
                    {chipCounts.overdue} call{chipCounts.overdue === 1 ? '' : 's'} waiting —
                    clear overdue below
                  </AppText>
                </View>
              </Animated.View>
            ) : null}

            <HomeReminderTabs
              activeFilter={activeFilter}
              onFilterChange={setFilter}
              counts={chipCounts}
              lists={lists}
              emptyCopy={filterEmptyCopy}
              refreshing={refreshing || isLoading}
              onRefresh={() => void onRefresh()}
              contentBottomInset={tabBarContentInset(insets.bottom) + spacing.xxxl}
              onOpenReminder={(id) => router.push(`/reminder/${id}`)}
              onCallReminder={(reminder) => void handleCall(reminder)}
            />
          </>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Schedule a call"
        onPress={() => router.push('/schedule')}
        style={({ pressed }) => [
          styles.fab,
          shadows.float,
          {
            backgroundColor: colors.primary,
            bottom: fabBottomOffset(insets.bottom),
            right: spacing.xxl,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <Ionicons name="add" size={28} color={colors.primaryText} />
      </Pressable>
    </View>
  );
}

function NextUpCard({
  reminder,
  gradientColors,
  onPress,
  onCall,
}: {
  reminder: Reminder;
  gradientColors: [string, string, string];
  onPress: () => void;
  onCall: () => void;
}) {
  const overdue = isOverdue(reminder.scheduledAt);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nextWrap,
        shadows.float,
        { opacity: pressed ? 0.96 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.nextCard}
      >
        <View style={styles.nextGlow} />
        <View style={styles.nextTop}>
          <View style={styles.nextBadge}>
            <View
              style={[
                styles.nextDot,
                { backgroundColor: overdue ? palette.coral500 : palette.teal400 },
              ]}
            />
            <AppText variant="label" style={styles.nextBadgeText}>
              {overdue ? 'Needs call' : 'Next up'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${reminder.contactName}`}
            onPress={onCall}
            hitSlop={8}
            style={({ pressed }) => [
              styles.nextCallBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="call" size={16} color={palette.ink950} />
            <AppText variant="callout" style={styles.nextCallLabel}>
              Call
            </AppText>
          </Pressable>
        </View>

        <AppText variant="title" style={styles.nextName} numberOfLines={1}>
          {reminder.contactName}
        </AppText>
        <AppText variant="callout" style={styles.nextMeta} numberOfLines={1}>
          {formatReminderWhen(reminder.scheduledAt)} ·{' '}
          {formatRelativeStatus(reminder.scheduledAt)}
        </AppText>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  heroWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  titleRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flexShrink: 1,
  },
  alertPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  errorBanner: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  overdueBanner: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextWrap: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
  },
  nextCard: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    overflow: 'hidden',
    gap: spacing.xs,
  },
  nextGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(45, 212, 191, 0.22)',
    top: -36,
    right: -28,
  },
  nextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  nextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  nextBadgeText: {
    color: 'rgba(244, 247, 249, 0.78)',
    letterSpacing: 1,
  },
  nextCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.teal400,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  nextCallLabel: {
    color: palette.ink950,
    fontWeight: '700',
  },
  nextName: {
    color: palette.mist50,
  },
  nextMeta: {
    color: 'rgba(232, 238, 242, 0.82)',
  },
  fab: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
