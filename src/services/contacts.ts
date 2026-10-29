import {
  Contact,
  ContactField,
  ContactsSortOrder,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-contacts';

export interface ContactPickResult {
  name: string;
  phoneNumber: string;
}

export async function ensureContactsPermission(): Promise<boolean> {
  const current = await getPermissionsAsync();
  if (current.granted) return true;

  const requested = await requestPermissionsAsync();
  return requested.granted;
}

export async function loadPhoneContacts(): Promise<ContactPickResult[]> {
  const granted = await ensureContactsPermission();
  if (!granted) {
    throw new Error('Contacts permission is required to pick a contact');
  }

  const data = await Contact.getAllDetails(
    [ContactField.FULL_NAME, ContactField.PHONES] as const,
    { sortOrder: ContactsSortOrder.GivenName },
  );

  const results: ContactPickResult[] = [];

  for (const contact of data) {
    const phones = contact.phones ?? [];
    if (!phones.length) continue;

    const displayName = contact.fullName?.trim() || 'Unknown';

    for (const phone of phones) {
      const number = phone.number?.trim();
      if (!number) continue;
      results.push({
        name: displayName,
        phoneNumber: number,
      });
    }
  }

  return results;
}
