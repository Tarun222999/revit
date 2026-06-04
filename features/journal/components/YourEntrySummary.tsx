import { Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { JOURNAL_STATUS_LABELS } from '@/constants/journal';
import type { JournalEntry } from '@/features/journal/types';

type YourEntrySummaryProps = {
  entry: JournalEntry | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="min-w-0 flex-1 rounded-app border border-archive-700 bg-archive-900 p-3">
      <Text className="text-xs font-semibold uppercase text-archive-300">
        {label}
      </Text>
      <Text className="mt-1 text-base font-bold text-archive-50">
        {value}
      </Text>
    </View>
  );
}

export function YourEntrySummary({ entry }: YourEntrySummaryProps) {
  if (!entry) {
    return (
      <Card className="gap-3">
        <View className="flex-row items-start justify-between gap-3">
          <Text
            adjustsFontSizeToFit
            className="min-w-0 flex-1 text-lg font-bold text-archive-50"
            numberOfLines={1}>
            Your Entry
          </Text>
          <View className="shrink-0 rounded-full border border-archive-700 px-3 py-1">
            <Text className="text-xs font-bold text-archive-200">
              Not in journal
            </Text>
          </View>
        </View>
        <Text className="text-sm leading-5 text-archive-300">
          Add this title to track your status, rating, and short review.
        </Text>
      </Card>
    );
  }

  const completedOn = formatDate(entry.completed_on);
  const loggedAt = formatDate(entry.created_at);
  const updatedAt = formatDate(entry.last_activity_at);
  const reviewPreview = entry.review_headline || entry.review_body;

  return (
    <Card className="gap-4">
      <View className="flex-row items-start justify-between gap-3">
        <Text
          adjustsFontSizeToFit
          className="min-w-0 flex-1 text-lg font-bold text-archive-50"
          numberOfLines={1}>
          Your Entry
        </Text>
        <View className="shrink-0 rounded-full border border-teal-500 px-3 py-1">
          <Text className="text-xs font-bold text-teal-300">
            {JOURNAL_STATUS_LABELS[entry.status]}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Metric
          label="Rating"
          value={entry.rating === null ? 'Not rated' : `${entry.rating} / 5`}
        />
        <Metric label="Logged" value={loggedAt ?? 'Unknown'} />
      </View>

      {completedOn ? (
        <Metric label="Completed" value={completedOn} />
      ) : updatedAt ? (
        <Metric label="Last activity" value={updatedAt} />
      ) : null}

      {reviewPreview ? (
        <View className="gap-1">
          {entry.review_headline ? (
            <Text className="text-base font-bold text-archive-50">
              {entry.review_headline}
            </Text>
          ) : null}
          {entry.review_body ? (
            <Text className="text-sm leading-5 text-archive-300" numberOfLines={3}>
              {entry.contains_spoilers ? 'Spoiler review saved.' : entry.review_body}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
