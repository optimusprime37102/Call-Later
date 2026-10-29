import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { SplashView } from '@/src/components/SplashView';
import { AlarmOverlayProvider } from '@/src/context/AlarmOverlayContext';
import { DialogProvider } from '@/src/context/DialogContext';
import { RemindersProvider, useReminders } from '@/src/context/RemindersContext';
import { ThemeProvider, useAppTheme } from '@/src/context/ThemeContext';
import { useNotificationResponses } from '@/src/hooks/useNotificationResponses';
import { SPLASH_DURATION_MS } from '@/src/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function NotificationBridge() {
  useNotificationResponses();
  return null;
}

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { isReady: themeReady, colorScheme } = useAppTheme();
  const { isReady: remindersReady } = useReminders();
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const booted = themeReady && remindersReady && minTimeDone;

  if (!booted) {
    return <SplashView />;
  }

  return (
    <DialogProvider>
      <AlarmOverlayProvider>
        <NotificationBridge />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </AlarmOverlayProvider>
    </DialogProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RemindersProvider>
        <AppBootstrap>
          <RootNavigator />
        </AppBootstrap>
      </RemindersProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '700',
          fontSize: 17,
        },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="schedule"
        options={{
          title: 'Schedule call',
          presentation: 'modal',
          headerStyle: { backgroundColor: colors.surface },
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <Stack.Screen
        name="reminder/[id]"
        options={{
          title: 'Reminder',
        }}
      />
    </Stack>
  );
}
