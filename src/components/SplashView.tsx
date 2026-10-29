import React, { useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/src/components/ui/AppText';
import { SPLASH_BACKGROUND, SPLASH_DURATION_MS, radius, spacing } from '@/src/theme/tokens';

interface SplashViewProps {
  durationMs?: number;
}

export function SplashView({ durationMs = SPLASH_DURATION_MS }: SplashViewProps) {
  const { width } = useWindowDimensions();
  const trackWidth = Math.max(width - spacing.xxxl * 2, 120);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [durationMs, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: Math.max(progress.value * trackWidth, 8),
  }));

  return (
    <View style={styles.root} accessibilityLabel="Call Later splash screen">
      <View style={styles.washTop} />
      <View style={styles.washBottom} />
      <View style={styles.glow} />

      <View style={styles.brandBlock}>
        <View style={styles.logoFrame}>
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <AppText variant="display" style={styles.title}>
          Call Later
        </AppText>
        <AppText variant="callout" style={styles.tagline}>
          Callbacks, right on time
        </AppText>
      </View>

      <View style={styles.footer}>
        <View style={[styles.track, { width: trackWidth }]}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  washTop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A1A22',
    opacity: 0.55,
  },
  washBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
    backgroundColor: '#0D2A28',
    opacity: 0.5,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(45, 212, 191, 0.16)',
    top: '28%',
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  logoFrame: {
    width: 108,
    height: 108,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(45, 212, 191, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logo: {
    width: 72,
    height: 72,
  },
  title: {
    color: '#F4F7F9',
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(184, 205, 216, 0.86)',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 72,
    left: spacing.xxxl,
    right: spacing.xxxl,
    alignItems: 'center',
  },
  track: {
    height: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: '#2DD4BF',
  },
});
