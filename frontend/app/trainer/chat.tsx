import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, Client } from '@/src/lib/api';
import { MessagesThread } from '@/src/components/MessagesThread';
import { theme } from '@/src/lib/theme';

export default function TrainerChat() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const clientId = String(params.id || '');
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!clientId) return;
    api.getClient(clientId).then(setClient).catch(() => {});
  }, [clientId]);

  if (!clientId) return <View style={styles.container} />;

  return (
    <MessagesThread
      clientId={clientId}
      sender="trainer"
      title={client?.name?.toUpperCase() || 'CHAT'}
      subtitle="Direct message"
      onBack={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: theme.surface } });
