import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme';

/** Pop-in check mark with a soft ring pulse. */
export function SuccessCheck({
  color = colors.success,
  icon = 'checkmark',
}: {
  color?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const pop = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14 }),
      Animated.timing(ring, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [pop, ring]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: color,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }],
          },
        ]}
      />
      <Animated.View style={[styles.circle, { backgroundColor: color, transform: [{ scale: pop }] }]}>
        <Ionicons name={icon} size={52} color={colors.white} />
      </Animated.View>
    </View>
  );
}

const SIZE = 104;
const styles = StyleSheet.create({
  wrap: { width: SIZE * 1.7, height: SIZE * 1.7, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3 },
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
});
