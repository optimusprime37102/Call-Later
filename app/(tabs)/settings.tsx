import { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  canDrawOverlays,
  canUseFullScreenIntent,
  isAndroidAlarmSupported,
  openFullScreenIntentSettings,
  openOverlaySettings,
} from 'call-later-alarm';
import { AppText } from '@/src/components/ui/AppText';
import { useDialog } from '@/src/context/DialogContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import { useReminders } from '@/src/context/RemindersContext';
import {
  describeNotificationLimitations,
  requestNotificationPermissions,
} from '@/src/services/notifications';
import { rehydratePendingNotifications } from '@/src/services/reminderService';
import {
  SnoozeDurationMinutes,
  ThemePreference,
} from '@/src/types/settings';
import { radius, shadows, spacing } from '@/src/theme/tokens';

/** Keep in sync with tabBarStyle.height in app/(tabs)/_layout.tsx */
const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 68 : 88;

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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    colors,
    settings,
    setTheme,
    setDefaultSnooze,
    setNotificationsEnabled,
    setAlarmOverlayEnabled,
  } = useAppTheme();
  const { alert } = useDialog();
  const { refresh } = useReminders();
  const [busy, setBusy] = useState(false);

  const onToggleNotifications = async (enabled: boolean) => {
    setBusy(true);
    try {
      if (enabled) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          alert(
            'Permission needed',
            'Enable notifications in system settings so Call Later can remind you.',
            [
              { label: 'Not now', variant: 'secondary' },
              {
                label: 'Open settings',
                variant: 'primary',
                onPress: () => void Linking.openSettings(),
              },
            ],
          );
          return;
        }
      }
      await setNotificationsEnabled(enabled);
      await rehydratePendingNotifications(enabled, settings.alarmOverlayEnabled);
      await refresh();
    } catch (err) {
      alert(
        'Unable to update notifications',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  };

  const onToggleAlarmOverlay = async (enabled: boolean) => {
    setBusy(true);
    try {
      if (enabled && isAndroidAlarmSupported) {
        const drawAllowed = await canDrawOverlays();
        if (!drawAllowed) {
          alert(
            'Allow display over other apps',
            'This lets Call Later show the alarm overlay without opening the app.',
            [
              { label: 'Not now', variant: 'secondary' },
              {
                label: 'Open settings',
                variant: 'primary',
                onPress: () => void openOverlaySettings(),
              },
            ],
          );
        }
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
      }
      await setAlarmOverlayEnabled(enabled);
      if (settings.notificationsEnabled) {
        await rehydratePendingNotifications(true, enabled);
        await refresh();
      }
    } catch (err) {
      alert(
        'Unable to update full-screen alarm',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: TAB_BAR_HEIGHT + spacing.huge,
      }}
    >
      <View style={styles.header}>
        <AppText variant="label" tone="primary">
          PREFERENCES
        </AppText>
        <AppText variant="display" style={styles.title}>
          Settings
        </AppText>
        <AppText variant="callout" tone="secondary">
          Theme, snooze defaults, and reminder delivery.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="label" tone="muted" style={styles.sectionLabel}>
          APPEARANCE
        </AppText>
        <View
          style={[
            styles.card,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.optionRow}>
            {THEME_OPTIONS.map((option) => {
              const active = settings.theme === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => void setTheme(option.value)}
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
      </View>

      <View style={styles.section}>
        <AppText variant="label" tone="muted" style={styles.sectionLabel}>
          DEFAULT SNOOZE
        </AppText>
        <View
          style={[
            styles.card,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.optionRow}>
            {SNOOZE_OPTIONS.map((option) => {
              const active = settings.defaultSnoozeMinutes === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => void setDefaultSnooze(option.value)}
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
      </View>

      <View style={styles.section}>
        <AppText variant="label" tone="muted" style={styles.sectionLabel}>
          NOTIFICATIONS
        </AppText>
        <View
          style={[
            styles.card,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText variant="bodyMedium">Reminder alerts</AppText>
              <AppText variant="caption" tone="secondary">
                Schedule local notifications for upcoming calls
              </AppText>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => void onToggleNotifications(value)}
              disabled={busy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <AppText variant="bodyMedium">Full-screen alarm</AppText>
              <AppText variant="caption" tone="secondary">
                Show a system overlay when an alert fires — without opening the app
              </AppText>
            </View>
            <Switch
              value={settings.alarmOverlayEnabled}
              onValueChange={(value) => void onToggleAlarmOverlay(value)}
              disabled={!settings.notificationsEnabled || busy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          {settings.alarmOverlayEnabled && isAndroidAlarmSupported ? (
            <>
              <Pressable
                onPress={() => void openOverlaySettings()}
                style={styles.permissionLink}
              >
                <Ionicons name="layers-outline" size={16} color={colors.primary} />
                <AppText variant="caption" tone="primary" style={{ flex: 1 }}>
                  Allow display over other apps (required)
                </AppText>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => void openFullScreenIntentSettings()}
                style={styles.permissionLink}
              >
                <Ionicons name="phone-portrait-outline" size={16} color={colors.primary} />
                <AppText variant="caption" tone="primary" style={{ flex: 1 }}>
                  Allow full-screen lock-screen alarms
                </AppText>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
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
      </View>

      <View style={styles.section}>
        <AppText variant="label" tone="muted" style={styles.sectionLabel}>
          ABOUT
        </AppText>
        <View
          style={[
            styles.card,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <AppText variant="bodyMedium">Call Later</AppText>
          <AppText variant="caption" tone="secondary" style={{ marginTop: 4 }}>
            Local-only callback reminders. No account or internet required for core features.
            Call Now opens the Android dialer — this app never places calls or reads call logs.
          </AppText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionLabel: {
    marginLeft: 2,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
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
  switchText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    marginVertical: spacing.lg,
  },
  permissionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
});
