import { useEffect } from 'react';
import { Platform, Vibration } from 'react-native';
import {
  startAlarmFeedback,
  stopAlarmFeedback,
} from 'call-later-alarm';

const VIBRATE_PATTERN = [0, 600, 250, 600, 250, 800];

/**
 * Plays looping alarm sound + vibration while `active` is true.
 * Android uses the native MediaPlayer (USAGE_ALARM); iOS uses Vibration only.
 */
export function useAlarmFeedback(active: boolean) {
  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!active) return;

      if (Platform.OS === 'android') {
        try {
          await startAlarmFeedback();
        } catch (error) {
          console.warn('Failed to start native alarm feedback', error);
          try {
            Vibration.vibrate(VIBRATE_PATTERN, true);
          } catch {
            // Ignore.
          }
        }
        return;
      }

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
  }, [active]);
}
