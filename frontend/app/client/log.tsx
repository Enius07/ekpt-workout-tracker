import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Exercise, SetEntry, WorkoutLog } from '@/src/lib/api';
import { loadSession } from '@/src/lib/session';
import { theme, spacing, radius } from '@/src/lib/theme';

interface LoggedSet extends SetEntry {
  is_custom_reps: boolean;
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function LogExercise() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    exercise_id: string;
    week_number: string;
    day_number: string;
  }>();
  const exerciseId = String(params.exercise_id || '');
  const weekNumber = Number(params.week_number || 1);
  const dayNumber = Number(params.day_number || 1);

  const [ex, setEx] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [previousLog, setPreviousLog] = useState<WorkoutLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!exerciseId) {
        setLoading(false);
        return;
      }
      const session = await loadSession();
      try {
        const [exDoc, logs] = await Promise.all([
          api.getExercise(exerciseId),
          session?.user_id
            ? api.getLogs(session.user_id, { exercise_id: exerciseId })
            : Promise.resolve<WorkoutLog[]>([]),
        ]);
        setEx(exDoc);
        const latest = logs[0] || null;
        setPreviousLog(latest);
        if (latest && latest.sets.length > 0) {
          setSets(
            latest.sets.map((s, i) => ({
              set_number: i + 1,
              weight: s.weight,
              reps: s.reps,
              is_custom_reps: s.reps > 12,
            }))
          );
        } else {
          setSets([{ set_number: 1, weight: 0, reps: 8, is_custom_reps: false }]);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [exerciseId]);

  const updateWeight = (idx: number, val: string) => {
    const num = parseFloat(val.replace(',', '.')) || 0;
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, weight: num } : s)));
  };

  const updateReps = (idx: number, reps: number) => {
    setSets((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, reps, is_custom_reps: false } : s))
    );
  };

  const setCustomReps = (idx: number, val: string) => {
    const num = parseInt(val) || 0;
    setSets((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, reps: num, is_custom_reps: true } : s))
    );
  };

  const toggleCustom = (idx: number) => {
    setSets((prev) =>
      prev.map((s, i) =>
        i === idx
          ? {
              ...s,
              is_custom_reps: !s.is_custom_reps,
              reps: !s.is_custom_reps ? Math.max(13, s.reps) : Math.min(12, s.reps || 12),
            }
          : s
      )
    );
  };

  const addSet = () => {
    setSets((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          set_number: prev.length + 1,
          weight: last ? last.weight : 0,
          reps: last ? last.reps : 8,
          is_custom_reps: last ? last.is_custom_reps : false,
        },
      ];
    });
  };

  const removeSet = (idx: number) => {
    setSets((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, set_number: i + 1 }))
    );
  };

  const onSave = async () => {
    setError(null);
    const s = await loadSession();
    if (!s || s.role !== 'client') return;
    setSaving(true);
    try {
      await api.createLog({
        client_id: s.user_id,
        exercise_id: exerciseId,
        week_number: weekNumber,
        day_number: dayNumber,
        sets: sets.map(({ set_number, weight, reps }) => ({ set_number, weight, reps })),
      });
      router.back();
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>LOG WORKOUT</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.brand} style={{ marginTop: spacing.xl }} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            {ex?.media_base64 && ex.media_type === 'image' && (
              <Image source={{ uri: ex.media_base64 }} style={styles.media} contentFit="cover" />
            )}

            <View style={{ padding: spacing.lg }}>
              <Text style={styles.exName}>{ex?.name || 'Exercise'}</Text>
              {ex?.muscle_group ? <Text style={styles.muscle}>{ex.muscle_group}</Text> : null}

              {previousLog ? (
                <View style={styles.prevBox} testID="previous-log-box">
                  <Text style={styles.prevLabel}>
                    LAST TIME · {fmtDate(previousLog.completed_at)} · WEEK {previousLog.week_number}
                  </Text>
                  <View style={styles.prevSets}>
                    {previousLog.sets.map((s, i) => (
                      <View key={i} style={styles.prevSetChip}>
                        <Text style={styles.prevSetChipText}>
                          {s.weight}kg × {s.reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.prevBox}>
                  <Text style={styles.prevLabel}>FIRST TIME · LOG YOUR SETS BELOW</Text>
                </View>
              )}

              {ex?.instructions ? <Text style={styles.instructions}>{ex.instructions}</Text> : null}

              {sets.map((s, idx) => (
                <View key={idx} style={styles.setCard} testID={`set-${idx}`}>
                  <View style={styles.setHead}>
                    <Text style={styles.setNum}>SET {s.set_number}</Text>
                    {sets.length > 1 && (
                      <Pressable
                        testID={`set-${idx}-remove`}
                        onPress={() => removeSet(idx)}
                        hitSlop={10}
                      >
                        <Ionicons name="close" size={18} color={theme.onSurfaceTertiary} />
                      </Pressable>
                    )}
                  </View>

                  <Text style={styles.fieldLabel}>WEIGHT (KG)</Text>
                  <TextInput
                    testID={`set-${idx}-weight`}
                    style={styles.weightInput}
                    keyboardType="numeric"
                    value={String(s.weight)}
                    onChangeText={(v) => updateWeight(idx, v)}
                    selectTextOnFocus
                  />

                  <View style={styles.repsHead}>
                    <Text style={styles.fieldLabel}>REPS</Text>
                    <View style={styles.repsRight}>
                      <Text style={styles.repsValue} testID={`set-${idx}-reps-value`}>
                        {s.reps}
                      </Text>
                      <Pressable
                        testID={`set-${idx}-toggle-custom`}
                        onPress={() => toggleCustom(idx)}
                        style={[styles.plusChip, s.is_custom_reps && styles.plusChipActive]}
                      >
                        <Text
                          style={[
                            styles.plusChipText,
                            s.is_custom_reps && styles.plusChipTextActive,
                          ]}
                        >
                          12+
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {!s.is_custom_reps ? (
                    <>
                      <Slider
                        testID={`set-${idx}-reps-slider`}
                        style={styles.slider}
                        minimumValue={1}
                        maximumValue={12}
                        step={1}
                        value={Math.min(12, Math.max(1, s.reps || 1))}
                        onValueChange={(v) => updateReps(idx, Math.round(v))}
                        minimumTrackTintColor={theme.brand}
                        maximumTrackTintColor={theme.surfaceTertiary}
                        thumbTintColor={theme.brand}
                      />
                      <View style={styles.scaleRow}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <Text
                            key={n}
                            style={[
                              styles.scaleTick,
                              (n === 1 || n === 6 || n === 12) && styles.scaleTickMajor,
                            ]}
                          >
                            {n === 1 || n === 6 || n === 12 ? n : '·'}
                          </Text>
                        ))}
                      </View>
                    </>
                  ) : (
                    <TextInput
                      testID={`set-${idx}-reps-custom`}
                      style={styles.weightInput}
                      keyboardType="numeric"
                      value={String(s.reps)}
                      onChangeText={(v) => setCustomReps(idx, v)}
                      selectTextOnFocus
                      placeholder="13+"
                      placeholderTextColor={theme.onSurfaceTertiary}
                    />
                  )}
                </View>
              ))}

              <Pressable testID="add-set-btn" onPress={addSet} style={styles.addSet}>
                <Ionicons name="add" size={18} color={theme.brand} />
                <Text style={styles.addSetText}>ADD SET</Text>
              </Pressable>

              {error && (
                <Text style={styles.error} testID="log-error">
                  {error}
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.ctaBar}>
            <Pressable
              testID="save-log-button"
              style={[styles.cta, saving && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.onBrandPrimary} />
              ) : (
                <Text style={styles.ctaText}>COMPLETE EXERCISE</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
  headerTitle: { color: theme.onSurface, fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  media: { width: '100%', aspectRatio: 16 / 9, backgroundColor: theme.surfaceSecondary },
  exName: { color: theme.onSurface, fontSize: 24, fontWeight: '900' },
  muscle: { color: theme.brand, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  prevBox: {
    backgroundColor: theme.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  prevLabel: {
    color: theme.brand,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  prevSets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  prevSetChip: {
    backgroundColor: theme.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  prevSetChipText: { color: theme.onSurface, fontSize: 12, fontWeight: '700' },
  instructions: {
    color: theme.onSurfaceSecondary,
    fontSize: 13,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  setCard: {
    backgroundColor: theme.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  setHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  setNum: { color: theme.brand, fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  fieldLabel: {
    color: theme.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  weightInput: {
    backgroundColor: theme.surface,
    color: theme.onSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.border,
    letterSpacing: 1,
  },
  repsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  repsRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  repsValue: { color: theme.brand, fontSize: 28, fontWeight: '900' },
  slider: { width: '100%', height: 40 },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: -spacing.xs,
  },
  scaleTick: {
    color: theme.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: '700',
    width: 16,
    textAlign: 'center',
  },
  scaleTickMajor: { color: theme.onSurfaceSecondary, fontSize: 11, fontWeight: '800' },
  plusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  plusChipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
  plusChipText: { color: theme.onSurfaceSecondary, fontWeight: '800', fontSize: 12 },
  plusChipTextActive: { color: theme.onBrandPrimary },
  addSet: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: theme.brand,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  addSetText: { color: theme.brand, fontWeight: '800', letterSpacing: 1 },
  error: { color: theme.error, marginTop: spacing.md, textAlign: 'center' },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  cta: {
    backgroundColor: theme.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  ctaText: { color: theme.onBrandPrimary, fontWeight: '900', letterSpacing: 2, fontSize: 14 },
});
