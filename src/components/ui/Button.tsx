import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/src/context/ThemeContext';
import { radius, shadows, spacing } from '@/src/theme/tokens';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  icon,
}: ButtonProps) {
  const { colors } = useAppTheme();

  const backgrounds: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.chipBackground,
    ghost: 'transparent',
    danger: colors.danger,
    success: colors.success,
  };

  const textTones: Record<Variant, 'inverse' | 'default' | 'primary' | 'danger'> = {
    primary: 'inverse',
    secondary: 'default',
    ghost: 'primary',
    danger: 'inverse',
    success: 'inverse',
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? shadows.soft : null,
        {
          backgroundColor: backgrounds[variant],
          borderColor: variant === 'ghost' || variant === 'secondary' ? colors.border : 'transparent',
          borderWidth: variant === 'ghost' || variant === 'secondary' ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'secondary' || variant === 'ghost'
              ? colors.primary
              : colors.primaryText
          }
        />
      ) : (
        <>
          {icon}
          <AppText variant="bodyMedium" tone={textTones[variant]}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
