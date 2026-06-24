import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Exercise } from '@/src/lib/api';
import { theme, spacing, radius } from '@/src/lib/theme';

export default function TrainerExercises() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ex = await api.listExercises();
      setExercises(ex);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>EXERCISES</Text>
          <Text style={styles.subtitle}>
            {exercises.length} in library
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.brand} />
      ) : (
        <FlatList
          testID="exercises-list"
          data={exercises}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="barbell-outline" size={48} color={theme.onSurfaceTertiary} />
              <Text style={styles.emptyText}>No exercises yet</Text>
              <Text style={styles.emptySub}>Tap + to add an exercise</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`exercise-${item.id}`}
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/trainer/exercise-editor', params: { id: item.id } })
              }
            >
              {item.media_base64 ? (
                <Image source={{ uri: item.media_base64 }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Ionicons name="barbell" size={24} color={theme.onSurfaceTertiary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{item.name}</Text>
                {item.muscle_group ? <Text style={styles.muscle}>{item.muscle_group}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.onSurfaceTertiary} />
            </Pressable>
          )}
        />
      )}

      <Pressable
        testID="add-exercise-fab"
        style={styles.fab}
        onPress={() => router.push('/trainer/exercise-editor')}
      >
        <Ionicons name="add" size={28} color={theme.onBrandPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  header: { padding: spacing.lg },
  title: { color: theme.onSurface, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: theme.surfaceTertiary },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  exName: { color: theme.onSurface, fontSize: 16, fontWeight: '700' },
  muscle: { color: theme.brand, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
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
});
