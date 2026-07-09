import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/lib/theme';

export default function TrainerLayout() {
  return (
   <Tabs
  screenOptions={{
    headerShown: false,
    tabBarStyle: {
      backgroundColor: theme.surfaceSecondary,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      height: 75,
      paddingBottom: 10,
      paddingTop: 5,
    },
    tabBarIconStyle: {
      marginTop: -4,
    },
    tabBarActiveTintColor: theme.brand,
    tabBarInactiveTintColor: theme.onSurfaceTertiary,
    tabBarLabelStyle: { 
      fontSize: 11, 
      fontWeight: '700', 
      letterSpacing: 1 
    },
  }}
>
      <Tabs.Screen
        name="index"
        options={{
          title: 'CLIENTS',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'EXERCISES',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'PROFILE',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="client-detail" options={{ href: null }} />
      <Tabs.Screen name="program-editor" options={{ href: null }} />
      <Tabs.Screen name="exercise-editor" options={{ href: null }} />
    </Tabs>
  );
}
