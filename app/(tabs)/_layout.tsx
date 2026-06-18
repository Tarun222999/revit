import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { ProfileAvatarAction } from '@/features/profile/components/ProfileAvatarAction';
import { useColorScheme } from '@/hooks/use-color-scheme';

const APP_BACKGROUND_COLOR = '#0d0b09';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerRight: () => <ProfileAvatarAction />,
        headerStyle: {
          backgroundColor: APP_BACKGROUND_COLOR,
        },
        headerTintColor: '#fbf6ec',
        sceneStyle: {
          backgroundColor: APP_BACKGROUND_COLOR,
        },
        tabBarInactiveTintColor: '#c8bba8',
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: APP_BACKGROUND_COLOR,
          borderTopColor: '#3c3329',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.closed.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Lists',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
        }}
      />
    </Tabs>
  );
}
