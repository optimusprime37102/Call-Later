import { Linking, Platform } from 'react-native';
import { buildTelUrl, normalizePhoneNumber } from '@/src/utils/phone';

export async function openDialer(phoneNumber: string): Promise<void> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) {
    throw new Error('Phone number is required');
  }

  const url = buildTelUrl(normalized);
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen && Platform.OS !== 'android') {
    throw new Error('Unable to open the phone dialer on this device');
  }

  await Linking.openURL(url);
}
