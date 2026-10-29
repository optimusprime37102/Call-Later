import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeContext';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { AppText } from './ui/AppText';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="muted" style={styles.label}>
        {label.toUpperCase()}
      </AppText>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...rest}
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: error ? colors.danger : colors.borderSubtle,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    marginLeft: 2,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
