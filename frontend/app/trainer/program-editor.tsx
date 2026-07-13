import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Exercise, ExerciseItem, Week, SavedProgramme } from '@/src/lib/api';
import { theme, spacing, radius } from '@/src/lib/theme';

export default function ProgramEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId: string }>();
  const clientId = String(params.clientId || '');

  const [programName, setProgramName] = useState('Program');
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<{ weekIdx: number; dayIdx: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedProgrammes, setSavedProgrammes] = useState<SavedProgramme[]>([]);
  const [importModal, setImportModal] = useState(false);  

  useEffect(() => {
    (async () => {
      try {
        const [p, ex] = await Promise.all([api.getProgram(clientId), api.listExercises()]);
        setProgramName(p.name || 'Program');
        setWeeks(p.weeks || []);
        setExercises(ex);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  const addWeek = () => {
    setWeeks((w) => [
      ...w,
      { week_number: w.length + 1, name: `Week ${w.length + 1}`, notes: '', days: [] },
    ]);
  };

  const duplicateWeek = (wIdx: number) => {
    setWeeks((w) => {
      const src = w[wIdx];
      const clone = JSON.parse(JSON.stringify(src));
      clone.week_number = w.length + 1;
      clone.name = `${src.name || `Week ${src.week_number}`} (Copy)`;
      return [...w, clone];
    });
  };

 const saveAsProgramme = async (wIdx: number) => {
  const weekToSave = weeks[wIdx];

  try {
    await api.saveProgramme(
      weekToSave.name || `Week ${weekToSave.week_number}`,
      [weekToSave]
    );

    setNotice('Week saved');
    setTimeout(() => setNotice(null), 2000);
  } catch (e: any) {
    setNotice(e.message || 'Failed to save');
    setTimeout(() => setNotice(null), 2000);
  }
};

  const removeWeek = (i: number) => {
    setWeeks((w) =>
      w.filter((_, idx) => idx !== i).map((week, idx) => ({ ...week, week_number: idx + 1 }))
    );
  };

  const addDay = (wIdx: number) => {
    setWeeks((w) =>
      w.map((week, i) =>
        i === wIdx
          ? {
              ...week,
              days: [
                ...week.days,
                {
                  day_number: week.days.length + 1,
                  name: `Day ${week.days.length + 1}`,
                  notes: '',
                  items: [],
                },
              ],
            }
          : week
      )
    );
  };

  const duplicateDay = (wIdx: number, dIdx: number) => {
    setWeeks((w) =>
      w.map((week, i) => {
        if (i !== wIdx) return week;
        const src = week.days[dIdx];
        const clone = JSON.parse(JSON.stringify(src));
        clone.day_number = week.days.length + 1;
        clone.name = `${src.name || `Day ${src.day_number}`} (Copy)`;
        return { ...week, days: [...week.days, clone] };
      })
    );
  };

  const updateWeekNotes = (wIdx: number, notes: string) => {
    setWeeks((w) => w.map((week, i) => (i === wIdx ? { ...week, notes } : week)));
  };

  const updateDayNotes = (wIdx: number, dIdx: number, notes: string) => {
    setWeeks((w) =>
      w.map((week, i) =>
        i === wIdx
          ? { ...week, days: week.days.map((d, j) => (j === dIdx ? { ...d, notes } : d)) }
          : week
      )
    );
  };

  const renameDay = (wIdx: number, dIdx: number, name: string) => {
    setWeeks((w) =>
      w.map((week, i) =>
        i === wIdx
          ? { ...week, days: week.days.map((d, j) => (j === dIdx ? { ...d, name } : d)) }
          : week
      )
    );
  };

  const renameWeek = (wIdx: number, name: string) => {
    setWeeks((w) => w.map((week, i) => (i === wIdx ? { ...week, name } : week)));
  };

  const removeDay = (wIdx: number, dIdx: number) => {
    setWeeks((w) =>
      w.map((week, i) =>
        i === wIdx
          ? {
              ...week,
              days: week.days
                .filter((_, idx) => idx !== dIdx)
                .map((d, idx) => ({ ...d, day_number: idx + 1 })),
            }
          : week
      )
    );
  };

  const addExerciseToDay = (wIdx: number, dIdx: number, exerciseId: string) => {
    const item: ExerciseItem = {
      exercise_id: exerciseId,
      target_sets: 3,
      target_reps: 10,
      target_weight: 0,
    };
    setWeeks((w) =>
      w.map((week, i) =>
        i === wIdx
          ? {
              ...week,
              days: week.days.map((d, j) =>
                j === dIdx ? { ...d, items: [...d.items, item] } : d
              ),
            }
          : week
      )
    );
    setPicker(null);
  };

  const updateItem = (
    _wIdx: number,
    _dIdx: number,
    _iIdx: number,
    _key: keyof ExerciseItem,
    _val: any
  ) => {
    // No-op: target sets/reps/weight removed; previous-week logs are used instead.
  };
  void updateItem;

  const removeItem = (wIdx: number, dIdx: number, iIdx: number) => {
    setWeeks((w) =>
      w.map((week, i) =>
        i === wIdx
          ? {
              ...week,
              days: week.days.map((d, j) =>
                j === dIdx ? { ...d, items: d.items.filter((_, k) => k !== iIdx) } : d
              ),
            }
          : week
      )
    );
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.upsertProgram(clientId, programName.trim() || 'Program', weeks);
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSavedProgramme = async (id: string) => {
  try {
    await api.deleteSavedProgramme(id);

    setSavedProgrammes((prev) => prev.filter((p) => p.id !== id));

    setNotice('Programme deleted');
    setTimeout(() => setNotice(null), 2000);
  } catch (e: any) {
    setNotice(e.message || 'Failed to delete');
    setTimeout(() => setNotice(null), 2000);
  }
};

  const exMap = Object.fromEntries(exercises.map((e) => [e.id, e]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {notice && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}
      <View style={styles.headerBar}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>PROGRAM</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.brand} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
            <Text style={styles.label}>PROGRAM NAME</Text>
            <TextInput
              testID="program-name-input"
              value={programName}
              onChangeText={setProgramName}
              style={styles.input}
              placeholder="Program name"
              placeholderTextColor={theme.onSurfaceTertiary}
            />

            {weeks.map((week, wIdx) => (
              <View key={wIdx} style={styles.weekCard}>
                <View style={styles.weekHeader}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.weekTitle}>WEEK {week.week_number}</Text>
                    <TextInput
                      testID={`week-name-${wIdx}`}
                      value={week.name}
                      onChangeText={(v) => renameWeek(wIdx, v)}
                      style={styles.nameInput}
                      placeholder={`Week ${week.week_number}`}
                      placeholderTextColor={theme.onSurfaceTertiary}
                    />
                  </View>
                  <Pressable
                  testID={`duplicate-week-${wIdx}`}
                  onPress={() => duplicateWeek(wIdx)}
                  hitSlop={8}
                  style={styles.iconAction}
                >
                  <Ionicons name="copy-outline" size={18} color={theme.onSurfaceSecondary} />
                </Pressable>

                <Pressable
                  testID={`save-week-${wIdx}`}
                  onPress={() => saveAsProgramme(wIdx)}
                  hitSlop={8}
                  style={styles.iconAction}
                >
                  <Ionicons name="save-outline" size={18} color={theme.brand} />
                </Pressable>

                <Pressable
                  testID={`remove-week-${wIdx}`}
                  onPress={() => removeWeek(wIdx)}
                  hitSlop={8}
                  style={styles.iconAction}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                </Pressable>
                </View>
                <TextInput
                  testID={`week-notes-${wIdx}`}
                  value={week.notes || ''}
                  onChangeText={(v) => updateWeekNotes(wIdx, v)}
                  style={styles.notesInput}
                  placeholder="Week notes (visible to client)"
                  placeholderTextColor={theme.onSurfaceTertiary}
                  multiline
                />
                {week.days.map((day, dIdx) => (
                  <View key={dIdx} style={styles.dayBlock}>
                    <View style={styles.dayHead}>
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={styles.dayTitle}>DAY {day.day_number}</Text>
                        <TextInput
                          testID={`day-name-${wIdx}-${dIdx}`}
                          value={day.name}
                          onChangeText={(v) => renameDay(wIdx, dIdx, v)}
                          style={styles.dayNameInput}
                          placeholder="e.g. Push, Pull, Legs"
                          placeholderTextColor={theme.onSurfaceTertiary}
                        />
                      </View>
                      <Pressable
                        testID={`duplicate-day-${wIdx}-${dIdx}`}
                        onPress={() => duplicateDay(wIdx, dIdx)}
                        hitSlop={8}
                        style={styles.iconAction}
                      >
                        <Ionicons name="copy-outline" size={16} color={theme.onSurfaceSecondary} />
                      </Pressable>
                      <Pressable
                        testID={`remove-day-${wIdx}-${dIdx}`}
                        onPress={() => removeDay(wIdx, dIdx)}
                        hitSlop={8}
                        style={styles.iconAction}
                      >
                        <Ionicons name="close" size={18} color={theme.onSurfaceTertiary} />
                      </Pressable>
                    </View>
                    <TextInput
                      testID={`day-notes-${wIdx}-${dIdx}`}
                      value={day.notes || ''}
                      onChangeText={(v) => updateDayNotes(wIdx, dIdx, v)}
                      style={styles.notesInput}
                      placeholder="Day notes (visible to client)"
                      placeholderTextColor={theme.onSurfaceTertiary}
                      multiline
                    />
                    {day.items.map((it, iIdx) => (
                      <View key={iIdx} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>
                            {exMap[it.exercise_id]?.name || 'Exercise'}
                          </Text>
                          {exMap[it.exercise_id]?.muscle_group ? (
                            <Text style={styles.itemMuscle}>
                              {exMap[it.exercise_id]?.muscle_group}
                            </Text>
                          ) : null}
                        </View>
                        <Pressable
                          testID={`remove-item-${wIdx}-${dIdx}-${iIdx}`}
                          onPress={() => removeItem(wIdx, dIdx, iIdx)}
                          hitSlop={8}
                        >
                          <Ionicons name="close" size={18} color={theme.onSurfaceTertiary} />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      testID={`add-exercise-${wIdx}-${dIdx}`}
                      onPress={() => setPicker({ weekIdx: wIdx, dayIdx: dIdx })}
                      style={styles.addLink}
                    >
                      <Ionicons name="add" size={16} color={theme.brand} />
                      <Text style={styles.addLinkText}>ADD EXERCISE</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  testID={`add-day-${wIdx}`}
                  onPress={() => addDay(wIdx)}
                  style={styles.addDay}
                >
                  <Ionicons name="add" size={16} color={theme.onSurfaceSecondary} />
                  <Text style={styles.addDayText}>ADD DAY</Text>
                </Pressable>
              </View>
            ))}

            <Pressable testID="add-week-btn" onPress={addWeek} style={styles.addWeek}>
              <Ionicons name="add" size={18} color={theme.brand} />
              <Text style={styles.addWeekText}>ADD WEEK</Text>
            </Pressable>

            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable 
              testID="import-saved-btn" 
              onPress={async () => {
                const saved = await api.listSavedProgrammes();
                setSavedProgrammes(saved);
                setImportModal(true);
              }}
              style={styles.addWeek}
            >
              <Ionicons name="download-outline" size={18} color={theme.brand} />
              <Text style={styles.addWeekText}>IMPORT SAVED</Text>
            </Pressable>

          </ScrollView>

          <View style={styles.ctaBar}>
            <Pressable
              testID="save-program-btn"
              style={[styles.cta, saving && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.onBrandPrimary} />
              ) : (
                <Text style={styles.ctaText}>SAVE PROGRAM</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal
        visible={!!picker}
        animationType="slide"
        transparent
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>PICK EXERCISE</Text>
            <FlatList
              data={exercises}
              keyExtractor={(i) => i.id}
              style={{ maxHeight: 400 }}
              ListEmptyComponent={
                <Text style={{ color: theme.onSurfaceTertiary, padding: spacing.lg }}>
                  No exercises. Create one first in the Exercises tab.
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  testID={`pick-${item.id}`}
                  style={styles.pickRow}
                  onPress={() =>
                    picker && addExerciseToDay(picker.weekIdx, picker.dayIdx, item.id)
                  }
                >
                  <Text style={styles.pickName}>{item.name}</Text>
                  {item.muscle_group ? (
                    <Text style={styles.pickMuscle}>{item.muscle_group}</Text>
                  ) : null}
                </Pressable>
              )}
            />
            <Pressable onPress={() => setPicker(null)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
  visible={importModal}
  transparent
  animationType="slide"
  onRequestClose={() => setImportModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalBox}>
      <Text style={styles.modalTitle}>IMPORT SAVED PROGRAMME</Text>

      {savedProgrammes.map((p) => (
        <View key={p.id} style={styles.savedRow}>
  <Pressable
    style={styles.savedItem}
    onPress={() => {
      setWeeks((w) => [...w, ...p.weeks]);
      setImportModal(false);
      setNotice('Programme imported');
      setTimeout(() => setNotice(null), 2000);
    }}
  >
    <Text style={styles.savedText}>{p.name}</Text>
  </Pressable>

  <Pressable
    onPress={() => deleteSavedProgramme(p.id)}
    hitSlop={8}
  >
    <Ionicons name="trash-outline" size={18} color={theme.error} />
  </Pressable>
</View>
      ))}

      <Pressable
        style={styles.closeButton}
        onPress={() => setImportModal(false)}
      >
        <Text style={styles.closeText}>CLOSE</Text>
      </Pressable>
    </View>
  </View>
</Modal>
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
  label: {
    color: theme.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: theme.surfaceSecondary,
    color: theme.onSurface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: theme.border,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  weekTitle: { color: theme.onSurface, fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  dayBlock: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  dayTitle: { color: theme.brand, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  nameInput: {
    backgroundColor: theme.surface,
    color: theme.onSurface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 4,
  },
  dayNameInput: {
    backgroundColor: theme.surface,
    color: theme.onSurface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: theme.surface,
    color: theme.onSurface,
    padding: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 44,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  iconAction: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  itemName: { color: theme.onSurface, fontWeight: '700' },
  itemMuscle: { color: theme.brand, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  itemInputs: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  miniInput: {
    backgroundColor: theme.surface,
    color: theme.onSurface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    minWidth: 50,
    textAlign: 'center',
    fontWeight: '700',
    flex: 1,
  },
  x: { color: theme.onSurfaceTertiary, fontWeight: '700' },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  addLinkText: { color: theme.brand, fontWeight: '800', letterSpacing: 1, fontSize: 12 },
  addDay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.xs,
  },
  addDayText: { color: theme.onSurfaceSecondary, fontWeight: '700', letterSpacing: 1 },
  addWeek: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.brand,
    borderRadius: radius.lg,
    borderStyle: 'dashed',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  addWeekText: { color: theme.brand, fontWeight: '800', letterSpacing: 1 },
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
  cta: { backgroundColor: theme.brand, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  ctaText: { color: theme.onBrandPrimary, fontWeight: '900', letterSpacing: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: theme.surfaceTertiary,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    color: theme.onSurface,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  pickRow: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  pickName: { color: theme.onSurface, fontWeight: '700' },
  pickMuscle: { color: theme.brand, fontSize: 11, marginTop: 2, letterSpacing: 1 },
  cancel: { padding: spacing.lg, alignItems: 'center' },
  cancelText: { color: theme.onSurfaceTertiary },

  notice: {
  position: 'absolute',
  top: 20,
  left: 20,
  right: 20,
  backgroundColor: theme.brand,
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: radius.md,
  zIndex: 999,
  alignItems: 'center',
},

noticeText: {
  color: theme.surface,
  fontSize: 14,
  fontWeight: '700',
},

modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  padding: spacing.lg,
},

modalBox: {
  backgroundColor: theme.surface,
  borderRadius: radius.lg,
  padding: spacing.lg,
},

modalTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: theme.onSurface,
  marginBottom: spacing.md,
},

savedItem: {
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: theme.border,
},

savedRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},


savedText: {
  fontSize: 15,
  fontWeight: '700',
  color: theme.onSurface,
},

closeButton: {
  marginTop: spacing.md,
  alignItems: 'center',
  paddingVertical: 12,
},

closeText: {
  fontWeight: '800',
  color: theme.brand,
}


});
