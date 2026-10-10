import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SuccessCheck } from '../components/SuccessCheck';
import { colors, font, radius } from '../theme';

type Celebration = { title: string; subtitle?: string; color?: string; key: number };

const FeedbackContext = createContext<{ celebrate: (c: Omit<Celebration, 'key'>) => void } | null>(null);

/**
 * App-wide success overlay. Lives above all screens so it can still play after the screen
 * or card that triggered it has gone (e.g. an approved request leaving the pending list).
 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Celebration | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const celebrate = useCallback((c: Omit<Celebration, 'key'>) => {
    if (timer.current) clearTimeout(timer.current);
    // Small delay lets a closing dialog's modal finish dismissing first (iOS can't present
    // a new modal while another one is animating out).
    timer.current = setTimeout(() => {
      setCurrent({ ...c, key: Date.now() });
      timer.current = setTimeout(() => setCurrent(null), 1400);
    }, 350);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <FeedbackContext.Provider value={{ celebrate }}>
      {children}
      <Modal visible={!!current} transparent animationType="fade" onRequestClose={() => setCurrent(null)}>
        <View style={styles.backdrop} accessibilityLiveRegion="polite">
          {current ? (
            <View style={styles.card} key={current.key}>
              <SuccessCheck color={current.color ?? colors.success} />
              <Text style={styles.title}>{current.title}</Text>
              {current.subtitle ? <Text style={styles.subtitle}>{current.subtitle}</Text> : null}
            </View>
          ) : null}
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: 'center',
    minWidth: 240,
  },
  title: { ...font.h2, textAlign: 'center' },
  subtitle: { ...font.muted, textAlign: 'center', marginTop: 6 },
});
