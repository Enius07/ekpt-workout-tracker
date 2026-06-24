import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { clearSession, loadSession } from '@/src/lib/session';
import { theme, spacing, radius } from '@/src/lib/theme';

export default function ClientProfile() {
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (!s) {
        router.replace('/');
        return;
      }
      setName(s.name);
    })();
  }, []);

  const logout = async () => {
    await clearSession();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>PROFILE</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={36} color={theme.brand} />
        </View>
        <Text style={styles.name} testID="profile-name">
          {name}
        </Text>
        <Text style={styles.role}>CLIENT</Text>
      </View>
      <Pressable testID="logout-button" style={styles.logout} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color={theme.error} />
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface, padding: spacing.lg },
  header: { paddingVertical: spacing.lg },
  title: { color: theme.onSurface, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  card: {
    backgroundColor: theme.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  name: { color: theme.onSurface, fontSize: 22, fontWeight: '900' },
  role: { color: theme.brand, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  logout: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: theme.surfaceSecondary,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  logoutText: { color: theme.error, fontWeight: '800', letterSpacing: 1 },
});
