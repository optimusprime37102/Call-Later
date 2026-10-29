import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useAppTheme } from '@/src/context/ThemeContext';
import { SnoozeDurationMinutes } from '@/src/types/settings';
import { radius, spacing } from '@/src/theme/tokens';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';

const OPTIONS: { minutes: SnoozeDurationMinutes; label: string }[] = [
  { minutes: 10, label: '10 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
];

interface SnoozeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (minutes: SnoozeDurationMinutes) => void;
  defaultMinutes?: SnoozeDurationMinutes;
}

export function SnoozeSheet({
  visible,
  onClose,
  onSelect,
  defaultMinutes = 10,
}: SnoozeSheetProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(160)}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          entering={FadeInUp.springify().damping(18)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, spacing.xl),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <AppText variant="headline" style={styles.title}>
            Snooze reminder
          </AppText>
          <AppText variant="caption" tone="secondary" style={styles.subtitle}>
            Pick how long to wait before the next nudge.
          </AppText>
          <View style={styles.options}>
            {OPTIONS.map((option) => (
              <Button
                key={option.minutes}
                label={option.label}
                variant={option.minutes === defaultMinutes ? 'primary' : 'secondary'}
                onPress={() => onSelect(option.minutes)}
              />
            ))}
          </View>
          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: 2,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  options: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
