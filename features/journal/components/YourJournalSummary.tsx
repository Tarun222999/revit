import { Pressable, Text, View } from 'react-native';

import { JOURNAL_STATUS_LABELS } from '@/constants/journal';
import type { MediaType } from '@/constants/media';
import type { JournalTitleSummary } from '@/features/journal/types';

function formatJournalDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

type Props = {
  disabled?: boolean;
  mediaType?: MediaType;
  onPress?: () => void;
  summary: JournalTitleSummary | null;
};

function getJournalCopy({
  isGame,
  latestCompletedEvent,
  planLabel,
  status,
}: {
  isGame: boolean;
  latestCompletedEvent: JournalTitleSummary['latestCompletedEvent'];
  planLabel: string | null;
  status: JournalTitleSummary['titleState']['status'];
}) {
  if (latestCompletedEvent) {
    return `Latest ${isGame ? 'play' : 'watch'} · ${formatJournalDate(latestCompletedEvent.eventDate)}`;
  }
  if (planLabel) return `Planned for ${planLabel}`;
  if (status === 'in_progress') return isGame ? 'Playing now' : 'Watching now';
  return JOURNAL_STATUS_LABELS[status];
}

function getActivityLabel(count: number, isGame: boolean, status: JournalTitleSummary['titleState']['status']) {
  if (!count) return JOURNAL_STATUS_LABELS[status];
  const singular = isGame ? 'play' : 'watch';
  const plural = isGame ? 'plays' : 'watches';
  return `${count} ${count === 1 ? singular : plural}`;
}

export function YourJournalSummary({
  disabled = false,
  mediaType,
  onPress,
  summary,
}: Props) {
  const isInteractive = Boolean(onPress && !disabled);
  const isGame = mediaType === 'game';

  if (!summary) {
    return (
      <Pressable
        accessibilityHint={
          isInteractive ? 'Opens the next Journal action for this title.' : undefined
        }
        accessibilityLabel="Your Journal. Nothing recorded yet."
        accessibilityRole={isInteractive ? 'button' : undefined}
        className="min-h-20 flex-row items-center justify-between gap-4 border-y border-archive-700 py-4"
        disabled={!isInteractive}
        onPress={onPress}>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-serif text-xl text-archive-50">Your Journal</Text>
          <Text className="text-sm leading-5 text-archive-300">Nothing recorded yet</Text>
        </View>
        <Text className="text-sm font-semibold text-gold-300">Start →</Text>
      </Pressable>
    );
  }

  const { latestActivityEvent, latestCompletedEvent, titleState } = summary;
  const activeGameEvent =
    isGame && titleState.status === 'in_progress' ? latestActivityEvent : null;
  const planLabel = titleState.activePlan
    ? titleState.activePlan.plannedFor
      ? formatJournalDate(titleState.activePlan.plannedFor)
      : 'Someday'
    : null;
  const journalCopy = activeGameEvent
    ? 'Playing now'
    : getJournalCopy({
        isGame,
        latestCompletedEvent,
        planLabel,
        status: titleState.status,
      });
  const activityLabel = getActivityLabel(
    summary.completedWatchCount,
    isGame,
    titleState.status,
  );
  const activeRating = activeGameEvent ? titleState.rating : latestCompletedEvent?.rating;
  const ratingLabel = activeRating == null
    ? null
    : `${activeRating} / 5`;

  return (
    <Pressable
      accessibilityHint={isInteractive ? `Opens this title’s ${isGame ? 'play' : 'watch'} history.` : undefined}
      accessibilityLabel={`Your Journal. ${journalCopy}. ${activityLabel}.`}
      accessibilityRole={isInteractive ? 'button' : undefined}
      className="min-h-20 flex-row items-center gap-4 border-y border-archive-700 py-4"
      disabled={!isInteractive}
      onPress={onPress}>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="font-serif text-xl text-archive-50">Your Journal</Text>
        <Text className="text-sm leading-5 text-archive-300" numberOfLines={1}>
          {journalCopy}
        </Text>
        {(activeGameEvent?.notes ?? latestCompletedEvent?.notes ?? titleState.reviewBody) ? (
          <Text className="text-xs leading-4 text-archive-400" numberOfLines={1}>
            {activeGameEvent?.notes ?? latestCompletedEvent?.notes ?? titleState.reviewBody}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-1">
        <Text className="text-sm font-semibold text-gold-300">{activityLabel}</Text>
        {ratingLabel ? <Text className="text-xs text-archive-200">{ratingLabel}</Text> : null}
      </View>
    </Pressable>
  );
}
