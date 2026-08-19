import { Pressable, Text, View } from 'react-native';

import { JOURNAL_STATUS_LABELS } from '@/constants/journal';
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
  onPress?: () => void;
  summary: JournalTitleSummary | null;
};

export function YourJournalSummary({
  disabled = false,
  onPress,
  summary,
}: Props) {
  const isInteractive = Boolean(onPress && !disabled);

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

  const { latestCompletedEvent, titleState } = summary;
  const planLabel = titleState.activePlan
    ? titleState.activePlan.plannedFor
      ? formatJournalDate(titleState.activePlan.plannedFor)
      : 'Someday'
    : null;
  const journalCopy = latestCompletedEvent
    ? `Latest watch · ${formatJournalDate(latestCompletedEvent.eventDate)}`
    : planLabel
      ? `Planned for ${planLabel}`
      : titleState.status === 'in_progress'
        ? 'Watching now'
        : JOURNAL_STATUS_LABELS[titleState.status];
  const activityLabel = summary.completedWatchCount
    ? `${summary.completedWatchCount} ${summary.completedWatchCount === 1 ? 'watch' : 'watches'}`
    : JOURNAL_STATUS_LABELS[titleState.status];
  const ratingLabel = latestCompletedEvent?.rating == null
    ? null
    : `${latestCompletedEvent.rating} / 5`;

  return (
    <Pressable
      accessibilityHint={isInteractive ? 'Opens this title’s watch history.' : undefined}
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
        {latestCompletedEvent?.notes ? (
          <Text className="text-xs leading-4 text-archive-400" numberOfLines={1}>
            {latestCompletedEvent.notes}
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
