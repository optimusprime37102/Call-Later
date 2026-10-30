import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeContext';
import { radius, spacing } from '@/src/theme/tokens';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  count?: number;
  tone?: 'default' | 'danger' | 'warning' | 'primary';
}

export function SectionHeader({ title, count, tone = 'default' }: SectionHeaderProps) {
  const { colors } = useAppTheme();

  const dotColor =
    tone === 'danger'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : tone === 'primary'
          ? colors.primary
          : colors.textMuted;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <AppText variant="label" tone={tone === 'default' ? 'muted' : tone}>
          {title.toUpperCase()}
        </AppText>
      </View>
      {typeof count === 'number' ? (
        <View
          style={[
            styles.countPill,
            {
              backgroundColor:
                tone === 'danger'
                  ? colors.dangerMuted
                  : tone === 'primary'
                    ? colors.primaryMuted
                    : colors.backgroundSecondary,
            },
          ]}
        >
          <AppText
            variant="label"
            tone={tone === 'default' ? 'muted' : tone}
            style={styles.count}
          >
            {count}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  countPill: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 10,
  },
});
