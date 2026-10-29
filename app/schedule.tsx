import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { ContactPickerModal } from '@/src/components/ContactPickerModal';
import { QuickScheduleChips } from '@/src/components/QuickScheduleChips';
import { TextField } from '@/src/components/TextField';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { useDialog } from '@/src/context/DialogContext';
import { useReminders } from '@/src/context/RemindersContext';
import { useAppTheme } from '@/src/context/ThemeContext';
import {
  QuickScheduleOption,
  resolveQuickSchedule,
} from '@/src/utils/dates';
import { isValidPhoneNumber } from '@/src/utils/phone';
import { radius, shadows, spacing } from '@/src/theme/tokens';

export default function ScheduleScreen() {
  const { colors } = useAppTheme();
  const { alert } = useDialog();
  const { createReminder, updateReminder, getById } = useReminders();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = typeof params.id === 'string' ? params.id : undefined;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [quick, setQuick] = useState<QuickScheduleOption>('1h');
  const [scheduledAt, setScheduledAt] = useState(() => resolveQuickSchedule('1h'));
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [contactOpen, setContactOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; time?: string }>({});
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    void (async () => {
      const reminder = await getById(editId);
      if (cancelled) return;
      if (!reminder) {
        alert('Not found', 'This reminder no longer exists.', [
          { label: 'OK', variant: 'primary', onPress: () => router.back() },
        ]);
        return;
      }
      setName(reminder.contactName);
      setPhone(reminder.phoneNumber);
      setNotes(reminder.notes ?? '');
      setScheduledAt(new Date(reminder.scheduledAt));
      setQuick('custom');
      setLoadingEdit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [alert, editId, getById]);

  const scheduledLabel = useMemo(
    () => format(scheduledAt, "EEE, MMM d · h:mm a"),
    [scheduledAt],
  );

  const onQuickSelect = (option: QuickScheduleOption) => {
    setQuick(option);
    if (option === 'custom') {
      setShowPicker(true);
      setPickerMode('date');
      return;
    }
    setScheduledAt(resolveQuickSchedule(option));
  };

  const onPickerValueChange = (
    _event: DateTimePickerChangeEvent,
    date: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);

      if (pickerMode === 'date') {
        const next = new Date(scheduledAt);
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        setScheduledAt(next);
        setPickerMode('time');
        setShowPicker(true);
        return;
      }

      const next = new Date(scheduledAt);
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setScheduledAt(next);
      setQuick('custom');
      return;
    }

    setScheduledAt(date);
    setQuick('custom');
  };

  const onPickerDismiss = () => {
    setShowPicker(false);
  };

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = 'Enter a name';
    if (!phone.trim()) nextErrors.phone = 'Enter a phone number';
    else if (!isValidPhoneNumber(phone)) nextErrors.phone = 'Enter a valid phone number';
    if (scheduledAt.getTime() <= Date.now()) nextErrors.time = 'Choose a future time';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editId) {
        await updateReminder(editId, {
          contactName: name.trim(),
          phoneNumber: phone.trim(),
          scheduledAt: scheduledAt.getTime(),
          notes: notes.trim() || null,
          status: 'pending',
          completedAt: null,
        });
      } else {
        await createReminder({
          contactName: name.trim(),
          phoneNumber: phone.trim(),
          scheduledAt: scheduledAt.getTime(),
          notes: notes.trim() || null,
        });
      }
      router.back();
    } catch (err) {
      alert(
        'Could not save reminder',
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: editId ? 'Edit reminder' : 'Schedule call' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {loadingEdit ? (
            <AppText tone="secondary">Loading reminder…</AppText>
          ) : (
            <>
              <Pressable
                onPress={() => setContactOpen(true)}
                style={[
                  styles.contactButton,
                  shadows.soft,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={[styles.contactIcon, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="people-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyMedium">Select from contacts</AppText>
                  <AppText variant="caption" tone="secondary">
                    Or enter a name and number manually below
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              <TextField
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Who should you call?"
                autoCapitalize="words"
                error={errors.name}
              />

              <TextField
                label="Phone number"
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 555 000 0000"
                keyboardType="phone-pad"
                error={errors.phone}
              />

              <View style={styles.block}>
                <AppText variant="label" tone="muted">
                  WHEN
                </AppText>
                <QuickScheduleChips selected={quick} onSelect={onQuickSelect} />
                <Pressable
                  onPress={() => {
                    setQuick('custom');
                    setPickerMode('date');
                    setShowPicker(true);
                  }}
                  style={[
                    styles.timeCard,
                    shadows.soft,
                    {
                      backgroundColor: colors.surface,
                      borderColor: errors.time ? colors.danger : colors.borderSubtle,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <AppText variant="bodyMedium">{scheduledLabel}</AppText>
                </Pressable>
                {errors.time ? (
                  <AppText variant="caption" tone="danger">
                    {errors.time}
                  </AppText>
                ) : null}
              </View>

              <TextField
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Why you need to call…"
                multiline
                style={{ minHeight: 96, textAlignVertical: 'top' }}
              />

              <Button
                label={editId ? 'Save changes' : 'Schedule reminder'}
                onPress={() => void onSave()}
                loading={saving}
                style={{ marginTop: spacing.sm }}
              />
            </>
          )}
        </ScrollView>

        {showPicker ? (
          <DateTimePicker
            value={scheduledAt}
            mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onValueChange={onPickerValueChange}
            onDismiss={onPickerDismiss}
          />
        ) : null}

        <ContactPickerModal
          visible={contactOpen}
          onClose={() => setContactOpen(false)}
          onSelect={(contact) => {
            setName(contact.name);
            setPhone(contact.phoneNumber);
            setErrors((prev) => ({ ...prev, name: undefined, phone: undefined }));
          }}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xxl,
    gap: spacing.xl,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    gap: spacing.sm,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
