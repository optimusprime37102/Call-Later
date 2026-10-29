import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/context/ThemeContext';
import { spacing } from '@/src/theme/tokens';

export default function NotFoundScreen() {
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppText variant="title">This screen doesn’t exist</AppText>
        <Link href="/" style={styles.link}>
          <AppText variant="bodyMedium" tone="primary">
            Go to Home
          </AppText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  link: {
    paddingVertical: spacing.md,
  },
});
