import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { AuthGate } from '@/features/auth/components/AuthGate';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryProvider } from '@/lib/query/QueryProvider';

WebBrowser.maybeCompleteAuthSession();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="title/[id]" options={{ title: 'Title Details' }} />
              <Stack.Screen name="discover/[mode]/[mediaType]" options={{ title: 'Discovery' }} />
              <Stack.Screen name="lists/[id]" options={{ title: 'List Details' }} />
              <Stack.Screen name="profile" options={{ title: 'Profile' }} />
              <Stack.Screen name="settings" options={{ title: 'Settings' }} />
              <Stack.Screen name="legal/privacy" options={{ title: 'Privacy Policy' }} />
              <Stack.Screen name="legal/terms" options={{ title: 'Terms of Use' }} />
              <Stack.Screen name="legal/credits" options={{ title: 'Credits' }} />
              <Stack.Screen name="support" options={{ title: 'Support' }} />
              <Stack.Screen
                name="modals/journal-entry"
                options={{
                  animation: 'fade',
                  contentStyle: { backgroundColor: 'transparent' },
                  headerShown: false,
                  presentation: 'transparentModal',
                }}
              />
            </Stack>
          </AuthGate>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
