import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

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
import { getPlannerWatchAction } from '@/features/journal/model/journalPlanner';
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
  const removePlan = useRemoveJournalPlan();
  const savePlan = useSaveJournalPlan();
  const action = getPlannerWatchAction(item);
  const pending = removePlan.isPending || savePlan.isPending;
  const editLabel = item.section === 'someday' ? 'Schedule' : 'Reschedule';

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

      <View className="flex-row flex-wrap gap-2">
        <Button
          className="min-w-[140px] flex-1"
          disabled={pending}
          onPress={() => openIntent(item, action.intent)}
          title={action.label}
        />
        <Button
          className="min-w-[120px] flex-1"
          disabled={pending}
          onPress={() => openIntent(item, 'edit_plan')}
          title={editLabel}
          variant="secondary"
        />
      </View>
      {item.section === 'missed' ? (
        <Button
          disabled={pending}
          loading={savePlan.isPending}
          onPress={moveToSomeday}
          title="Move to Someday"
          variant="ghost"
        />
      ) : null}
      <Button
        disabled={pending}
        loading={removePlan.isPending}
        onPress={confirmRemove}
        title="Remove plan"
        variant="ghost"
      />
    </Card>
  );
}

export function JournalPlannerView({ userId }: { userId: string }) {
  const today = localToday();
  const query = useJournalPlanner(userId, today);
  const items = query.data ?? [];

  if (query.isLoading) return <LoadingState message="Loading Planner" />;
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : 'Unable to load Planner.'}
        onRetry={() => query.refetch()}
        title="Planner unavailable"
      />
    );
  }
  if (!items.length) {
    return (
      <EmptyState
        actionLabel="Find titles"
        message="Plans live here without becoming Timeline activity."
        onAction={() => router.push('/search')}
        title="No active plans"
      />
    );
  }

  return (
    <View className="gap-6">
      {SECTIONS.map((section) => {
        const sectionItems = items.filter((item) => item.section === section.key);
        if (!sectionItems.length) return null;
        return (
          <View className="gap-3" key={section.key}>
            <View className="gap-1">
              <Text className="text-xl font-bold text-archive-50">{section.title}</Text>
              <Text className="text-sm text-archive-300">{section.description}</Text>
            </View>
            {sectionItems.map((item) => (
              <PlannerCard item={item} key={item.titleState.id} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
