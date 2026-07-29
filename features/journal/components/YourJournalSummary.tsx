import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 rounded-app border border-archive-700 bg-archive-900 p-3">
      <Text className="text-xs font-semibold uppercase text-archive-300">{label}</Text>
      <Text className="mt-1 text-base font-bold text-archive-50">{value}</Text>
    </View>
  );
}

export function YourJournalSummary({
  summary,
}: {
  summary: JournalTitleSummary | null;
}) {
  if (!summary) {
    return (
      <Card className="gap-2">
        <Text className="text-lg font-bold text-archive-50">Your Journal</Text>
        <Text className="text-sm leading-5 text-archive-300">
          No plan or activity yet. Log what happened or plan what comes next.
        </Text>
      </Card>
    );
  }

  const { latestCompletedEvent, titleState } = summary;
  const planLabel = titleState.activePlan
    ? titleState.activePlan.plannedFor
      ? formatJournalDate(titleState.activePlan.plannedFor)
      : 'Someday'
    : null;

  return (
    <Card className="gap-4">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="min-w-0 flex-1 text-lg font-bold text-archive-50">
          Your Journal
        </Text>
        <View className="rounded-full border border-teal-500 px-3 py-1">
          <Text className="text-xs font-bold text-teal-300">
            {JOURNAL_STATUS_LABELS[titleState.status]}
          </Text>
        </View>
      </View>

      {planLabel ? <Metric label="Active plan" value={planLabel} /> : null}

      <View className="flex-row gap-3">
        <Metric
          label="Watches"
          value={String(summary.completedWatchCount)}
        />
        <Metric
          label="Latest rating"
          value={
            latestCompletedEvent?.rating == null
              ? 'Not rated'
              : `${latestCompletedEvent.rating} / 5`
          }
        />
      </View>

      {latestCompletedEvent ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-archive-100">
            Latest watch · {formatJournalDate(latestCompletedEvent.eventDate)}
          </Text>
          {latestCompletedEvent.notes ? (
            <Text className="text-sm leading-5 text-archive-300" numberOfLines={3}>
              {latestCompletedEvent.notes}
            </Text>
          ) : null}
        </View>
      ) : titleState.status === 'in_progress' && summary.activityCount ? (
        <Text className="text-sm text-archive-300">Watching now</Text>
      ) : null}
    </Card>
  );
}
