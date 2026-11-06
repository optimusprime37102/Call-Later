import { AppText } from '@/src/components/ui/AppText';
import {
  APP_NAME,
  PLAY_STORE_MARKET_URL,
  PLAY_STORE_URL,
  SHARE_MESSAGE,
  SUPPORT_EMAIL,
} from '@/src/constants/appInfo';
import { useDialog } from '@/src/context/DialogContext';
import { useReminders } from '@/src/context/RemindersContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { describeNotificationLimitations } from '@/src/services/notifications';
import { rehydratePendingNotifications } from '@/src/services/reminderService';
import { tabBarContentInset } from '@/src/theme/layout';
import { radius, shadows, spacing } from '@/src/theme/tokens';
import { getAlarmSound } from '@/src/constants/alarmSounds';
import {
  SnoozeDurationMinutes,
  ThemePreference,
} from '@/src/types/settings';
import { Ionicons } from '@expo/vector-icons';
import {
  canDrawOverlays,
  canScheduleExactAlarms,
  canUseFullScreenIntent,
  isAndroidAlarmSupported,
  isIgnoringBatteryOptimizations,
  openBatteryOptimizationSettings,
  openExactAlarmSettings,
  openFullScreenIntentSettings,
  openOverlaySettings,
  requestIgnoreBatteryOptimizations,
} from 'call-later-alarm';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AppState,
  type AppStateStatus,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const SNOOZE_OPTIONS: { value: SnoozeDurationMinutes; label: string }[] = [
  { value: 10, label: '10 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    colors,
    settings,
    setTheme,
    setDefaultSnooze,
    setAlarmOverlayEnabled,
    setAlarmSoundEnabled,
    setAlarmVibrateEnabled,
  } = useAppTheme();
  const { alert } = useDialog();
  const { refresh } = useReminders();
  const [busy, setBusy] = useState(false);
  const [exactAlarmsOk, setExactAlarmsOk] = useState(false);
  const [batteryUnrestricted, setBatteryUnrestricted] = useState(false);
  /** Remount overlay Switch when enable is rejected so the thumb cannot stick ON. */
  const [overlaySwitchEpoch, setOverlaySwitchEpoch] = useState(0);
  /** Waiting for display-over-apps after user taps Allow in the prompt. */
  const pendingOverlayEnableRef = useRef(false);

  const keepOverlayToggleOff = useCallback(() => {
    pendingOverlayEnableRef.current = false;
    void setAlarmOverlayEnabled(false);
    setOverlaySwitchEpoch((n) => n + 1);
  }, [setAlarmOverlayEnabled]);

  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    '1.0.0';

  const refreshDeliveryPermissions = useCallback(async () => {
    if (!isAndroidAlarmSupported) {
      setExactAlarmsOk(true);
      setBatteryUnrestricted(true);
      return;
    }
    try {
      const [exactOk, batteryOk] = await Promise.all([
        canScheduleExactAlarms(),
        isIgnoringBatteryOptimizations(),
      ]);
      setExactAlarmsOk(exactOk);
      setBatteryUnrestricted(batteryOk);
    } catch {
      // Native module may be unavailable before rebuild.
    }
  }, []);

  const enableOverlayAfterPermission = useCallback(async () => {
    void setAlarmOverlayEnabled(true);
    setBusy(true);
    try {
      const fsiAllowed = await canUseFullScreenIntent();
      if (!fsiAllowed) {
        alert(
          'Allow full-screen alarms',
          'Needed so the alarm can appear on the lock screen.',
          [
            { label: 'Not now', variant: 'secondary' },
            {
              label: 'Open settings',
              variant: 'primary',
              onPress: () => void openFullScreenIntentSettings(),
            },
          ],
        );
      }
      await rehydratePendingNotifications(true, true);
      await refresh();
    } catch (err) {
      alert(
        'Unable to update full-screen alarm',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  }, [alert, refresh, setAlarmOverlayEnabled]);

  useEffect(() => {
    void refreshDeliveryPermissions();
    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;
      void refreshDeliveryPermissions();

      if (!pendingOverlayEnableRef.current) return;
      void (async () => {
        try {
          const drawAllowed = await canDrawOverlays();
          if (drawAllowed) {
            pendingOverlayEnableRef.current = false;
            await enableOverlayAfterPermission();
            return;
          }
          // Returned without granting — keep toggle off.
          keepOverlayToggleOff();
        } catch {
          keepOverlayToggleOff();
        }
      })();
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [
    enableOverlayAfterPermission,
    keepOverlayToggleOff,
    refreshDeliveryPermissions,
  ]);

  const onToggleAlarmOverlay = async (enabled: boolean) => {
    if (!enabled) {
      keepOverlayToggleOff();
      setBusy(true);
      try {
        await rehydratePendingNotifications(true, false);
        await refresh();
      } catch (err) {
        alert(
          'Unable to update full-screen alarm',
          err instanceof Error ? err.message : 'Something went wrong',
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    // Turning ON — require display-over-other-apps first (Android).
    if (isAndroidAlarmSupported) {
      const drawAllowed = await canDrawOverlays();
      if (!drawAllowed) {
        // Keep toggle OFF until permission is granted.
        keepOverlayToggleOff();
        pendingOverlayEnableRef.current = true;
        alert(
          'Allow display over other apps',
          'This lets Call Later show the alarm overlay without opening the app. Full-screen alarm stays off until you allow it.',
          [
            {
              label: 'Not now',
              variant: 'secondary',
              onPress: () => {
                keepOverlayToggleOff();
              },
            },
            {
              label: 'Allow',
              variant: 'primary',
              onPress: () => void openOverlaySettings(),
            },
          ],
        );
        return;
      }
    }

    await enableOverlayAfterPermission();
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: `${SHARE_MESSAGE}\n\n${PLAY_STORE_URL}`,
        title: APP_NAME,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const contactSupport = async () => {
    const subject = encodeURIComponent(`${APP_NAME} support`);
    const body = encodeURIComponent(
      `\n\n—\nApp: ${APP_NAME} ${version}\nPlatform: ${Platform.OS}`,
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        alert('Email unavailable', `Write to us at ${SUPPORT_EMAIL}`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      alert('Email unavailable', `Write to us at ${SUPPORT_EMAIL}`);
    }
  };

  const rateApp = async () => {
    const url = Platform.OS === 'android' ? PLAY_STORE_MARKET_URL : PLAY_STORE_URL;
    try {
      await Linking.openURL(url);
    } catch {
      await Linking.openURL(PLAY_STORE_URL);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: tabBarContentInset(insets.bottom) + spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <AppText variant="display">Settings</AppText>
      </View>

      <SettingsSection label="Appearance">
        <View
          style={[
            styles.cardBlock,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.inlineLabel}>
            <RowIcon name="color-palette-outline" tint={colors.primary} muted={colors.primaryMuted} />
            <AppText variant="bodyMedium">Theme</AppText>
          </View>
          <View style={styles.optionRow}>
            {THEME_OPTIONS.map((option) => {
              const active = settings.theme === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    void setTheme(option.value);
                  }}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? colors.chipActive : colors.chipBackground,
                    },
                  ]}
                >
                  <AppText
                    variant="callout"
                    style={{ color: active ? colors.chipActiveText : colors.textSecondary }}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SettingsSection>

      <SettingsSection label="Reminders">
        <View
          style={[
            styles.cardBlock,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.inlineLabel}>
            <RowIcon name="timer-outline" tint={colors.primary} muted={colors.primaryMuted} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">Default snooze</AppText>
              <AppText variant="caption" tone="secondary">
                Used when you snooze from an alert
              </AppText>
            </View>
          </View>
          <View style={styles.optionRow}>
            {SNOOZE_OPTIONS.map((option) => {
              const active = settings.defaultSnoozeMinutes === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    void setDefaultSnooze(option.value);
                  }}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? colors.chipActive : colors.chipBackground,
                    },
                  ]}
                >
                  <AppText
                    variant="callout"
                    style={{ color: active ? colors.chipActiveText : colors.textSecondary }}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SettingsSection>

      <SettingsSection label="Notifications">
        <View
          style={[
            styles.cardBlock,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <SwitchRow
            icon="volume-high-outline"
            title="Alarm sound"
            subtitle="Play tone when a call alert starts"
            value={settings.alarmSoundEnabled}
            disabled={busy}
            onValueChange={(value) => {
              void (async () => {
                await setAlarmSoundEnabled(value);
                await rehydratePendingNotifications(
                  true,
                  settings.alarmOverlayEnabled,
                );
              })();
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <SettingsLinkRow
            icon="musical-notes-outline"
            title="Alarm tone"
            subtitle={getAlarmSound(settings.alarmSoundId).title}
            onPress={() => router.push('/alarm-sound')}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <SwitchRow
            icon="pulse-outline"
            title="Alarm vibrate"
            subtitle="Vibrate while the call alert is active"
            value={settings.alarmVibrateEnabled}
            disabled={busy}
            onValueChange={(value) => {
              void (async () => {
                await setAlarmVibrateEnabled(value);
                await rehydratePendingNotifications(
                  true,
                  settings.alarmOverlayEnabled,
                );
              })();
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <SwitchRow
            key={`overlay-switch-${overlaySwitchEpoch}`}
            icon="phone-portrait-outline"
            title="Full-screen alarm"
            subtitle="Overlay alert without opening the app"
            value={settings.alarmOverlayEnabled}
            disabled={busy}
            onValueChange={(value) => void onToggleAlarmOverlay(value)}
          />
          {isAndroidAlarmSupported ? (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void Haptics.selectionAsync();
                  void openExactAlarmSettings();
                }}
                style={styles.permissionLink}
              >
                <RowIcon
                  name="alarm-outline"
                  tint={exactAlarmsOk ? colors.primary : colors.danger}
                  muted={exactAlarmsOk ? colors.primaryMuted : colors.dangerMuted}
                />
                <View style={{ flex: 1 }}>
                  <AppText
                    variant="caption"
                    tone={exactAlarmsOk ? 'primary' : 'danger'}
                  >
                    Alarms & reminders
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {exactAlarmsOk
                      ? 'Allowed — alerts can fire on time'
                      : 'Required — tap to allow exact alarms'}
                  </AppText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={exactAlarmsOk ? colors.primary : colors.danger}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void Haptics.selectionAsync();
                  void (batteryUnrestricted
                    ? openBatteryOptimizationSettings()
                    : requestIgnoreBatteryOptimizations());
                }}
                style={styles.permissionLink}
              >
                <RowIcon
                  name="battery-charging-outline"
                  tint={batteryUnrestricted ? colors.primary : colors.danger}
                  muted={
                    batteryUnrestricted ? colors.primaryMuted : colors.dangerMuted
                  }
                />
                <View style={{ flex: 1 }}>
                  <AppText
                    variant="caption"
                    tone={batteryUnrestricted ? 'primary' : 'danger'}
                  >
                    Unrestricted battery
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {batteryUnrestricted
                      ? 'Allowed — Doze won’t delay reminders'
                      : 'Required — tap to disable battery optimization'}
                  </AppText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={batteryUnrestricted ? colors.primary : colors.danger}
                />
              </Pressable>
            </>
          ) : null}
        </View>
        <View style={[styles.note, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
            {describeNotificationLimitations()}
          </AppText>
        </View>
      </SettingsSection>

      <SettingsSection label="Support">
        <View
          style={[
            styles.cardBlock,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <SettingsLinkRow
            icon="share-social-outline"
            title="Share app"
            subtitle="Tell a friend about Call Later"
            onPress={() => void shareApp()}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <SettingsLinkRow
            icon="mail-outline"
            title="Contact us"
            subtitle={SUPPORT_EMAIL}
            onPress={() => void contactSupport()}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <SettingsLinkRow
            icon="star-outline"
            title="Rate Call Later"
            subtitle="Leave feedback on the Play Store"
            onPress={() => void rateApp()}
          />
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <SettingsLinkRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            subtitle="How your data stays on device"
            onPress={() => router.push('/privacy')}
          />
        </View>
      </SettingsSection>

      <View style={styles.footer}>
        <AppText variant="caption" tone="muted" style={styles.footerText}>
          Call Later never places calls or reads call logs. Reminders stay on your device.
        </AppText>
        <AppText variant="label" tone="muted" style={styles.footerVersion}>
          VERSION {version}
        </AppText>
      </View>
    </ScrollView>
  );
}

function SettingsSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="muted" style={styles.sectionLabel}>
        {label.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

function RowIcon({
  name,
  tint,
  muted,
}: {
  name: IoniconName;
  tint: string;
  muted: string;
}) {
  return (
    <View style={[styles.rowIcon, { backgroundColor: muted }]}>
      <Ionicons name={name} size={18} color={tint} />
    </View>
  );
}

function SwitchRow({
  icon,
  title,
  subtitle,
  value,
  disabled,
  onValueChange,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors } = useAppTheme();

  // Fully controlled — no optimistic local thumb. Needed so rejected toggles
  // (e.g. full-screen alarm without overlay permission) stay OFF.
  return (
    <View style={styles.switchRow}>
      <RowIcon name={icon} tint={colors.primary} muted={colors.primaryMuted} />
      <View style={styles.switchText}>
        <AppText variant="bodyMedium">{title}</AppText>
        <AppText variant="caption" tone="secondary">
          {subtitle}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

function SettingsLinkRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.linkRow,
        { opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <RowIcon name={icon} tint={colors.primary} muted={colors.primaryMuted} />
      <View style={styles.switchText}>
        <AppText variant="bodyMedium">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionLabel: {
    marginLeft: 2,
  },
  cardBlock: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  inlineLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    marginVertical: spacing.lg,
  },
  permissionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  footerText: {
    textAlign: 'center',
    maxWidth: 320,
  },
  footerVersion: {
    letterSpacing: 1.2,
  },
});
