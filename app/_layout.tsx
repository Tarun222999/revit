import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as SystemUI from 'expo-system-ui';
import * as WebBrowser from 'expo-web-browser';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { AuthGate } from '@/features/auth/components/AuthGate';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { QueryProvider } from '@/lib/query/QueryProvider';

WebBrowser.maybeCompleteAuthSession();

const APP_BACKGROUND_COLOR = '#0d0b09';
const APP_TEXT_COLOR = '#fbf6ec';
const APP_BORDER_COLOR = '#3c3329';
const APP_PRIMARY_COLOR = '#d7a84f';
const APP_NAVIGATION_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: APP_BACKGROUND_COLOR,
    border: APP_BORDER_COLOR,
    card: APP_BACKGROUND_COLOR,
    primary: APP_PRIMARY_COLOR,
    text: APP_TEXT_COLOR,
  },
};

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(APP_BACKGROUND_COLOR);
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider value={APP_NAVIGATION_THEME}>
          <AuthGate>
            <Stack screenOptions={{ contentStyle: { backgroundColor: APP_BACKGROUND_COLOR } }}>
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
