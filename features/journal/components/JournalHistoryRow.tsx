import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { JournalEvent } from '@/features/journal/types';

export function formatJournalHistoryDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function getJournalHistoryEventLabel(
  event: JournalEvent,
  completedIndex: number,
  completedCount: number,
) {
  if (event.type === 'started') return 'Started watching';
  if (event.type === 'stopped') return 'Stopped watching';
  return completedIndex < completedCount - 1 ? 'Rewatched' : 'Watched';
}

export function JournalHistoryRow({
  completedCount,
  completedIndex,
  event,
  menuOpen,
  onDelete,
  onEdit,
  onToggleMenu,
  pending,
}: {
  completedCount: number;
  completedIndex: number;
  event: JournalEvent;
  menuOpen: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onToggleMenu: () => void;
  pending: boolean;
}) {
  const label = getJournalHistoryEventLabel(event, completedIndex, completedCount);
  const date = formatJournalHistoryDate(event.eventDate);

  return (
    <Card className="gap-3">
      <View className="flex-row items-start gap-3">
        <View className="mt-1 h-3 w-3 rounded-full border-2 border-gold-400 bg-archive-800" />
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-archive-50">{label}</Text>
              <Text className="text-sm text-archive-300">{date}</Text>
            </View>
          </View>
          {event.notes ? (
            <Text className="text-sm leading-5 text-archive-300" numberOfLines={3}>
              {event.notes}
            </Text>
          ) : null}
        </View>
        <View className="items-end gap-2">
          {event.rating != null ? (
            <Text className="font-bold text-gold-300">{event.rating} / 5</Text>
          ) : null}
          <Pressable
          accessibilityHint="Shows edit or delete actions for this activity."
          accessibilityLabel={`Show actions for ${label} on ${date}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: pending, expanded: menuOpen }}
          className={`min-h-12 min-w-12 items-center justify-center rounded-app border ${
            menuOpen
              ? 'border-gold-400 bg-gold-500/20'
              : 'border-archive-500 bg-archive-900'
          } ${pending ? 'opacity-50' : ''}`}
          disabled={pending}
          hitSlop={4}
          onPress={onToggleMenu}
        >
          <Ionicons
            color={menuOpen ? '#f4c95d' : '#fbf6ec'}
            name={menuOpen ? 'close' : 'ellipsis-horizontal'}
            size={22}
          />
          </Pressable>
        </View>
      </View>

      {menuOpen ? (
        <View className="flex-row justify-end gap-2 border-t border-archive-700 pt-3">
          <Pressable
            accessibilityHint="Opens this watch for editing."
            accessibilityLabel="Edit watch"
            accessibilityRole="button"
            accessibilityState={{ disabled: pending }}
            className={`min-h-12 min-w-12 items-center justify-center rounded-app border border-archive-500 bg-archive-900 ${pending ? 'opacity-50' : ''}`}
            disabled={pending}
            onPress={onEdit}
            testID="journal-history-edit"
          >
            <Ionicons color="#fbf6ec" name="create-outline" size={22} />
          </Pressable>
          <Pressable
            accessibilityHint="Permanently removes this watch after confirmation."
            accessibilityLabel="Delete watch"
            accessibilityRole="button"
            accessibilityState={{ disabled: pending }}
            className={`min-h-12 min-w-12 items-center justify-center rounded-app bg-reel-500 ${pending ? 'opacity-50' : ''}`}
            disabled={pending}
            onPress={onDelete}
            testID="journal-history-delete"
          >
            <Ionicons color="#fbf6ec" name="trash-outline" size={22} />
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
