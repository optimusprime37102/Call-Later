import React from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/src/theme/tokens';
import { AppText } from './AppText';

interface SectionHeaderProps {
  title: string;
  count?: number;
  tone?: 'default' | 'danger' | 'warning' | 'primary';
}

export function SectionHeader({ title, count, tone = 'default' }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="label" tone={tone === 'default' ? 'muted' : tone}>
        {title.toUpperCase()}
      </AppText>
      {typeof count === 'number' ? (
        <AppText variant="label" tone="muted">
          {count}
        </AppText>
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
});
