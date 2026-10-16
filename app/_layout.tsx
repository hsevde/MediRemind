import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

// Geliştirme sırasında alttaki sarı/kırmızı LogBox şeritlerini gizle
LogBox.ignoreAllLogs(true);
function RootNavigator() {
  useNotifications();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-medication" options={{ headerShown: true, title: 'İlaç Ekle' }} />
      <Stack.Screen name="edit-medication" options={{ headerShown: true, title: 'İlaç Düzenle' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
