import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Exercise, WorkoutLog } from '@/src/lib/api';
import { loadSession } from '@/src/lib/session';
import { theme, spacing, radius } from '@/src/lib/theme';

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function ClientHistory() {
  const router = useRouter();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await loadSession();
    if (!s || s.role !== 'client') {
      router.replace('/');
      return;
    }
    try {
      const [lg, ex] = await Promise.all([api.getLogs(s.user_id), api.listExercises()]);
      setLogs(lg);
      setExercises(ex);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>HISTORY</Text>
        <Text style={styles.subtitle}>
          {logs.length} logged {logs.length === 1 ? 'session' : 'sessions'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.brand} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          testID="history-list"
          data={logs}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.brand} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={theme.onSurfaceTertiary} />
              <Text style={styles.emptyText}>No workouts yet</Text>
              <Text style={styles.emptySub}>Complete an exercise to log it</Text>
            </View>
          }
          renderItem={({ item }) => {
            const ex = exMap[item.exercise_id];
            return (
              <View style={styles.card} testID={`log-${item.id}`}>
                <View style={styles.cardTop}>
                  <Text style={styles.exName}>{ex?.name || 'Exercise'}</Text>
                  <Text style={styles.date}>{fmtDate(item.completed_at)}</Text>
                </View>
                <Text style={styles.meta}>
                  Week {item.week_number} · Day {item.day_number} · {item.sets.length}{' '}
                  {item.sets.length === 1 ? 'set' : 'sets'}
                </Text>
                <View style={styles.setsRow}>
                  {item.sets.map((s, i) => (
                    <View key={i} style={styles.setChip}>
                      <Text style={styles.setChipNum}>SET {s.set_number}</Text>
                      <Text style={styles.setChipText}>
                        {s.weight}kg × {s.reps}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  header: { padding: spacing.lg },
  title: { color: theme.onSurface, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 4 },
  card: {
    backgroundColor: theme.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exName: { color: theme.onSurface, fontSize: 16, fontWeight: '700', flex: 1 },
  date: { color: theme.brand, fontSize: 12, fontWeight: '700' },
  meta: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: spacing.xs },
  setsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  setChip: {
    backgroundColor: theme.surfaceTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  setChipNum: { color: theme.onSurfaceTertiary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  setChipText: { color: theme.onSurface, fontSize: 13, fontWeight: '700', marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { color: theme.onSurface, fontSize: 16, fontWeight: '700', marginTop: spacing.md },
  emptySub: { color: theme.onSurfaceTertiary, marginTop: spacing.xs },
});
