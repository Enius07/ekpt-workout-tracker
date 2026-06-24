import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { loadSession } from '@/src/lib/session';
import { MessagesThread } from '@/src/components/MessagesThread';
import { theme } from '@/src/lib/theme';

export default function ClientMessages() {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (!s || s.role !== 'client') {
        router.replace('/');
        return;
      }
      setClientId(s.user_id);
    })();
  }, []);

  if (!clientId) {
    return <View style={styles.container} />;
  }
  return (
    <MessagesThread
      clientId={clientId}
      sender="client"
      title="MESSAGES"
      subtitle="Chat with your coach"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
});
