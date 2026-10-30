import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from 'expo-router/build/layouts/Tabs';
import { useContext, useEffect, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/context/ThemeContext';
import { TAB_BAR } from '@/src/theme/layout';
import { radius, shadows, spacing } from '@/src/theme/tokens';

const SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { colors, colorScheme } = useAppTheme();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const bottom = TAB_BAR.baseBottom + Math.max(insets.bottom, 8);

  // Floating dock sits over content — don't reserve a solid tab-bar strip
  useEffect(() => {
    onHeightChange?.(0);
  }, [onHeightChange]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom, paddingHorizontal: TAB_BAR.marginHorizontal }]}
    >
      <View
        style={[
          styles.shell,
          shadows.float,
          {
            height: TAB_BAR.height,
            borderColor:
              colorScheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(6,16,22,0.08)',
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(12, 26, 36, 0.96)'
                : 'rgba(255, 255, 255, 0.96)',
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={colorScheme === 'dark' ? 55 : 70}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                colorScheme === 'dark'
                  ? 'rgba(12, 26, 36, 0.88)'
                  : 'rgba(255, 255, 255, 0.88)',
            },
          ]}
        />

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;

            const onPress = () => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                void Haptics.selectionAsync();
                navigateToTab(route.key);
              }
            };

            const onLongPress = () => {
              emitter.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const color = focused ? colors.tabIconActive : colors.tabIcon;
            const icon =
              options.tabBarIcon?.({
                focused,
                color,
                size: 22,
              }) ?? null;

            return (
              <TabItem
                key={route.key}
                label={String(label)}
                icon={icon}
                focused={focused}
                activeMuted={colors.primaryMuted}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  activeMuted,
  onPress,
  onLongPress,
}: {
  label: string;
  icon: ReactNode;
  focused: boolean;
  activeMuted: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.86 + progress.value * 0.14 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <View style={styles.iconSlot}>
        <Animated.View
          style={[styles.pill, { backgroundColor: activeMuted }, pillStyle]}
        />
        {icon}
      </View>
      <AppText
        variant="label"
        tone={focused ? 'primary' : 'muted'}
        style={[styles.label, { opacity: focused ? 1 : 0.7 }]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  shell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.sm,
  },
  iconSlot: {
    width: 48,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
