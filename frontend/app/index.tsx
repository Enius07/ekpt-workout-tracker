import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Role } from '@/src/lib/api';
import { loadLastLogin, loadSession, saveLastLogin, saveSession } from '@/src/lib/session';
import { theme, spacing, radius, fonts } from '@/src/lib/theme';


export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('client');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootChecked, setBootChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (s) {
        router.replace(s.role === 'trainer' ? '/trainer' : '/client');
        return;
      }
      const last = await loadLastLogin();
      if (last.code) setCode(last.code);
      if (last.role) setRole(last.role);
      setBootChecked(true);
    })();
  }, []);

  const onSubmit = async () => {
    setError(null);
    if (!code.trim()) {
      setError('Enter your access code');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.login(role, code.trim());
      await saveSession({
        role: resp.role as Role,
        user_id: resp.user_id || '',
        name: resp.name || '',
      });
      if (remember) {
        await saveLastLogin(resp.role as Role, code.trim().toUpperCase());
      }
      router.replace(resp.role === 'trainer' ? '/trainer' : '/client');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!bootChecked) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="login-screen">
      <SafeAreaView style={styles.hero}>
        <Image
          source={require('../assets/images/ekpt-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.tagline}>WORKOUT TRACKER</Text>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.form}
      >
        <View style={styles.segmented} testID="role-toggle">
          <Pressable
            testID="role-client-btn"
            style={[styles.segment, role === 'client' && styles.segmentActive]}
            onPress={() => setRole('client')}
          >
            <Text style={[styles.segmentText, role === 'client' && styles.segmentTextActive]}>
              CLIENT
            </Text>
          </Pressable>
          <Pressable
            testID="role-trainer-btn"
            style={[styles.segment, role === 'trainer' && styles.segmentActive]}
            onPress={() => setRole('trainer')}
          >
            <Text style={[styles.segmentText, role === 'trainer' && styles.segmentTextActive]}>
              TRAINER
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>ACCESS CODE</Text>
        <TextInput
          testID="access-code-input"
          value={code}
          onChangeText={setCode}
          placeholder={role === 'trainer' ? 'TRAINER' : 'e.g. AB12CD'}
          placeholderTextColor={theme.onSurfaceTertiary}
          autoCapitalize="characters"
          style={styles.input}
        />

        <Pressable
          testID="remember-toggle"
          style={styles.rememberRow}
          onPress={() => setRemember(!remember)}
        >
          <View style={[styles.checkbox, remember && styles.checkboxOn]}>
            {remember && <Ionicons name="checkmark" size={14} color={theme.onBrandPrimary} />}
          </View>
          <Text style={styles.rememberText}>Remember my code on this device</Text>
        </Pressable>

        {error && (
          <Text style={styles.error} testID="login-error">
            {error}
          </Text>
        )}

        <Pressable
          testID="login-submit-button"
          style={[styles.cta, loading && { opacity: 0.6 }]}
          disabled={loading}
          onPress={onSubmit}
        >
          {loading ? (
            <ActivityIndicator color={theme.onBrandPrimary} />
          ) : (
            <Text style={styles.ctaText}>ENTER</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  hero: {
    height: '38%',
    width: '100%',
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logo: { width: '80%', aspectRatio: 1, maxWidth: 280 },
  tagline: {
    color: theme.onSurfaceSecondary,
    fontSize: 14,
    letterSpacing: 6,
    fontFamily: fonts.brand,
    marginTop: -spacing.xl,
  },
  form: { flex: 1, padding: spacing.xl, justifyContent: 'flex-start', gap: spacing.lg },
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: theme.brand },
  segmentText: {
    color: theme.onSurfaceSecondary,
    fontSize: 14,
    letterSpacing: 2,
    fontFamily: fonts.brand,
  },
  segmentTextActive: { color: theme.onBrandPrimary },
  label: {
    color: theme.onSurfaceTertiary,
    fontSize: 12,
    letterSpacing: 2,
    fontFamily: fonts.brand,
  },
  input: {
    backgroundColor: theme.surfaceSecondary,
    color: theme.onSurface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 24,
    letterSpacing: 6,
    fontWeight: '800',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: theme.brand, borderColor: theme.brand },
  rememberText: { color: theme.onSurfaceSecondary, fontSize: 13 },
  error: { color: theme.error, fontSize: 13 },
  cta: {
    backgroundColor: theme.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ctaText: {
    color: theme.onBrandPrimary,
    fontSize: 20,
    letterSpacing: 4,
    fontFamily: fonts.brand,
  },
});
