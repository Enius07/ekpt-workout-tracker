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
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/lib/api';
import { theme, spacing, radius } from '@/src/lib/theme';

export default function ExerciseEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? String(params.id) : null;

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [instructions, setInstructions] = useState('');
  const [media, setMedia] = useState<string>('');
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const ex = await api.getExercise(editId);
        setName(ex.name);
        setMuscleGroup(ex.muscle_group || '');
        setInstructions(ex.instructions || '');
        setMedia(ex.media_base64 || '');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [editId]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      setMedia(`data:${mime};base64,${asset.base64}`);
    }
  };

  const onSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        muscle_group: muscleGroup.trim(),
        instructions: instructions.trim(),
        media_base64: media,
        media_type: (media ? 'image' : '') as 'image' | '',
      };
      if (editId) {
        await api.updateExercise(editId, payload);
      } else {
        await api.createExercise(payload);
      }
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.deleteExercise(editId);
      router.back();
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
        <Text style={styles.headerTitle}>{editId ? 'EDIT EXERCISE' : 'NEW EXERCISE'}</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.brand} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
            <Pressable testID="pick-media-btn" style={styles.mediaBox} onPress={pickImage}>
              {media ? (
                <Image source={{ uri: media }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="cloud-upload-outline" size={36} color={theme.onSurfaceTertiary} />
                  <Text style={styles.mediaText}>TAP TO ADD IMAGE</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.label}>NAME</Text>
            <TextInput
              testID="exercise-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Back Squat"
              placeholderTextColor={theme.onSurfaceTertiary}
              style={styles.input}
            />

            <Text style={styles.label}>MUSCLE GROUP</Text>
            <TextInput
              testID="muscle-group-input"
              value={muscleGroup}
              onChangeText={setMuscleGroup}
              placeholder="e.g. Legs, Quads"
              placeholderTextColor={theme.onSurfaceTertiary}
              style={styles.input}
            />

            <Text style={styles.label}>INSTRUCTIONS</Text>
            <TextInput
              testID="instructions-input"
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Form cues, tempo, notes..."
              placeholderTextColor={theme.onSurfaceTertiary}
              multiline
              style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            {editId && (
              <Pressable testID="delete-exercise-btn" style={styles.deleteBtn} onPress={onDelete}>
                <Ionicons name="trash-outline" size={18} color={theme.error} />
                <Text style={styles.deleteText}>DELETE</Text>
              </Pressable>
            )}
          </ScrollView>

          <View style={styles.ctaBar}>
            <Pressable
              testID="save-exercise-btn"
              style={[styles.cta, saving && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.onBrandPrimary} />
              ) : (
                <Text style={styles.ctaText}>SAVE</Text>
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
  headerTitle: { color: theme.onSurface, fontWeight: '800', letterSpacing: 2 },
  mediaBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaText: { color: theme.onSurfaceTertiary, marginTop: spacing.sm, fontWeight: '700', letterSpacing: 1 },
  label: {
    color: theme.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '800',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: theme.surfaceSecondary,
    color: theme.onSurface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  error: { color: theme.error, marginTop: spacing.md, textAlign: 'center' },
  deleteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: theme.error,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  deleteText: { color: theme.error, fontWeight: '800', letterSpacing: 1 },
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
});
