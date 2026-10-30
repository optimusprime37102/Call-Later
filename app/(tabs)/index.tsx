import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ReminderCard } from '@/src/components/ReminderCard';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, colorScheme } = useAppTheme();
  const { alert } = useDialog();
  const { grouped, pending, isLoading, refresh, error } = useReminders();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const nextUp = useMemo(() => {
    const pool = [...grouped.overdue, ...grouped.today, ...grouped.upcoming];
    if (pool.length === 0) return null;
    return pool.reduce((earliest, item) =>
      item.scheduledAt < earliest.scheduledAt ? item : earliest,
    );
  }, [grouped]);

  const listGroups = useMemo(() => {
    const excludeId = nextUp?.id;
    const filter = (items: Reminder[]) =>
      excludeId ? items.filter((r) => r.id !== excludeId) : items;
    return {
      overdue: filter(grouped.overdue),
      today: filter(grouped.today),
      upcoming: filter(grouped.upcoming),
    };
  }, [grouped, nextUp?.id]);

  const stats = useMemo(
    () => ({
      overdue: grouped.overdue.length,
      today: grouped.today.length,
      upcoming: grouped.upcoming.length,
      total: pending.length,
    }),
    [grouped, pending.length],
  );

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

  const hasListItems =
    listGroups.overdue.length > 0 ||
    listGroups.today.length > 0 ||
    listGroups.upcoming.length > 0;

  const gradientColors: [string, string, string] =
    colorScheme === 'dark'
      ? [palette.teal800, '#0B3D3A', palette.ink900]
      : [palette.teal700, palette.teal800, '#0F4C48'];

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

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: tabBarContentInset(insets.bottom) + spacing.xxxl,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <AppText variant="label" tone="primary">
                {greetingForNow().toUpperCase()}
              </AppText>
              <AppText variant="display" style={styles.title}>
                Callbacks
              </AppText>
              <AppText variant="callout" tone="secondary">
                {stats.total === 0
                  ? 'Schedule your next call when you’re ready.'
                  : `${stats.total} open · ${stats.overdue} overdue · ${stats.today} today`}
              </AppText>
            </View>
            <View
              style={[
                styles.brandMark,
                {
                  backgroundColor: colors.primaryMuted,
                  borderColor:
                    colorScheme === 'dark'
                      ? 'rgba(45,212,191,0.22)'
                      : 'rgba(13,148,136,0.18)',
                },
              ]}
            >
              <Ionicons name="call" size={18} color={colors.primary} />
            </View>
          </View>

          {stats.total > 0 ? (
            <View
              style={[
                styles.statRail,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <StatCell label="Overdue" value={stats.overdue} tone="danger" />
              <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
              <StatCell label="Today" value={stats.today} tone="primary" />
              <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
              <StatCell label="Later" value={stats.upcoming} tone="muted" />
            </View>
          ) : null}
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
              <Animated.View entering={FadeInDown.delay(60).springify()}>
                <NextUpCard
                  reminder={nextUp}
                  gradientColors={gradientColors}
                  onPress={() => router.push(`/reminder/${nextUp.id}`)}
                  onCall={() => void handleCall(nextUp)}
                />
              </Animated.View>
            ) : null}

            {hasListItems ? (
              <>
                {listGroups.overdue.length > 0 ? (
                  <View>
                    <SectionHeader
                      title="Overdue"
                      count={listGroups.overdue.length}
                      tone="danger"
                    />
                    {listGroups.overdue.map((reminder, index) => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        index={index}
                        onPress={() => router.push(`/reminder/${reminder.id}`)}
                        onCall={() => void handleCall(reminder)}
                      />
                    ))}
                  </View>
                ) : null}

                {listGroups.today.length > 0 ? (
                  <View>
                    <SectionHeader
                      title="Today"
                      count={listGroups.today.length}
                      tone="primary"
                    />
                    {listGroups.today.map((reminder, index) => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        index={index}
                        onPress={() => router.push(`/reminder/${reminder.id}`)}
                        onCall={() => void handleCall(reminder)}
                      />
                    ))}
                  </View>
                ) : null}

                {listGroups.upcoming.length > 0 ? (
                  <View>
                    <SectionHeader
                      title="Upcoming"
                      count={listGroups.upcoming.length}
                    />
                    {listGroups.upcoming.map((reminder, index) => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        index={index}
                        onPress={() => router.push(`/reminder/${reminder.id}`)}
                        onCall={() => void handleCall(reminder)}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

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
        {reminder.notes ? (
          <AppText variant="caption" style={styles.nextNotes} numberOfLines={2}>
            {reminder.notes}
          </AppText>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'danger' | 'primary' | 'muted';
}) {
  const textTone = tone === 'muted' ? 'secondary' : tone;

  return (
    <View style={styles.statCell}>
      <AppText variant="headline" tone={textTone}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heroWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginTop: spacing.xs,
  },
  statRail: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 28,
    borderRadius: 1,
  },
  errorBanner: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  nextWrap: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
  },
  nextCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  nextGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(45, 212, 191, 0.22)',
    top: -40,
    right: -30,
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
  nextNotes: {
    color: 'rgba(184, 205, 216, 0.78)',
    marginTop: spacing.xs,
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
