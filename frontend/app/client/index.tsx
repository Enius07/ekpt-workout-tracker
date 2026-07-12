import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Exercise, Program } from '@/src/lib/api';
import { loadSession } from '@/src/lib/session';
import { theme, spacing, radius } from '@/src/lib/theme';

export default function ClientProgram() {
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const s = await loadSession();
    if (!s || s.role !== 'client') {
      router.replace('/');
      return;
    }
    setClientName(s.name);
    try {
      const [p, ex] = await Promise.all([api.getProgram(s.user_id), api.listExercises()]);
      setProgram(p);
      setExercises(ex);
      if (p.weeks.length && expandedWeek === null) setExpandedWeek(p.weeks[0].week_number);
    } catch (e) {
      console.log('load err', e);
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
        <View>
          <Text style={styles.hello}>HELLO,</Text>
          <Text style={styles.name}>{clientName.toUpperCase()}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.brand} style={{ marginTop: spacing.xl }} />
      ) : !program || program.weeks.length === 0 ? (
        <View style={styles.empty} testID="client-program-empty">
          <Ionicons name="hourglass-outline" size={48} color={theme.onSurfaceTertiary} />
          <Text style={styles.emptyText}>Waiting on your trainer</Text>
          <Text style={styles.emptySub}>Your program will appear here</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.brand} />
          }
        >
          <Text style={styles.programName}>{program.name}</Text>
          {program.weeks.map((w) => {
            const isWeekOpen = expandedWeek === w.week_number;
            return (
              <View key={w.week_number} style={styles.weekCard}>
                <Pressable
                  testID={`week-${w.week_number}-toggle`}
                  style={styles.weekHeader}
                  onPress={() => setExpandedWeek(isWeekOpen ? null : w.week_number)}
                >
                  <View>
                    <Text style={styles.weekLabel}>WEEK</Text>
                    <Text style={styles.weekNum}>{w.week_number}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: spacing.lg }}>
                    <Text style={styles.weekName}>{w.name || `Week ${w.week_number}`}</Text>
                    <Text style={styles.weekMeta}>
                      {w.days.length} {w.days.length === 1 ? 'day' : 'days'}
                    </Text>
                  </View>
                  <Ionicons
                    name={isWeekOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.onSurfaceTertiary}
                  />
                </Pressable>

                {isWeekOpen && w.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>NOTES</Text>
                    <Text style={styles.notesText}>{w.notes}</Text>
                  </View>
                ) : null}

                {isWeekOpen &&
                  w.days.map((d) => {
                    const key = `${w.week_number}-${d.day_number}`;
                    const isDayOpen = expandedDay === key;
                    return (
                      <View key={key} style={styles.dayBlock}>
                        <Pressable
                          testID={`day-${key}-toggle`}
                          style={styles.dayHeader}
                          onPress={() => setExpandedDay(isDayOpen ? null : key)}
                        >
                          <Text style={styles.dayName}>
                            DAY {d.day_number}{d.name ? ` · ${d.name.toUpperCase()}` : ''}
                          </Text>
                          <Ionicons
                            name={isDayOpen ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={theme.onSurfaceTertiary}
                          />
                        </Pressable>
                        {isDayOpen && d.notes ? (
                          <View style={styles.notesBox}>
                            <Text style={styles.notesLabel}>NOTES</Text>
                            <Text style={styles.notesText}>{d.notes}</Text>
                          </View>
                        ) : null}
                        {isDayOpen &&
                          d.items.map((it, idx) => {
                            const ex = exMap[it.exercise_id];
                            return (
                              <Pressable
                                key={idx}
                                testID={`exercise-${key}-${idx}`}
                                style={styles.exerciseRow}
                                onPress={() =>
                                  router.push({
                                    pathname: '/client/log',
                                    params: {
                                      exercise_id: it.exercise_id,
                                      week_number: String(w.week_number),
                                      day_number: String(d.day_number),
                                    },
                                  })
                                }
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.exName}>{ex?.name || 'Exercise'}</Text>
                                  {ex?.muscle_group ? (
                                    <Text style={styles.exTarget}>{ex.muscle_group}</Text>
                                  ) : null}
                                </View>
                                <Ionicons
                                  name="chevron-forward"
                                  size={18}
                                  color={theme.brand}
                                />
                              </Pressable>
                            );
                          })}
                      </View>
                    );
                  })}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  hello: { color: theme.onSurfaceTertiary, fontSize: 12, letterSpacing: 2 },
  name: { color: theme.onSurface, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  programName: {
    color: theme.onSurface,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.lg,
  },
  weekCard: {
    backgroundColor: theme.surfaceSecondary,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  weekLabel: { color: theme.brand, fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  weekNum: { color: theme.onSurface, fontSize: 32, fontWeight: '900', lineHeight: 34 },
  weekName: { color: theme.onSurface, fontSize: 16, fontWeight: '700' },
  weekMeta: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  dayBlock: { borderTopWidth: 1, borderTopColor: theme.border },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.surface,
  },
  dayName: { color: theme.onSurfaceSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  exName: { color: theme.onSurface, fontSize: 15, fontWeight: '600' },
  exTarget: { color: theme.onSurfaceTertiary, fontSize: 12, marginTop: 2 },
  notesBox: {
    backgroundColor: theme.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  notesLabel: {
    color: theme.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  notesText: { color: theme.onSurfaceSecondary, fontSize: 13, lineHeight: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { color: theme.onSurface, fontSize: 18, fontWeight: '700', marginTop: spacing.lg },
  emptySub: { color: theme.onSurfaceTertiary, marginTop: spacing.sm },
});
