import React, { useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors } from '../theme';
import { BottomSheet } from './BottomSheet';
import { FieldShell } from './FieldShell';
import { PressableScale } from './PressableScale';

type Props = {
  mode: 'date' | 'time';
  label: string;
  value: Date | null;
  /** Formatted display string for `value`. */
  display: string | null;
  placeholder: string;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  error?: string | null;
  disabled?: boolean;
};

/** Native date/time picker: system dialog on Android, bottom-sheet wheel/calendar on iOS. */
export function DateTimeField({
  mode,
  label,
  value,
  display,
  placeholder,
  onChange,
  minimumDate,
  error,
  disabled,
}: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? defaultValue(mode));

  const open = () => {
    const initial = value ?? defaultValue(mode);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode,
        value: initial,
        is24Hour: false,
        minimumDate: mode === 'date' ? minimumDate : undefined,
        onValueChange: (_e, d) => onChange(d),
      });
    } else {
      setDraft(initial);
      setIosOpen(true);
    }
  };

  return (
    <>
      <FieldShell
        label={label}
        value={display}
        placeholder={placeholder}
        icon={mode === 'date' ? 'calendar' : 'time'}
        onPress={open}
        error={error}
        disabled={disabled}
      />
      {Platform.OS === 'ios' ? (
        <BottomSheet
          visible={iosOpen}
          title={label}
          onClose={() => setIosOpen(false)}
          right={
            <PressableScale
              accessibilityRole="button"
              onPress={() => {
                onChange(draft);
                setIosOpen(false);
              }}
              style={styles.done}
            >
              <Text style={styles.doneText}>Done</Text>
            </PressableScale>
          }
        >
          <DateTimePicker
            mode={mode}
            value={draft}
            display={mode === 'date' ? 'inline' : 'spinner'}
            minimumDate={mode === 'date' ? minimumDate : undefined}
            minuteInterval={5}
            themeVariant="light"
            accentColor={colors.primary}
            onValueChange={(_e, d) => setDraft(d)}
            style={mode === 'time' ? styles.spinner : undefined}
          />
        </BottomSheet>
      ) : null}
    </>
  );
}

function defaultValue(mode: 'date' | 'time') {
  const d = new Date();
  if (mode === 'time') {
    // Next round half hour feels nicer than "now".
    d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  }
  return d;
}

const styles = StyleSheet.create({
  done: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.primarySoft },
  doneText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  spinner: { alignSelf: 'center' },
});
