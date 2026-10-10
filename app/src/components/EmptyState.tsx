import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font } from '../theme';
import { FadeIn } from './FadeIn';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  tint?: string;
};

export function EmptyState({ icon, title, subtitle, children, tint = colors.primary }: Props) {
  return (
    <FadeIn style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: tint + '18' }]}>
        <Ionicons name={icon} size={34} color={tint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { ...font.h3, fontSize: 18, textAlign: 'center' },
  subtitle: { ...font.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  actions: { marginTop: 20, alignSelf: 'stretch' },
});
