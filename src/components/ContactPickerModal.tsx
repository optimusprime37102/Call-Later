import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/context/ThemeContext';
import {
  ContactPickResult,
  loadPhoneContacts,
} from '@/src/services/contacts';
import { radius, shadows, spacing, typography } from '@/src/theme/tokens';
import { AppText } from './ui/AppText';
import { IconButton } from './ui/IconButton';

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (contact: ContactPickResult) => void;
}

export function ContactPickerModal({
  visible,
  onClose,
  onSelect,
}: ContactPickerModalProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactPickResult[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadPhoneContacts();
        if (!cancelled) setContacts(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load contacts');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phoneNumber.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          <View>
            <AppText variant="label" tone="primary">
              CONTACTS
            </AppText>
            <AppText variant="title">Choose contact</AppText>
          </View>
          <IconButton
            name="close"
            accessibilityLabel="Close contacts"
            onPress={onClose}
          />
        </View>

        <View
          style={[
            styles.search,
            shadows.soft,
            { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name or number"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, typography.body, { color: colors.text }]}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <AppText tone="danger" style={{ textAlign: 'center' }}>
              {error}
            </AppText>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, index) => `${item.phoneNumber}-${index}`}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <AppText tone="secondary" style={{ textAlign: 'center', marginTop: 40 }}>
                No contacts with phone numbers found.
              </AppText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  shadows.soft,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
                  <AppText variant="callout" tone="primary">
                    {item.name.charAt(0).toUpperCase()}
                  </AppText>
                </View>
                <View style={styles.rowText}>
                  <AppText variant="bodyMedium" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {item.phoneNumber}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  search: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});
