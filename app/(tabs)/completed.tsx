import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReminderCard } from '@/src/components/ReminderCard';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { AppText } from '@/src/components/ui/AppText';
import { useReminders } from '@/src/context/RemindersContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { spacing } from '@/src/theme/tokens';

/** Keep in sync with tabBarStyle.height in app/(tabs)/_layout.tsx */
const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 68 : 88;

export default function CompletedScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { completed, refresh, isLoading } = useReminders();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
        <View style={styles.header}>
          <AppText variant="label" tone="primary">
            HISTORY
          </AppText>
          <AppText variant="display" style={styles.title}>
            Completed
          </AppText>
          <AppText variant="callout" tone="secondary">
            {completed.length === 0
              ? 'Calls you’ve already marked done.'
              : `${completed.length} finished callback${completed.length === 1 ? '' : 's'}.`}
          </AppText>
        </View>

        {completed.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="No completed calls"
            description="When you finish a callback, it will show up here."
            actionLabel="Go to Home"
            onAction={() => router.push('/')}
          />
        ) : (
          completed.map((reminder, index) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              index={index}
              showCompletedMeta
              onPress={() => router.push(`/reminder/${reminder.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1 },
  header: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});
