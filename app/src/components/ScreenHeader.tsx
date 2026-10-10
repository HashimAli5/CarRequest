import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { colors, font } from '../theme';
import { PressableScale } from './PressableScale';

type Props = {
  title: string;
  /** "back" shows a chevron, "close" an X (for modal screens). */
  kind?: 'back' | 'close';
  disabled?: boolean;
};

export function ScreenHeader({ title, kind = 'back', disabled }: Props) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={styles.row}>
      <PressableScale
        onPress={goBack}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={kind === 'close' ? 'Close' : 'Back'}
        hitSlop={10}
        style={styles.btn}
      >
        <Ionicons name={kind === 'close' ? 'close' : 'chevron-back'} size={22} color={colors.text} />
      </PressableScale>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.btnSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSpacer: { width: 40 },
  title: { ...font.h3, flex: 1, textAlign: 'center' },
});
