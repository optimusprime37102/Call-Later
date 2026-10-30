import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/context/ThemeContext';
import { radius, spacing } from '@/src/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors, colorScheme } = useAppTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ring,
          {
            borderColor:
              colorScheme === 'dark'
                ? 'rgba(45,212,191,0.18)'
                : 'rgba(13,148,136,0.16)',
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(45,212,191,0.04)'
                : 'rgba(13,148,136,0.04)',
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
      </View>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="callout" tone="secondary" style={styles.description}>
        {description}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge + spacing.md,
  },
  ring: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: 'center',
    maxWidth: 290,
  },
  button: {
    marginTop: spacing.xl,
    minWidth: 190,
  },
});
