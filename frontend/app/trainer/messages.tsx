import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Client } from '@/src/lib/api';
import { loadSession } from '@/src/lib/session';
import { theme, spacing, radius, fonts } from '@/src/lib/theme';

export default function TrainerMessages() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await loadSession();
    if (!s || s.role !== 'trainer') {
      router.replace('/');
      return;
    }
    try {
      const cs = await api.listClients();
      setClients(cs);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>MESSAGES</Text>
        <Text style={styles.subtitle}>Pick a client to chat with</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.brand} />
      ) : (
        <FlatList
          testID="trainer-messages-clients"
          data={clients}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={theme.onSurfaceTertiary} />
              <Text style={styles.emptyText}>No clients yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`chat-${item.id}`}
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/trainer/chat', params: { id: item.id } })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.code}>Tap to open chat</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.onSurfaceTertiary} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  header: { padding: spacing.lg },
  title: { color: theme.onSurface, fontSize: 32, letterSpacing: 3, fontFamily: fonts.brand },
  subtitle: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.brand, fontSize: 18, fontWeight: '900' },
  name: { color: theme.onSurface, fontSize: 15, fontWeight: '700' },
  code: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { color: theme.onSurface, fontWeight: '700', marginTop: spacing.md },
});
