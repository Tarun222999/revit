import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DiscoverScreen } from '@/features/discovery/components/DiscoverScreen';
import { cn } from '@/lib/utils/cn';
import type { DiscoveryMediaType, DiscoveryMode } from '@/types/discovery';

type HomeSegment = 'discover' | 'dashboard';

const segments: Array<{ label: string; value: HomeSegment }> = [
  { label: 'Discover', value: 'discover' },
  { label: 'Dashboard', value: 'dashboard' },
];

function HomeSegmentControl({
  value,
  onChange,
}: {
  value: HomeSegment;
  onChange: (segment: HomeSegment) => void;
}) {
  return (
    <View className="flex-row rounded-app border border-archive-700 bg-archive-800 p-1">
      {segments.map((segment) => {
        const selected = value === segment.value;

        return (
          <Pressable
            accessibilityRole="button"
            key={segment.value}
            onPress={() => onChange(segment.value)}
            className={cn(
              'min-h-10 flex-1 items-center justify-center rounded-md px-3',
              selected && 'bg-gold-400',
            )}>
            <Text
              className={cn(
                'text-sm font-semibold',
                selected ? 'text-archive-900' : 'text-archive-200',
              )}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DashboardShell() {
  return (
    <View className="gap-6">
      <SectionHeader
        title="Dashboard"
        subtitle="Your journal activity will collect here as you start logging."
      />

      <View className="flex-row gap-3">
        <Button
          title="Search title"
          className="flex-1"
          onPress={() => router.push('/search')}
        />
        <Button
          title="Open journal"
          variant="secondary"
          className="flex-1"
          onPress={() => router.push('/journal')}
        />
      </View>

      <Card className="gap-3">
        <Text className="text-base font-bold text-archive-50">In Progress</Text>
        <Text className="text-sm leading-5 text-archive-300">
          Titles you mark in progress will appear here.
        </Text>
      </Card>

      <Card className="gap-3">
        <Text className="text-base font-bold text-archive-50">
          Recently Added
        </Text>
        <Text className="text-sm leading-5 text-archive-300">
          New journal entries will show up in this space.
        </Text>
      </Card>

      <EmptyState
        title="No reviews yet"
        message="Your first short reviews will appear here."
      />
    </View>
  );
}

export function HomeScreen() {
  const [segment, setSegment] = useState<HomeSegment>('discover');

  const openDiscoverListing = (
    mode: DiscoveryMode,
    mediaType: DiscoveryMediaType,
  ) => {
    router.push(`/discover/${mode}/${mediaType}` as Href);
  };

  return (
    <Screen scroll className="gap-6">
      <HomeSegmentControl value={segment} onChange={setSegment} />

      {segment === 'discover' ? (
        <DiscoverScreen onSeeAll={openDiscoverListing} />
      ) : (
        <DashboardShell />
      )}
    </Screen>
  );
}
