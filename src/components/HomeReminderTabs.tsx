import { useEffect, useRef } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ReminderCard } from '@/src/components/ReminderCard';
import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/context/ThemeContext';
import type { Reminder } from '@/src/types/reminder';
import { radius, spacing } from '@/src/theme/tokens';

export type HomeFilter = 'today' | 'upcoming' | 'overdue';

export const HOME_TABS: {
  key: HomeFilter;
  label: string;
  tone: 'primary' | 'muted' | 'danger';
}[] = [
  { key: 'today', label: 'Today', tone: 'primary' },
  { key: 'upcoming', label: 'Later', tone: 'muted' },
  { key: 'overdue', label: 'Overdue', tone: 'danger' },
];

export function filterToIndex(filter: HomeFilter): number {
  return Math.max(
    0,
    HOME_TABS.findIndex((tab) => tab.key === filter),
  );
}

type EmptyCopy = Record<HomeFilter, { title: string; description: string }>;

interface HomeReminderTabsProps {
  activeFilter: HomeFilter;
  onFilterChange: (filter: HomeFilter) => void;
  counts: Record<HomeFilter, number>;
  lists: Record<HomeFilter, Reminder[]>;
  emptyCopy: EmptyCopy;
  refreshing: boolean;
  onRefresh: () => void;
  contentBottomInset: number;
  onOpenReminder: (id: string) => void;
  onCallReminder: (reminder: Reminder) => void;
}

export function HomeReminderTabs({
  activeFilter,
  onFilterChange,
  counts,
  lists,
  emptyCopy,
  refreshing,
  onRefresh,
  contentBottomInset,
  onOpenReminder,
  onCallReminder,
}: HomeReminderTabsProps) {
  const { colors } = useAppTheme();
  const pagerRef = useRef<PagerView>(null);
  const skipPagerSync = useRef(false);
  const progress = useSharedValue(filterToIndex(activeFilter));
  const tabWidth = useSharedValue(0);
  const accentToday = useSharedValue(colors.primary);
  const accentLater = useSharedValue(colors.text);
  const accentOverdue = useSharedValue(colors.danger);
  const activeIndex = filterToIndex(activeFilter);

  useEffect(() => {
    accentToday.value = colors.primary;
    accentLater.value = colors.text;
    accentOverdue.value = colors.danger;
  }, [accentLater, accentOverdue, accentToday, colors.danger, colors.primary, colors.text]);

  useEffect(() => {
    const index = filterToIndex(activeFilter);
    if (skipPagerSync.current) {
      skipPagerSync.current = false;
      progress.value = index;
      return;
    }
    pagerRef.current?.setPage(index);
    progress.value = withSpring(index, { damping: 20, stiffness: 220, mass: 0.7 });
  }, [activeFilter, progress]);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    tabWidth.value = width > 0 ? (width - 8) / HOME_TABS.length : 0;
  };

  const selectTab = (index: number) => {
    const tab = HOME_TABS[index];
    if (!tab || tab.key === activeFilter) return;
    void Haptics.selectionAsync();
    onFilterChange(tab.key);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    const width = tabWidth.value;
    if (width <= 0) {
      return { opacity: 0 };
    }
    return {
      opacity: 1,
      width,
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1, 2],
            [0, width, width * 2],
            Extrapolation.CLAMP,
          ),
        },
      ],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1, 2],
        [accentToday.value, accentLater.value, accentOverdue.value],
      ),
    };
  });

  return (
    <View style={styles.root}>
      <View style={styles.tabBarPad}>
        <View
          onLayout={onTrackLayout}
          style={[
            styles.track,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Animated.View style={[styles.indicator, indicatorStyle]} />
          {HOME_TABS.map((tab, index) => {
            const active = activeIndex === index;
            const count = counts[tab.key];
            const activeText =
              tab.tone === 'muted' ? colors.background : colors.primaryText;

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => selectTab(index)}
                style={styles.tab}
              >
                <AppText
                  variant="callout"
                  style={{
                    color: active ? activeText : colors.textSecondary,
                    fontWeight: '700',
                  }}
                >
                  {tab.label}
                </AppText>
                <View
                  style={[
                    styles.count,
                    {
                      backgroundColor: active
                        ? 'rgba(255,255,255,0.22)'
                        : colors.backgroundSecondary,
                    },
                  ]}
                >
                  <AppText
                    variant="label"
                    style={{
                      color: active ? activeText : colors.textMuted,
                      fontSize: 10,
                    }}
                  >
                    {count}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={activeIndex}
        onPageScroll={(event) => {
          const { position, offset } = event.nativeEvent;
          progress.value = position + offset;
        }}
        onPageSelected={(event) => {
          const index = event.nativeEvent.position;
          const tab = HOME_TABS[index];
          if (!tab || tab.key === activeFilter) return;
          skipPagerSync.current = true;
          void Haptics.selectionAsync();
          onFilterChange(tab.key);
        }}
      >
        {HOME_TABS.map((tab) => {
          const items = lists[tab.key];
          const empty = emptyCopy[tab.key];

          return (
            <View key={tab.key} style={styles.page}>
              <ScrollView
                contentContainerStyle={[
                  styles.pageContent,
                  { paddingBottom: contentBottomInset },
                  items.length === 0 ? styles.pageContentEmpty : null,
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                {items.length === 0 ? (
                  <View style={styles.empty}>
                    <AppText variant="bodyMedium">{empty.title}</AppText>
                    <AppText variant="caption" tone="secondary" style={styles.emptyDesc}>
                      {empty.description}
                    </AppText>
                  </View>
                ) : (
                  items.map((reminder, index) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      index={index}
                      onPress={() => onOpenReminder(reminder.id)}
                      onCall={() => onCallReminder(reminder)}
                    />
                  ))
                )}
              </ScrollView>
            </View>
          );
        })}
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBarPad: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  track: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    position: 'relative',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: radius.md,
  },
  tab: {
    flex: 1,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageContent: {
    flexGrow: 1,
    paddingTop: spacing.xs,
  },
  pageContentEmpty: {
    justifyContent: 'center',
  },
  empty: {
    marginHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyDesc: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
