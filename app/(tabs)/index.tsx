import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
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
import { radius, shadows, spacing } from '@/src/theme/tokens';

/** Keep in sync with tabBarStyle.height in app/(tabs)/_layout.tsx */
const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 68 : 88;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { alert } = useDialog();
  const { grouped, pending, isLoading, refresh, error } = useReminders();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.heroWash, { backgroundColor: colors.primaryMuted }]} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.lg,
            paddingBottom: TAB_BAR_HEIGHT + spacing.huge,
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
      >
        <Animated.View entering={FadeIn.duration(350)} style={styles.header}>
          <View>
            <AppText variant="label" tone="primary">
              CALL LATER
            </AppText>
            <AppText variant="display" style={styles.title}>
              Callbacks
            </AppText>
            <AppText variant="callout" tone="secondary">
              {stats.total === 0
                ? 'No reminders yet — schedule your next call.'
                : `${stats.total} open · ${stats.overdue} overdue · ${stats.today} today`}
            </AppText>
          </View>

          {stats.total > 0 ? (
            <View style={styles.statRow}>
              <StatChip label="Overdue" value={stats.overdue} tone="danger" />
              <StatChip label="Today" value={stats.today} tone="primary" />
              <StatChip label="Later" value={stats.upcoming} tone="muted" />
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
            {grouped.overdue.length > 0 ? (
              <View>
                <SectionHeader title="Overdue" count={grouped.overdue.length} tone="danger" />
                {grouped.overdue.map((reminder, index) => (
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

            {grouped.today.length > 0 ? (
              <View>
                <SectionHeader title="Today" count={grouped.today.length} tone="primary" />
                {grouped.today.map((reminder, index) => (
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

            {grouped.upcoming.length > 0 ? (
              <View>
                <SectionHeader title="Upcoming" count={grouped.upcoming.length} />
                {grouped.upcoming.map((reminder, index) => (
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
            bottom: TAB_BAR_HEIGHT + spacing.lg,
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

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'danger' | 'primary' | 'muted';
}) {
  const { colors } = useAppTheme();
  const bg =
    tone === 'danger'
      ? colors.dangerMuted
      : tone === 'primary'
        ? colors.primaryMuted
        : colors.backgroundSecondary;
  const textTone = tone === 'muted' ? 'secondary' : tone;

  return (
    <View style={[styles.statChip, { backgroundColor: bg }]}>
      <AppText variant="headline" tone={textTone}>
        {value}
      </AppText>
      <AppText variant="caption" tone="secondary">
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
    height: 220,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statChip: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  errorBanner: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
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
