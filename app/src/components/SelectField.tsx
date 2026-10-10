import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius } from '../theme';
import { BottomSheet } from './BottomSheet';
import { FieldShell } from './FieldShell';
import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  value: string | null;
  options: readonly string[];
  placeholder: string;
  onChange: (value: string | null) => void;
  /** Label for the "nothing selected" option. */
  noneLabel?: string;
  disabled?: boolean;
};

export function SelectField({ label, value, options, placeholder, onChange, noneLabel, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const choose = (v: string | null) => {
    onChange(v);
    setOpen(false);
  };
  const all: (string | null)[] = noneLabel ? [null, ...options] : [...options];

  return (
    <>
      <FieldShell
        label={label}
        value={value}
        placeholder={placeholder}
        icon="chatbubble-ellipses"
        onPress={() => setOpen(true)}
        disabled={disabled}
      />
      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <ScrollView style={styles.list} bounces={false}>
          {all.map((opt) => {
            const selected = opt === value;
            return (
              <PressableScale
                key={opt ?? '__none'}
                onPress={() => choose(opt)}
                scaleTo={0.985}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <View style={styles.optionRow}>
                  <Text style={[styles.optionText, !opt && styles.none, selected && styles.selectedText]}>
                    {opt ?? noneLabel}
                  </Text>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 480 },
  option: { borderRadius: radius.md, paddingHorizontal: 14, minHeight: 52, justifyContent: 'center' },
  optionSelected: { backgroundColor: colors.primarySoft },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: { fontSize: 16, color: colors.text, fontWeight: '500' },
  none: { color: colors.textMuted },
  selectedText: { color: colors.primary, fontWeight: '700' },
});
