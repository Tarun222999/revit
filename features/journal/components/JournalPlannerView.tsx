import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { MediaPoster } from '@/components/media/MediaPoster';
import { JournalActionConfirmation } from '@/features/journal/components/JournalActionConfirmation';
import { JournalActionDrawer } from '@/features/journal/components/JournalActionDrawer';
import { JournalActionFeedback } from '@/features/journal/components/JournalActionFeedback';
import { useOptionalAppCapabilities } from '@/features/capabilities/context/AppCapabilitiesProvider';
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

const SECTIONS: Array<{
  key: JournalPlannerSection;
  title: string;
  description: string;
}> = [
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
    params: { intent, mediaItemId: item.media.id, source: 'planner' },
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

function PlannerRow({ item, gamesEnabled }: { item: JournalPlannerItem; gamesEnabled: boolean }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [removeConfirmationVisible, setRemoveConfirmationVisible] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const removePlan = useRemoveJournalPlan();
  const savePlan = useSaveJournalPlan();
  const watchAction = getPlannerWatchAction(item);
  const managementActions = getPlannerManagementActions(item.section);
  const pending = removePlan.isPending || savePlan.isPending;
  const plannedFor = item.titleState.activePlan?.plannedFor ?? null;
  const gameReadOnly = item.media.mediaType === 'game' && !gamesEnabled;

  const executeRemovePlan = async () => {
    try {
      await removePlan.mutateAsync({ journalEntryId: item.titleState.id });
      setRemoveConfirmationVisible(false);
      setRemoveError(null);
    } catch (error) {
      setRemoveConfirmationVisible(false);
      setRemoveError(error instanceof Error ? error.message : 'Try again in a moment.');
    }
  };

  const moveToSomeday = async () => {
    setDrawerVisible(false);
    try {
      await savePlan.mutateAsync({
        mediaItemId: item.media.id,
        mediaType: item.media.mediaType,
        plannedFor: null,
        today: localToday(),
      });
      setMoveError(null);
    } catch (error) {
      setMoveError(error instanceof Error ? error.message : 'Try again in a moment.');
    }
  };

  const runManagementAction = (managementAction: PlannerManagementAction) => {
    if (managementAction.id === 'edit_plan') {
      setDrawerVisible(false);
      openIntent(item, 'edit_plan');
      return;
    }
    if (managementAction.id === 'move_to_someday') {
      void moveToSomeday();
      return;
    }

    setDrawerVisible(false);
    setRemoveError(null);
    setRemoveConfirmationVisible(true);
  };

  const primaryLabel = item.section === 'missed'
    ? item.media.mediaType === 'game' ? 'I played it' : 'I watched it'
    : watchAction.label;
  const drawerActions = [
    ...(gameReadOnly ? [] : [
    {
      label: primaryLabel,
      onPress: () => {
        setDrawerVisible(false);
        openIntent(item, watchAction.intent);
      },
      tone: 'primary' as const,
    },
    ...managementActions.filter((action) => action.id !== 'remove_plan').map((action) => ({
      label: action.label,
      onPress: () => runManagementAction(action),
      tone: 'standard' as const,
    })),
    ]),
    {
      label: 'View title details',
      onPress: () => {
        setDrawerVisible(false);
        openTitle(item);
      },
      tone: 'standard' as const,
    },
    ...managementActions.filter((action) => action.id === 'remove_plan').map((action) => ({
      label: action.label,
      onPress: () => runManagementAction(action),
      tone: 'danger' as const,
    })),
  ];

  return (
    <>
      <Pressable
        accessibilityHint="Opens plan actions"
        accessibilityLabel={`${item.media.title}, ${formatDate(plannedFor)}. Open plan actions.`}
        accessibilityRole="button"
        className="flex-row items-center gap-3 border-b border-archive-700 py-3"
        onPress={() => setDrawerVisible(true)}
      >
        <MediaPoster imageUrl={item.media.imageUrl} size="sm" />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-bold text-archive-50" numberOfLines={2}>
            {item.media.title}
          </Text>
          <Text className="text-sm text-archive-300">{formatDate(plannedFor)}</Text>
          <Text className="text-xs font-semibold text-teal-300" numberOfLines={1}>
            {item.titleState.status === 'completed'
              ? item.media.mediaType === 'game' ? 'Previously completed · Play again' : 'Previously completed · Rewatch plan'
              : item.media.mediaType === 'movie'
                ? 'Plan to watch'
                : item.media.mediaType === 'game'
                  ? 'Plan to play'
                : 'Plan to start'}
          </Text>
        </View>
        <Ionicons color="#b9aa97" name="chevron-forward" size={20} />
      </Pressable>

      <JournalActionDrawer
        actions={drawerActions}
        description={formatDate(plannedFor)}
        onClose={() => setDrawerVisible(false)}
        prompt={item.section === 'missed' ? 'What happened with this plan?' : undefined}
        title={item.media.title}
        visible={drawerVisible}
      />
      <JournalActionConfirmation
        body="This removes the plan only. Existing Journal history remains."
        confirmLabel="Remove plan"
        onCancel={() => setRemoveConfirmationVisible(false)}
        onConfirm={() => void executeRemovePlan()}
        pending={removePlan.isPending}
        title="Remove plan?"
        visible={removeConfirmationVisible}
      />
      <JournalActionFeedback
        body={removeError ?? 'Try again in a moment.'}
        onClose={() => setRemoveError(null)}
        onReport={() => {
          setRemoveError(null);
          router.push(
            '/modals/feedback?category=bug&errorCode=remove_plan_failed&source=journal_planner' as Href,
          );
        }}
        onRetry={() => void executeRemovePlan()}
        pending={removePlan.isPending}
        title="Could not remove plan"
        visible={removeError !== null}
      />
      <JournalActionFeedback
        body={moveError ?? 'Try again in a moment.'}
        onClose={() => setMoveError(null)}
        onRetry={() => void moveToSomeday()}
        pending={savePlan.isPending}
        title="Could not move plan"
        visible={moveError !== null}
      />
    </>
  );
}

export function JournalPlannerView({ userId }: { userId: string }) {
  const { gamesEnabled } = useOptionalAppCapabilities();
  const today = localToday();
  const query = useJournalPlanner(userId, today);
  const items = query.data ?? [];

  if (query.isLoading) {
    return <View className="px-5 pt-5"><LoadingState message="Loading Planner" /></View>;
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
      contentContainerClassName="px-5 pb-28 pt-2"
      keyExtractor={(item) => item.titleState.id}
      renderItem={({ item }) => <PlannerRow gamesEnabled={gamesEnabled} item={item} />}
      renderSectionHeader={({ section }) => (
        <View className="bg-archive-900 pb-2 pt-6">
          <Text className="text-xl font-bold text-archive-50">{section.title}</Text>
          <Text className="mt-1 text-sm text-archive-300">{section.description}</Text>
        </View>
      )}
      sections={sections}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      testID="journal-planner-list"
    />
  );
}
