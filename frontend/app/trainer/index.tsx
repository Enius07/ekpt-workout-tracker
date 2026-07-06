import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Client } from '@/src/lib/api';
import { loadSession } from '@/src/lib/session';
import { theme, spacing, radius } from '@/src/lib/theme';
import { TouchableOpacity } from 'react-native';
import { Button } from 'react-native';

export default function TrainerClients() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newClient, setNewClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const create = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const c = await api.createClient(newName.trim());
      setNewClient(c);
      setNewName('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>CLIENTS</Text>
          <Text style={styles.subtitle}>
            {clients.length} {clients.length === 1 ? 'client' : 'total'}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.brand} />
      ) : (
        <FlatList
          testID="clients-list"
          data={clients}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={theme.onSurfaceTertiary} />
              <Text style={styles.emptyText}>No clients yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first client</Text>
            </View>
          }

          
          
          renderItem={({ item }) => (
  <View style={styles.row}>
    
    {/* CARD */}
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/trainer/client-detail',
          params: { id: item.id },
        })
      }
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardCode}>CODE · {item.code}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.onSurfaceTertiary}
      />
    </Pressable>

    {/* DELETE */}
    <TouchableOpacity
  style={styles.deleteButton}
  onPress={() => setDeleteTarget(item)}
>
  <Ionicons name="trash-outline" size={22} color="#d32f2f" />
</TouchableOpacity>
<Modal
  visible={!!deleteTarget}
  transparent
  animationType="fade"
  onRequestClose={() => setDeleteTarget(null)}
>
  <View style={{
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  }}>
    
    <View style={{
      width: "85%",
      backgroundColor: theme.surface,
      padding: spacing.lg,
      borderRadius: radius.lg,
    }}>
      
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10 }}>
        Delete client
      </Text>

      <Text style={{ marginBottom: spacing.lg }}>
        Are you sure you want to delete {deleteTarget?.name}? This cannot be undone.
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
        
        <Pressable
          onPress={() => setDeleteTarget(null)}
          style={{ padding: 10 }}
        >
          <Text>Cancel</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
          if (!deleteTarget) return;
            try {
              await api.deleteClient(deleteTarget.id);
              setDeleteTarget(null);
              load();
            } catch (e) {
              console.error(e);
            }
          }}
          style={{ padding: 10 }}
        >
          <Text style={{ color: "red", fontWeight: "600" }}>
            Delete
          </Text>
        </Pressable>

      </View>

    </View>
  </View>
</Modal>
  </View>
)}
        
        
        />
      )}

      <Pressable
        testID="add-client-fab"
        style={styles.fab}
        onPress={() => {
          setNewClient(null);
          setShowAdd(true);
        }}
      >
        <Ionicons name="add" size={28} color={theme.onBrandPrimary} />
      </Pressable>

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBg}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheet}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheetHandle} />
            {newClient ? (
              <View>
                <Text style={styles.sheetTitle}>CLIENT CREATED</Text>
                <Text style={styles.sheetSub}>Share this code with {newClient.name}</Text>
                <View style={styles.codeBox} testID="new-client-code">
                  <Text style={styles.codeText}>{newClient.code}</Text>
                </View>
                <Pressable
                  testID="close-modal-btn"
                  style={styles.cta}
                  onPress={() => {
                    setShowAdd(false);
                    setNewClient(null);
                  }}
                >
                  <Text style={styles.ctaText}>DONE</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={styles.sheetTitle}>NEW CLIENT</Text>
                <Text style={styles.sheetSub}>Client&apos;s access code will be generated</Text>
                <TextInput
                  testID="new-client-name-input"
                  placeholder="Client name"
                  placeholderTextColor={theme.onSurfaceTertiary}
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.input}
                  autoFocus
                />
                <Pressable
                  testID="create-client-btn"
                  style={[styles.cta, saving && { opacity: 0.6 }]}
                  onPress={create}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={theme.onBrandPrimary} />
                  ) : (
                    <Text style={styles.ctaText}>CREATE</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => setShowAdd(false)} style={styles.cancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>

    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  header: { padding: spacing.lg },
  title: { color: theme.onSurface, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 4 },
 
 
  card: {
    flex: 1,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.brand, fontSize: 20, fontWeight: '900' },
  cardName: { color: theme.onSurface, fontSize: 16, fontWeight: '700' },
  cardCode: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 2, letterSpacing: 1 },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { color: theme.onSurface, fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  emptySub: { color: theme.onSurfaceTertiary, marginTop: spacing.xs },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: theme.surfaceTertiary,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  sheetTitle: { color: theme.onSurface, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  sheetSub: { color: theme.onSurfaceTertiary, marginTop: spacing.xs, marginBottom: spacing.lg },
  input: {
    backgroundColor: theme.surface,
    color: theme.onSurface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cta: {
    backgroundColor: theme.brand,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  ctaText: { color: theme.onBrandPrimary, fontWeight: '900', letterSpacing: 2 },
  cancel: { padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  cancelText: { color: theme.onSurfaceTertiary },
  codeBox: {
    backgroundColor: theme.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.brand,
    marginVertical: spacing.lg,
  },
  codeText: { color: theme.brand, fontSize: 36, fontWeight: '900', letterSpacing: 6 },
  row: {
  flexDirection: "row",
  alignItems: "center",
  width: "100%",
},



deleteButton: {
  paddingHorizontal: 12,
  paddingVertical: 10,
},
});
