import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  canScheduleExactAlarms,
  isAndroidAlarmSupported,
  isIgnoringBatteryOptimizations,
  openExactAlarmSettings,
  requestIgnoreBatteryOptimizations,
} from 'call-later-alarm';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { useAppTheme } from '@/src/context/ThemeContext';
import { requestNotificationPermissions } from '@/src/services/notifications';
import { radius, shadows, spacing } from '@/src/theme/tokens';

type GateStep = 'notifications' | 'delivery' | null;

async function hasNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function readDeliveryPermissions() {
  const [exactOk, batteryOk] = await Promise.all([
    canScheduleExactAlarms(),
    isIgnoringBatteryOptimizations(),
  ]);
  return { exactOk, batteryOk };
}

/**
 * Mandatory permission flow (card dialog, not full-screen):
 * 1) Notification permission
 * 2) Alarms & reminders + Unrestricted battery (Android)
 */
export function DeliveryPermissionsGate() {
  const { colors, settings, setNotificationsEnabled } = useAppTheme();
  const allowFlowActiveRef = useRef(false);
  const lastSnapRef = useRef('');
  const [step, setStep] = useState<GateStep>(null);
  const [busy, setBusy] = useState(false);

  const resolveStep = useCallback(async (): Promise<GateStep> => {
    try {
      const notifOk = await hasNotificationPermission();
      if (!notifOk) return 'notifications';

      if (!isAndroidAlarmSupported) return null;

      // Notifications are required — keep the in-app toggle aligned.
      if (!settings.notificationsEnabled) {
        void setNotificationsEnabled(true);
      }

      const { exactOk, batteryOk } = await readDeliveryPermissions();
      if (exactOk && batteryOk) return null;
      return 'delivery';
    } catch {
      return null;
    }
  }, [setNotificationsEnabled, settings.notificationsEnabled]);

  const refreshStep = useCallback(async () => {
    const next = await resolveStep();
    setStep(next);
    if (next == null) {
      allowFlowActiveRef.current = false;
    }
  }, [resolveStep]);

  const openNextDeliverySetting = useCallback(async () => {
    setBusy(true);
    try {
      const { exactOk, batteryOk } = await readDeliveryPermissions();
      if (exactOk && batteryOk) {
        allowFlowActiveRef.current = false;
        setStep(null);
        return;
      }

      lastSnapRef.current = `${exactOk}:${batteryOk}`;
      allowFlowActiveRef.current = true;

      if (!exactOk) {
        await openExactAlarmSettings();
        return;
      }
      await requestIgnoreBatteryOptimizations();
    } catch {
      // Gate stays until both are granted.
    } finally {
      setBusy(false);
    }
  }, []);

  const onAllowNotifications = useCallback(async () => {
    setBusy(true);
    try {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        // System denied — open app settings so the user can enable it.
        await Linking.openSettings();
        return;
      }
      void setNotificationsEnabled(true);
      const next = await resolveStep();
      setStep(next);
      if (next === 'delivery') {
        // Show delivery dialog next; user taps Allow again.
      }
    } catch {
      // Stay on notifications step.
    } finally {
      setBusy(false);
    }
  }, [resolveStep, setNotificationsEnabled]);

  const onAllowDelivery = useCallback(() => {
    void openNextDeliverySetting();
  }, [openNextDeliverySetting]);

  useEffect(() => {
    void refreshStep();
  }, [refreshStep]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;

      void (async () => {
        const next = await resolveStep();

        if (next == null) {
          allowFlowActiveRef.current = false;
          setStep(null);
          return;
        }

        if (next === 'notifications') {
          allowFlowActiveRef.current = false;
          setStep('notifications');
          return;
        }

        // delivery still required
        setStep('delivery');

        if (allowFlowActiveRef.current) {
          try {
            const { exactOk, batteryOk } = await readDeliveryPermissions();
            const snap = `${exactOk}:${batteryOk}`;
            if (snap !== lastSnapRef.current) {
              lastSnapRef.current = snap;
              await openNextDeliverySetting();
              return;
            }
            allowFlowActiveRef.current = false;
          } catch {
            allowFlowActiveRef.current = false;
          }
        }
      })();
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [openNextDeliverySetting, resolveStep]);

  if (step == null) return null;

  const isNotifications = step === 'notifications';

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Required — back must not skip mandatory permissions.
      }}
    >
      <Animated.View
        entering={FadeIn.duration(180)}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        {/* Block taps through; do not dismiss. */}
        <Pressable style={StyleSheet.absoluteFill} />

        <Animated.View
          entering={FadeInDown.duration(180)}
          style={[
            styles.card,
            shadows.float,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}
          >
            <Ionicons
              name={isNotifications ? 'notifications-outline' : 'alarm-outline'}
              size={26}
              color={colors.primary}
            />
          </View>

          <AppText variant="title" style={styles.title}>
            {isNotifications
              ? 'Allow notifications'
              : 'Allow on-time alerts'}
          </AppText>
          <AppText variant="callout" tone="secondary" style={styles.message}>
            {isNotifications
              ? 'Notification permission is required so Call Later can remind you when it’s time to call.'
              : 'Alarms & reminders and Unrestricted battery are required so reminders fire on time — even in Doze or battery saver.'}
          </AppText>

          <Button
            label="Allow"
            onPress={() => {
              void Haptics.selectionAsync();
              if (isNotifications) {
                void onAllowNotifications();
              } else {
                onAllowDelivery();
              }
            }}
            disabled={busy}
            loading={busy}
          />
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
});
