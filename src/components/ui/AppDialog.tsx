import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/src/context/ThemeContext';
import { radius, shadows, spacing } from '@/src/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

export type DialogButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface DialogButton {
  label: string;
  onPress?: () => void;
  variant?: DialogButtonVariant;
}

export interface DialogConfig {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'danger' | 'success' | 'warning' | 'primary';
  buttons?: DialogButton[];
}

interface AppDialogProps {
  visible: boolean;
  config: DialogConfig | null;
  onClose: () => void;
}

export function AppDialog({ visible, config, onClose }: AppDialogProps) {
  const { colors } = useAppTheme();

  if (!config) return null;

  const tone = config.tone ?? 'default';
  const iconTone =
    tone === 'danger'
      ? colors.danger
      : tone === 'success'
        ? colors.success
        : tone === 'warning'
          ? colors.warning
          : colors.primary;
  const iconBg =
    tone === 'danger'
      ? colors.dangerMuted
      : tone === 'success'
        ? colors.successMuted
        : tone === 'warning'
          ? colors.warningMuted
          : colors.primaryMuted;

  const buttons =
    config.buttons && config.buttons.length > 0
      ? config.buttons
      : [{ label: 'OK', variant: 'primary' as const }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(180)}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          style={[
            styles.card,
            shadows.float,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {config.icon ? (
            <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
              <Ionicons name={config.icon} size={26} color={iconTone} />
            </View>
          ) : null}

          <AppText variant="title" style={styles.title}>
            {config.title}
          </AppText>
          {config.message ? (
            <AppText variant="callout" tone="secondary" style={styles.message}>
              {config.message}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            {buttons.map((button, index) => (
              <Button
                key={`${button.label}-${index}`}
                label={button.label}
                variant={button.variant ?? (index === buttons.length - 1 ? 'primary' : 'secondary')}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onClose();
                  button.onPress?.();
                }}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    letterSpacing: -0.4,
  },
  message: {
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
