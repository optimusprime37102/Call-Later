import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeContext';
import {
  QUICK_SCHEDULE_OPTIONS,
  QuickScheduleOption,
} from '@/src/utils/dates';
import { radius, spacing } from '@/src/theme/tokens';
import { AppText } from './ui/AppText';

interface QuickScheduleChipsProps {
  selected: QuickScheduleOption;
  onSelect: (option: QuickScheduleOption) => void;
}

export function QuickScheduleChips({ selected, onSelect }: QuickScheduleChipsProps) {
  const { colors } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {QUICK_SCHEDULE_OPTIONS.map((option) => {
        const active = selected === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.chipActive : colors.chipBackground,
                borderColor: active ? colors.chipActive : colors.borderSubtle,
              },
            ]}
          >
            <AppText
              variant="callout"
              tone={active ? 'inverse' : 'secondary'}
              style={active ? { color: colors.chipActiveText } : undefined}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
