// Shared messages thread used by both client and trainer screens.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, Message } from '@/src/lib/api';
import { theme, spacing, radius, fonts } from '@/src/lib/theme';

interface Props {
  clientId: string;
  sender: 'trainer' | 'client';
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function MessagesThread({ clientId, sender, title, subtitle, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      const msgs = await api.listMessages(clientId);
      setMessages(msgs);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const msg = await api.createMessage(clientId, sender, t);
      setMessages((prev) => [...prev, msg]);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        {onBack ? (
          <Pressable testID="back-btn" onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.onSurface} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
        </View>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <ActivityIndicator color={theme.brand} style={{ marginTop: spacing.xl }} />
        ) : (
          <FlatList
            ref={listRef}
            testID="messages-list"
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={theme.onSurfaceTertiary} />
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySub}>Say hi to start the conversation</Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.sender === sender;
              return (
                <View
                  testID={`message-${item.id}`}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                >
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                    {fmtTime(item.created_at)}
                  </Text>
                </View>
              );
            }}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            testID="message-input"
            style={styles.composerInput}
            value={text}
            onChangeText={setText}
            placeholder="Write a message…"
            placeholderTextColor={theme.onSurfaceTertiary}
            multiline
          />
          <Pressable
            testID="message-send-btn"
            onPress={send}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
          >
            <Ionicons name="send" size={18} color={theme.onBrandPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    color: theme.onSurface,
    fontSize: 22,
    letterSpacing: 2,
    fontFamily: fonts.brand,
  },
  headerSub: { color: theme.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { color: theme.onSurface, fontWeight: '700', marginTop: spacing.md },
  emptySub: { color: theme.onSurfaceTertiary, marginTop: spacing.xs, fontSize: 13 },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: theme.brand,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: theme.surfaceSecondary,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleText: { color: theme.onSurface, fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: theme.onBrandPrimary },
  bubbleTime: { color: theme.onSurfaceTertiary, fontSize: 10, marginTop: 4 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  composerInput: {
    flex: 1,
    backgroundColor: theme.surfaceSecondary,
    color: theme.onSurface,
    borderRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
