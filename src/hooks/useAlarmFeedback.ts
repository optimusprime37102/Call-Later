import { useEffect } from 'react';
import { Platform, Vibration } from 'react-native';
import {
  startAlarmFeedback,
  stopAlarmFeedback,
} from 'call-later-alarm';
import { useAppTheme } from '@/src/context/ThemeContext';

const VIBRATE_PATTERN = [0, 600, 250, 600, 250, 800];

/**
 * Plays looping alarm sound + vibration while `active` is true,
 * respecting Settings → alarm sound / vibrate toggles.
 * Android uses the native MediaPlayer (USAGE_ALARM); iOS uses Vibration only.
 */
export function useAlarmFeedback(active: boolean) {
  const { settings } = useAppTheme();
  const soundEnabled = settings.alarmSoundEnabled;
  const vibrateEnabled = settings.alarmVibrateEnabled;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!active) return;

      if (Platform.OS === 'android') {
        try {
          // Native player reads sound/vibrate prefs synced from settings.
          if (soundEnabled || vibrateEnabled) {
            await startAlarmFeedback();
          }
        } catch (error) {
          console.warn('Failed to start native alarm feedback', error);
          if (vibrateEnabled) {
            try {
              Vibration.vibrate(VIBRATE_PATTERN, true);
            } catch {
              // Ignore.
            }
          }
        }
        return;
      }

      if (!vibrateEnabled) return;
      try {
        Vibration.vibrate(VIBRATE_PATTERN, true);
      } catch (error) {
        console.warn('Failed to start alarm vibration', error);
      }
    }

    async function stop() {
      Vibration.cancel();
      if (Platform.OS === 'android') {
        try {
          await stopAlarmFeedback();
        } catch {
          // Ignore.
        }
      }
    }

    if (active) {
      void start();
    } else {
      void stop();
    }

    return () => {
      cancelled = true;
      Vibration.cancel();
      if (Platform.OS === 'android') {
        void stopAlarmFeedback();
      }
      void cancelled;
    };
  }, [active, soundEnabled, vibrateEnabled]);
}
