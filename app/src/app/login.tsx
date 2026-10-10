import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../components/Button';
import { FadeIn } from '../components/FadeIn';
import { WakingNote } from '../components/ConnectionBanner';
import { InlineError } from '../components/InlineError';
import { useAuth } from '../context/AuthContext';
import { ApiError, NetworkError } from '../lib/api';
import { API_URL } from '../lib/config';
import { colors, font, radius } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    if (loading) return;
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      if (err instanceof NetworkError) {
        setError(`Can't reach the server at ${API_URL}.\nMake sure it's running and your phone is on the same Wi-Fi.`);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't sign in. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FadeIn style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons name="car-sport" size={44} color={colors.white} />
            </View>
            <Text style={styles.title}>Can I Take the Car?</Text>
            <Text style={styles.subtitle}>The official channel for borrowing the car.</Text>
          </FadeIn>

          <FadeIn delay={120} style={styles.form}>
            <View>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Your username"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!loading}
              />
            </View>
            <View>
              <Text style={styles.label}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!loading}
              />
            </View>
            <InlineError message={error} />
            <Button title="Sign In" icon="log-in" onPress={submit} loading={loading} loadingTitle="Signing in…" />
            <WakingNote active={loading} />
            <Text style={styles.note}>Private app — only two accounts exist.</Text>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 36 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    transform: [{ rotate: '-6deg' }],
  },
  title: { ...font.title, textAlign: 'center' },
  subtitle: { ...font.muted, fontSize: 15, marginTop: 6, textAlign: 'center' },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  note: { ...font.muted, fontSize: 13, textAlign: 'center' },
});
