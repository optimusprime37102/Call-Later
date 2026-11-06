import { AppText } from '@/src/components/ui/AppText';
import {
  ALARM_SOUNDS,
  AlarmSoundId,
  getAlarmSound,
} from '@/src/constants/alarmSounds';
import { useAppTheme } from '@/src/context/ThemeContext';
import { palette, radius, shadows, spacing } from '@/src/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AlarmSoundScreen() {
  const insets = useSafeAreaInsets();
  const { colors, colorScheme, settings, setAlarmSoundId } = useAppTheme();
  // Local selection paints on the same tap — never wait on settings/native sync.
  const [selectedId, setSelectedId] = useState<AlarmSoundId>(
    settings.alarmSoundId,
  );
  const selected = getAlarmSound(selectedId);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [previewId, setPreviewId] = useState<AlarmSoundId | null>(null);
  const player = useAudioPlayer(getAlarmSound(settings.alarmSoundId).source);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setSelectedId(settings.alarmSoundId);
  }, [settings.alarmSoundId]);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      try {
        player.pause();
      } catch {
        // Player may already be released.
      }
    };
  }, [player]);

  useEffect(() => {
    if (previewId && status.didJustFinish) {
      setPreviewId(null);
    }
  }, [previewId, status.didJustFinish]);

  const stopPreview = useCallback(() => {
    setPreviewId(null);
    try {
      player.pause();
    } catch {
      // Ignore.
    }
  }, [player]);

  const previewSound = useCallback(
    (id: AlarmSoundId) => {
      const option = getAlarmSound(id);

      if (previewId === id && status.playing) {
        stopPreview();
        return;
      }

      setPreviewId(id);
      try {
        player.replace(option.source);
        player.loop = false;
        player.volume = 1;
        void player.seekTo(0).then(() => {
          player.play();
        });
      } catch {
        setPreviewId(null);
      }
    },
    [player, previewId, status.playing, stopPreview],
  );

  const selectSound = useCallback(
    (id: AlarmSoundId) => {
      if (id === selectedId) return;
      // Paint selection immediately.
      setSelectedId(id);
      setPreviewId(null);
      // Defer audio stop + persistence so the highlight never waits.
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        try {
          player.pause();
        } catch {
          // Ignore.
        }
        void setAlarmSoundId(id);
      }, 0);
    },
    [player, selectedId, setAlarmSoundId],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Alarm sound',
          headerStyle: {
            backgroundColor:
              colorScheme === 'dark' ? palette.ink900 : palette.teal800,
          },
          headerTintColor: palette.mist50,
          headerTitleStyle: {
            color: palette.mist50,
            fontWeight: '700',
            fontSize: 17,
          },
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing.xxl,
          paddingBottom: insets.bottom + spacing.huge,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.primaryMuted,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: colors.surface },
            ]}
          >
            <Ionicons name="musical-notes" size={22} color={colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <AppText variant="headline">Choose your alert tone</AppText>
            <AppText variant="caption" tone="secondary" style={styles.heroBody}>
              Tap a tone to select it. Use play to listen before you decide.
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.currentCard,
            shadows.soft,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
            },
          ]}
        >
          <View style={styles.currentLeft}>
            <AppText variant="label" tone="primary">
              CURRENT
            </AppText>
            <AppText variant="bodyMedium">{selected.title}</AppText>
            <AppText variant="caption" tone="secondary">
              {selected.subtitle}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              previewId === selected.id && status.playing
                ? 'Stop preview'
                : 'Preview current sound'
            }
            onPress={() => previewSound(selected.id)}
            style={[
              styles.playFab,
              {
                backgroundColor:
                  previewId === selected.id && status.playing
                    ? colors.primary
                    : colors.chipBackground,
              },
            ]}
          >
            <Ionicons
              name={
                previewId === selected.id && status.playing
                  ? 'stop'
                  : 'play'
              }
              size={18}
              color={
                previewId === selected.id && status.playing
                  ? colors.primaryText
                  : colors.primary
              }
            />
          </Pressable>
        </View>

        <View style={styles.listHeader}>
          <AppText variant="label" tone="muted">
            AVAILABLE TONES
          </AppText>
        </View>

        <View
          style={[
            styles.listCard,
            shadows.soft,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          {ALARM_SOUNDS.map((sound, index) => {
            const isSelected = sound.id === selectedId;
            const isPlaying = previewId === sound.id && status.playing;

            return (
              <View key={sound.id}>
                {index > 0 ? (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />
                ) : null}
                <View
                  style={[
                    styles.row,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryMuted
                        : 'transparent',
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => selectSound(sound.id)}
                    style={({ pressed }) => [
                      styles.rowMain,
                      { opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.toneBadge,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.chipBackground,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'musical-note'}
                        size={18}
                        color={isSelected ? colors.primaryText : colors.textMuted}
                      />
                    </View>

                    <View style={styles.rowText}>
                      <AppText
                        variant="bodyMedium"
                        style={{
                          color: isSelected ? colors.primary : colors.text,
                        }}
                      >
                        {sound.title}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        {sound.subtitle}
                      </AppText>
                    </View>

                    {isSelected ? (
                      <View
                        style={[
                          styles.selectedPill,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <AppText
                          variant="label"
                          style={{
                            color: colors.primaryText,
                            letterSpacing: 0.6,
                          }}
                        >
                          ON
                        </AppText>
                      </View>
                    ) : null}
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPlaying ? `Stop ${sound.title}` : `Preview ${sound.title}`
                    }
                    hitSlop={10}
                    onPress={() => previewSound(sound.id)}
                    style={[
                      styles.rowPlay,
                      {
                        backgroundColor: isPlaying
                          ? colors.primary
                          : colors.chipBackground,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isPlaying ? 'stop' : 'play'}
                      size={16}
                      color={isPlaying ? colors.primaryText : colors.primary}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <AppText variant="caption" tone="muted" style={styles.footerNote}>
          The selected tone plays when a reminder alert starts. Sound must stay
          enabled in Settings for alerts to ring.
        </AppText>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: 2,
  },
  heroBody: {
    lineHeight: 18,
  },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  currentLeft: {
    flex: 1,
    gap: 2,
  },
  playFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeader: {
    marginTop: spacing.xs,
    marginLeft: 2,
  },
  listCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  toneBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  selectedPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  rowPlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
  footerNote: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
