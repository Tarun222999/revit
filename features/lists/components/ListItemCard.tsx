import { useEffect, useState } from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import type { UserListItem } from '@/features/lists/types';

type ListItemCardProps = {
  isRemoving?: boolean;
  isSavingNote?: boolean;
  item: UserListItem;
  mutationError?: string | null;
  onPress: () => void;
  onRemove: () => void;
  onSaveNote: (note: string | null) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
});

const LIST_ITEM_NOTE_MAX_LENGTH = 500;

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateFormatter.format(date);
}

function getMetadata(item: UserListItem) {
  const parts = [MEDIA_TYPE_LABELS[item.media.mediaType]];

  if (item.media.year) {
    parts.push(item.media.year);
  }

  return parts.join(' - ');
}

export function ListItemCard({
  isRemoving = false,
  isSavingNote = false,
  item,
  mutationError,
  onPress,
  onRemove,
  onSaveNote,
}: ListItemCardProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [note, setNote] = useState(item.note ?? '');
  const addedAt = formatDate(item.createdAt);
  const noteError =
    note.length > LIST_ITEM_NOTE_MAX_LENGTH
      ? `Note must be ${LIST_ITEM_NOTE_MAX_LENGTH} characters or fewer.`
      : undefined;

  useEffect(() => {
    setNote(item.note ?? '');
  }, [item.note]);

  const stopCardPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
  };

  const saveNote = () => {
    if (noteError) {
      return;
    }

    const trimmedNote = note.trim();
    onSaveNote(trimmedNote.length > 0 ? trimmedNote : null);
    setIsEditingNote(false);
  };

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="gap-3 p-3">
        <View className="flex-row gap-3">
          <MediaPoster imageUrl={item.media.imageUrl} size="sm" />

          <View className="min-w-0 flex-1 gap-2">
            <View className="gap-1">
              <Text className="text-base font-bold text-archive-50" numberOfLines={2}>
                {item.media.title}
              </Text>
              <Text className="text-sm text-archive-300" numberOfLines={1}>
                {getMetadata(item)}
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              <View className="rounded-full bg-archive-700 px-3 py-1">
                <Text className="text-xs font-bold text-gold-300">
                  {MEDIA_TYPE_LABELS[item.media.mediaType]}
                </Text>
              </View>
              {addedAt ? (
                <View className="rounded-full bg-archive-700 px-3 py-1">
                  <Text className="text-xs font-bold text-archive-200">
                    Added {addedAt}
                  </Text>
                </View>
              ) : null}
            </View>

            {!isEditingNote && item.note ? (
              <Text className="text-sm leading-5 text-archive-200" numberOfLines={3}>
                {item.note}
              </Text>
            ) : null}
          </View>
        </View>

        {isEditingNote ? (
          <View className="gap-3" onStartShouldSetResponder={() => true}>
            <TextField
              className="min-h-24 py-3"
              error={noteError}
              label={`Note (${note.length}/${LIST_ITEM_NOTE_MAX_LENGTH})`}
              maxLength={LIST_ITEM_NOTE_MAX_LENGTH}
              multiline
              onChangeText={setNote}
              placeholder="Optional note for this list"
              textAlignVertical="top"
              value={note}
            />
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <Button
                  disabled={isSavingNote}
                  onPress={() => {
                    setNote(item.note ?? '');
                    setIsEditingNote(false);
                  }}
                  title="Cancel"
                  variant="secondary"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Button
                  disabled={Boolean(noteError)}
                  loading={isSavingNote}
                  onPress={saveNote}
                  title="Save Note"
                />
              </View>
            </View>
          </View>
        ) : null}

        {mutationError ? (
          <Text className="text-sm leading-5 text-reel-400">{mutationError}</Text>
        ) : null}

        <View
          className="flex-row flex-wrap justify-end gap-3 border-t border-archive-700 pt-3"
          onStartShouldSetResponder={() => true}>
          <Pressable
            accessibilityRole="button"
            className="min-h-9 justify-center rounded-full border border-archive-500 px-4"
            disabled={isRemoving || isSavingNote}
            onPress={(event) => {
              stopCardPress(event);
              setIsEditingNote(true);
            }}>
            <Text className="text-sm font-semibold text-gold-300">
              {item.note ? 'Edit Note' : 'Add Note'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="min-h-9 justify-center rounded-full border border-reel-500 px-4"
            disabled={isRemoving || isSavingNote}
            onPress={(event) => {
              stopCardPress(event);
              onRemove();
            }}>
            <Text className="text-sm font-semibold text-reel-400">
              {isRemoving ? 'Removing' : 'Remove'}
            </Text>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}
