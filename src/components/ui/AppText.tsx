import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeContext';
import { typography } from '@/src/theme/tokens';

type Variant = keyof typeof typography;
type Tone = 'default' | 'secondary' | 'muted' | 'primary' | 'danger' | 'warning' | 'inverse';

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useAppTheme();

  const toneColor: Record<Tone, string> = {
    default: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    primary: colors.primary,
    danger: colors.danger,
    warning: colors.warning,
    inverse: colors.primaryText,
  };

  return (
    <Text
      {...rest}
      style={[typography[variant], { color: toneColor[tone] }, style as TextStyle]}
    >
      {children}
    </Text>
  );
}
