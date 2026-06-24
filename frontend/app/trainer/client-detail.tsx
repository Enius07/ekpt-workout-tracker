import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Client, Exercise, Program, WorkoutLog } from '@/src/lib/api';
import { theme, spacing, radius } from '@/src/lib/theme';

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function ClientDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const clientId = String(params.id || '');

  const [tab, setTab] = useState<'history' | 'program'>('history');
  const [client, setClient] = useState<Client | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, l, ex] = await Promise.all([
        api.getClient(clientId),
        api.getProgram(clientId),
        api.getLogs(clientId),
        api.listExercises(),
      ]);
      setClient(c);
      setProgram(p);
      setLogs(l);
      setExercises(ex);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));

  // group logs by week
  const logsByWeek: Record<number, WorkoutLog[]> = {};
  for (const lg of logs) {
    if (!logsByWeek[lg.week_number]) logsByWeek[lg.week_number] = [];
    logsByWeek[lg.week_number].push(lg);
  }
  const weeks = Object.keys(logsByWeek)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>CLIENT</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading || !client ? (
        <ActivityIndicator color={theme.brand} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientCode}>CODE · {client.code}</Text>
            </View>
          </View>

          <View style={styles.tabs}>
            <Pressable
              testID="tab-history"
              style={[styles.tab, tab === 'history' && styles.tabActive]}
              onPress={() => setTab('history')}
            >
              <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>HISTORY</Text>
            </Pressable>
            <Pressable
              testID="tab-program"
              style={[styles.tab, tab === 'program' && styles.tabActive]}
              onPress={() => setTab('program')}
            >
              <Text style={[styles.tabText, tab === 'program' && styles.tabTextActive]}>PROGRAM</Text>
            </Pressable>
          </View>

          {tab === 'history' ? (
            <FlatList
              testID="client-history-list"
              data={weeks}
              keyExtractor={(w) => String(w)}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="document-text-outline" size={48} color={theme.onSurfaceTertiary} />
                  <Text style={styles.emptyText}>No data yet</Text>
                </View>
              }
              renderItem={({ item: weekNum }) => {
                const weekLogs = logsByWeek[weekNum];
                return (
                  <View style={styles.weekBlock}>
                    <View style={styles.weekHead}>
                      <Text style={styles.weekTitle}>WEEK {weekNum}</Text>
                      <Text style={styles.weekMeta}>
                        {weekLogs.length} {weekLogs.length === 1 ? 'log' : 'logs'}
                      </Text>
                    </View>
                    {weekLogs.map((lg) => (
                      <View key={lg.id} style={styles.logRow}>
                        <View style={styles.logTop}>
                          <Text style={styles.logEx}>{exMap[lg.exercise_id]?.name || 'Exercise'}</Text>
                          <Text style={styles.logDate}>
                            DAY {lg.day_number} · {fmtDate(lg.completed_at)}
                          </Text>
                        </View>
                        <View style={styles.setsTable}>
                          {lg.sets.map((s, i) => (
                            <View key={i} style={styles.setBox} testID={`log-${lg.id}-set-${i}`}>
                              <Text style={styles.setBoxNum}>SET {s.set_number}</Text>
                              <Text style={styles.setBoxValue}>
                                {s.weight}
                                <Text style={styles.setBoxUnit}>kg</Text>
                              </Text>
                              <Text style={styles.setBoxReps}>{s.reps} reps</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }}
            />
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.programInfo}>
                <Text style={styles.programInfoText}>
                  {program?.weeks.length || 0}{' '}
                  {(program?.weeks.length || 0) === 1 ? 'week' : 'weeks'} ·{' '}
                  {program?.weeks.reduce((a, w) => a + w.days.length, 0) || 0}{' '}
                  {(program?.weeks.reduce((a, w) => a + w.days.length, 0) || 0) === 1
                    ? 'day'
                    : 'days'}
                </Text>
              </View>
              <Pressable
                testID="edit-program-btn"
                style={styles.editProgram}
                onPress={() =>
                  router.push({ pathname: '/trainer/program-editor', params: { clientId } })
                }
              >
                <Ionicons name="create-outline" size={20} color={theme.onBrandPrimary} />
                <Text style={styles.editProgramText}>EDIT PROGRAM</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.onSurface, fontWeight: '800', letterSpacing: 2 },
  profile: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.brand, fontSize: 22, fontWeight: '900' },
  clientName: { color: theme.onSurface, fontSize: 22, fontWeight: '900' },
  clientCode: { color: theme.onSurfaceTertiary, fontSize: 12, letterSpacing: 1, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceSecondary,
    margin: spacing.lg,
    padding: spacing.xs,
    borderRadius: radius.lg,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderRadius: radius.md },
  tabActive: { backgroundColor: theme.brand },
  tabText: { color: theme.onSurfaceTertiary, fontWeight: '800', letterSpacing: 1, fontSize: 12 },
  tabTextActive: { color: theme.onBrandPrimary },
  weekBlock: {
    backgroundColor: theme.surfaceSecondary,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  weekHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  weekTitle: { color: theme.onSurface, fontWeight: '900', letterSpacing: 2 },
  weekMeta: { color: theme.onSurfaceTertiary, fontSize: 12, fontWeight: '700' },
  logRow: {
    padding: spacing.lg,
    borderTopColor: theme.divider,
    borderTopWidth: 1,
  },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  logEx: { color: theme.onSurface, fontWeight: '700', fontSize: 15, flex: 1, marginRight: spacing.sm },
  logDate: { color: theme.brand, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  setsTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  setBox: {
    backgroundColor: theme.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: theme.border,
    minWidth: 80,
  },
  setBoxNum: { color: theme.onSurfaceTertiary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  setBoxValue: { color: theme.onSurface, fontSize: 18, fontWeight: '900', marginTop: 2 },
  setBoxUnit: { color: theme.onSurfaceTertiary, fontSize: 11, fontWeight: '700' },
  setBoxReps: { color: theme.brand, fontSize: 11, fontWeight: '700', marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { color: theme.onSurface, fontWeight: '700', marginTop: spacing.md },
  programInfo: {
    padding: spacing.lg,
    backgroundColor: theme.surfaceSecondary,
    margin: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  programInfoText: { color: theme.onSurface, fontSize: 16, fontWeight: '700' },
  editProgram: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.brand,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  editProgramText: { color: theme.onBrandPrimary, fontWeight: '900', letterSpacing: 2 },
});
