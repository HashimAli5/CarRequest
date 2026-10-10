import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font, radius } from '../theme';
import { Button } from './Button';
import { WakingNote } from './ConnectionBanner';
import { InlineError } from './InlineError';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  tone?: 'primary' | 'success' | 'danger' | 'alternative';
  confirmLabel: string;
  loadingLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const TONE = {
  primary: { color: colors.primary, soft: colors.primarySoft, button: 'primary' as const },
  success: { color: colors.success, soft: colors.successSoft, button: 'success' as const },
  danger: { color: colors.error, soft: colors.errorSoft, button: 'dangerSolid' as const },
  alternative: { color: colors.alternative, soft: colors.alternativeSoft, button: 'alternativeSolid' as const },
};

export function ConfirmDialog({
  visible,
  title,
  message,
  children,
  icon = 'help-circle',
  tone = 'primary',
  confirmLabel,
  loadingLabel,
  cancelLabel = 'Cancel',
  loading,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 7 }).start();
    }
  }, [visible, anim]);

  const t = TONE[tone];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel}>
        <Animated.View
          style={[
            styles.dialog,
            {
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
            },
          ]}
        >
          <Pressable accessibilityViewIsModal>
            <View style={[styles.iconWrap, { backgroundColor: t.soft }]}>
              <Ionicons name={icon} size={28} color={t.color} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {children}
            {error ? (
              <View style={styles.error}>
                <InlineError message={error} />
              </View>
            ) : null}
            <View style={styles.buttons}>
              <Button
                title={confirmLabel}
                loadingTitle={loadingLabel}
                variant={t.button}
                loading={loading}
                onPress={onConfirm}
              />
              <WakingNote active={!!loading} />
              <Button title={cancelLabel} variant="ghost" disabled={loading} onPress={onCancel} size="md" />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 24,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: { ...font.h2, textAlign: 'center' },
  message: { ...font.muted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  error: { marginTop: 14 },
  buttons: { marginTop: 22, gap: 6 },
});
