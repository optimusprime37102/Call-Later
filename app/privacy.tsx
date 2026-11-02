import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/context/ThemeContext';
import { radius, spacing } from '@/src/theme/tokens';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Overview',
    body: 'Call Later is a local-first callback reminder app. Core features work on your device without an account and without sending your reminder data to our servers.',
  },
  {
    title: 'Information we store',
    body: 'Reminders you create (contact name, phone number, scheduled time, optional notes, and completion status) are saved locally on your device using on-device storage. App preferences such as theme, snooze defaults, and notification settings are also stored locally.',
  },
  {
    title: 'Contacts',
    body: 'If you choose a contact when scheduling, Call Later reads contacts you select so it can fill in a name and phone number. Contacts are not uploaded. Access is only used to help you schedule callbacks.',
  },
  {
    title: 'Notifications & alarms',
    body: 'With your permission, Call Later schedules local notifications and optional full-screen alarm overlays so you are reminded at the chosen time. These alerts are delivered by your device’s system services.',
  },
  {
    title: 'Calling',
    body: 'Call Now opens your device’s phone dialer with the saved number. Call Later does not place calls itself and does not read your call history.',
  },
  {
    title: 'Internet & accounts',
    body: 'Call Later does not require an account for core features. Reminder data stays on your device. Sharing the app or contacting support uses your device’s share sheet or email app.',
  },
  {
    title: 'Your choices',
    body: 'You can disable notifications, revoke contacts or overlay permissions in system settings, edit or delete reminders, and uninstall the app to remove local data stored by Call Later.',
  },
  {
    title: 'Contact',
    body: 'Questions about privacy: support@calllater.app',
  },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
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
            styles.intro,
            { backgroundColor: colors.primaryMuted, borderColor: colors.borderSubtle },
          ]}
        >
          <AppText variant="caption" tone="secondary">
            Last updated · November 2026
          </AppText>
          <AppText variant="body" style={{ marginTop: spacing.sm }}>
            This policy explains what Call Later stores on your device and how permissions are used.
          </AppText>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.block}>
            <AppText variant="headline">{section.title}</AppText>
            <AppText variant="callout" tone="secondary" style={styles.body}>
              {section.body}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  intro: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
  },
  block: {
    gap: spacing.sm,
  },
  body: {
    lineHeight: 22,
  },
});
