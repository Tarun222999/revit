import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SectionList, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { MediaPoster } from '@/components/media/MediaPoster';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { JOURNAL_STATUS_LABELS } from '@/constants/journal';
import {
  useRemoveJournalPlan,
  useSaveJournalPlan,
} from '@/features/journal/hooks/useJournalLifecycleMutations';
import { useJournalPlanner } from '@/features/journal/hooks/useJournalReads';
import { localToday } from '@/features/journal/model/journalIntentForm';
import {
  getPlannerManagementActions,
  getPlannerWatchAction,
  type PlannerManagementAction,
} from '@/features/journal/model/journalPlanner';
import type {
  JournalFormIntent,
  JournalPlannerItem,
  JournalPlannerSection,
} from '@/features/journal/types';
import { createMediaRouteId } from '@/features/media/api/media-api';

const SECTIONS: Array<{ key: JournalPlannerSection; title: string; description: string }> = [
  { key: 'today', title: 'Today', description: 'Plans scheduled for your local day.' },
  { key: 'upcoming', title: 'Upcoming', description: 'Future plans in date order.' },
  { key: 'missed', title: 'Missed', description: 'Past plans waiting for a decision.' },
  { key: 'someday', title: 'Someday', description: 'Plans without a date.' },
];

function formatDate(value: string | null) {
  if (!value) return 'Someday';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function openIntent(item: JournalPlannerItem, intent: JournalFormIntent) {
  router.push({
    pathname: '/modals/journal-entry',
    params: {
      intent,
      mediaItemId: item.media.id,
      source: 'planner',
    },
  });
}

function openTitle(item: JournalPlannerItem) {
  const routeId = createMediaRouteId({
    id: item.media.id,
    source: item.media.source,
    sourceId: item.media.sourceId,
  });
  router.push(`/title/${encodeURIComponent(routeId)}`);
}

function PlannerCard({ item }: { item: JournalPlannerItem }) {
  const [showManagement, setShowManagement] = useState(false);
  const removePlan = useRemoveJournalPlan();
  const savePlan = useSaveJournalPlan();
  const action = getPlannerWatchAction(item);
  const managementActions = getPlannerManagementActions(item.section);
  const pending = removePlan.isPending || savePlan.isPending;

  const confirmRemove = () => {
    Alert.alert(
      'Remove plan?',
      'This removes the plan only. Existing Journal history remains.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Remove plan',
          onPress: () => {
            void removePlan
              .mutateAsync({ journalEntryId: item.titleState.id })
              .catch((error) =>
                Alert.alert(
                  'Could not remove plan',
                  error instanceof Error ? error.message : 'Try again in a moment.',
                ),
              );
          },
        },
      ],
    );
  };

  const moveToSomeday = () => {
    void savePlan
      .mutateAsync({ mediaItemId: item.media.id, plannedFor: null, today: localToday() })
      .catch((error) =>
        Alert.alert(
          'Could not move plan',
          error instanceof Error ? error.message : 'Try again in a moment.',
        ),
      );
  };

  const runManagementAction = (managementAction: PlannerManagementAction) => {
    switch (managementAction.id) {
      case 'edit_plan':
        openIntent(item, 'edit_plan');
        return;
      case 'move_to_someday':
        moveToSomeday();
        return;
      case 'remove_plan':
        confirmRemove();
    }
  };

  return (
    <Card className="gap-3">
      <Pressable accessibilityRole="button" className="flex-row gap-3" onPress={() => openTitle(item)}>
        <MediaPoster imageUrl={item.media.imageUrl} size="sm" />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-lg font-bold text-archive-50" numberOfLines={2}>
            {item.media.title}
          </Text>
          <Text className="text-sm text-archive-300">
            {formatDate(item.titleState.activePlan?.plannedFor ?? null)}
          </Text>
          <Text className="text-xs font-semibold text-teal-300">
            {item.titleState.status === 'completed'
              ? 'Previously completed · Rewatch plan'
              : JOURNAL_STATUS_LABELS[item.titleState.status]}
          </Text>
        </View>
      </Pressable>

      <View className="flex-row items-stretch gap-2">
        <Button
          className="min-w-[140px] flex-1"
          disabled={pending}
          onPress={() => openIntent(item, action.intent)}
          title={action.label}
        />
        <Pressable
          accessibilityHint="Shows plan management actions"
          accessibilityLabel={`${showManagement ? 'Hide' : 'Show'} plan actions for ${item.media.title}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: pending, expanded: showManagement }}
          className={`min-h-12 min-w-12 items-center justify-center rounded-app border ${
            showManagement
              ? 'border-gold-400 bg-gold-500/20'
              : 'border-archive-500 bg-archive-800'
          } ${pending ? 'opacity-50' : ''}`}
          disabled={pending}
          hitSlop={4}
          onPress={() => setShowManagement((current) => !current)}>
          <Ionicons
            color={showManagement ? '#f4c95d' : '#fbf6ec'}
            name={showManagement ? 'close' : 'ellipsis-horizontal'}
            size={22}
          />
        </Pressable>
      </View>
      {showManagement ? (
        <View className="gap-2 rounded-app border border-archive-700 bg-archive-900 p-3">
          {managementActions.map((managementAction) => (
            <Button
              key={managementAction.id}
              disabled={pending}
              loading={
                (managementAction.id === 'move_to_someday' && savePlan.isPending) ||
                (managementAction.id === 'remove_plan' && removePlan.isPending)
              }
              onPress={() => runManagementAction(managementAction)}
              title={managementAction.label}
              variant={managementAction.id === 'remove_plan' ? 'danger' : 'secondary'}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export function JournalPlannerView({ userId }: { userId: string }) {
  const today = localToday();
  const query = useJournalPlanner(userId, today);
  const items = query.data ?? [];

  if (query.isLoading) {
    return (
      <View className="px-5 pt-5">
        <LoadingState message="Loading Planner" />
      </View>
    );
  }
  if (query.isError) {
    return (
      <View className="px-5 pt-5">
        <ErrorState
          message={query.error instanceof Error ? query.error.message : 'Unable to load Planner.'}
          onRetry={() => query.refetch()}
          title="Planner unavailable"
        />
      </View>
    );
  }
  if (!items.length) {
    return (
      <View className="px-5 pt-5">
        <EmptyState
          actionLabel="Find titles"
          message="Plans live here without becoming Timeline activity."
          onAction={() => router.push('/search')}
          title="No active plans"
        />
      </View>
    );
  }

  const sections = SECTIONS.map((section) => ({
    ...section,
    data: items.filter((item) => item.section === section.key),
  })).filter((section) => section.data.length > 0);

  return (
    <SectionList
      className="flex-1"
      contentContainerClassName="gap-3 px-5 pb-28 pt-5"
      keyExtractor={(item) => item.titleState.id}
      renderItem={({ item }) => <PlannerCard item={item} />}
      renderSectionHeader={({ section }) => (
        <View className="gap-1 bg-archive-900 pb-1 pt-3">
          <Text className="text-xl font-bold text-archive-50">{section.title}</Text>
          <Text className="text-sm text-archive-300">{section.description}</Text>
        </View>
      )}
      sections={sections}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      testID="journal-planner-list"
    />
  );
}
