import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { MediaPoster } from '@/components/media/MediaPoster';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { MEDIA_TYPE_LABELS } from '@/constants/media';
import { CollectionSheet } from '@/features/lists/components/CollectionSheet';
import { useCollectionDismiss } from '@/features/lists/hooks/useCollectionDismiss';
import type { UserListItem } from '@/features/lists/types';

type ListItemCardProps = {
  isRemoving?: boolean;
  isSavingNote?: boolean;
  item: UserListItem;
  mutationError?: string | null;
  onPress: () => void;
  onRemove: () => void;
  onSaveNote: (note: string | null) => Promise<void>;
};

export function ListItemCard({
  isRemoving = false,
  isSavingNote = false,
  item,
  mutationError,
  onPress,
  onRemove,
  onSaveNote,
}: ListItemCardProps) {
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState(false);
  const [note, setNote] = useState(item.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const close = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);
  const dismiss = useCollectionDismiss(
    editing,
    note !== (item.note ?? ''),
    isSavingNote || saving.current,
    close,
  );
  const openNote = () => {
    setOptions(false);
    setNote(item.note ?? '');
    setError(null);
    setEditing(true);
  };
  const save = async () => {
    if (saving.current || isSavingNote || note.length > 500) return;
    saving.current = true;
    setError(null);
    try {
      await onSaveNote(note.trim() || null);
      close();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Unable to save this note. Try again.',
      );
    } finally {
      saving.current = false;
    }
  };
  return (
    <View className="border-b border-archive-700 py-4">
      <View className="flex-row items-start gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${item.media.title} artwork and details`}
          onPress={onPress}
        >
          <MediaPoster
            imageUrl={item.media.imageUrl}
            size="sm"
            className="h-20 w-14 rounded-md"
          />
        </Pressable>
        <View className="min-w-0 flex-1 gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.media.title}`}
            className="min-h-12 justify-center"
            onPress={onPress}
          >
            <Text className="text-base font-semibold text-archive-50">
              {item.media.title}
            </Text>
          </Pressable>
          <Text className="text-sm text-archive-300">
            {[MEDIA_TYPE_LABELS[item.media.mediaType], item.media.year]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {item.note ? (
            <Text
              className="text-sm italic leading-6 text-archive-200"
              numberOfLines={3}
            >
              {item.note}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.note ? 'Edit note' : 'Add note'} for ${item.media.title}`}
            disabled={isRemoving || isSavingNote}
            className="min-h-12 flex-row items-center gap-2"
            onPress={openNote}
          >
            <Ionicons name="create-outline" color="#aa9473" size={15} />
            <Text className="text-sm text-archive-300">
              {item.note ? 'Edit note' : 'Add note'}
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Options for ${item.media.title}`}
          accessibilityState={{
            expanded: options,
            disabled: isRemoving || isSavingNote,
          }}
          disabled={isRemoving || isSavingNote}
          className="h-12 w-12 items-center justify-center"
          onPress={() => setOptions(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#aa9473" />
        </Pressable>
      </View>
      {mutationError ? (
        <Text accessibilityRole="alert" className="text-sm text-reel-300">
          {mutationError}
        </Text>
      ) : null}
      {options ? (
        <CollectionSheet
          title={item.media.title}
          onClose={() => setOptions(false)}
        >
          <Button
            title={item.note ? 'Edit note' : 'Add note'}
            variant="secondary"
            onPress={openNote}
          />
          <Button
            title="Remove from this list"
            variant="danger"
            onPress={() => {
              setOptions(false);
              Alert.alert(
                'Remove this title?',
                `Remove ${item.media.title} and its note from this list? Your Journal and other lists stay as they are.`,
                [
                  { text: 'Keep title', style: 'cancel' },
                  {
                    text: 'Remove from list',
                    style: 'destructive',
                    onPress: onRemove,
                  },
                ],
              );
            }}
          />
        </CollectionSheet>
      ) : null}
      {editing ? (
        <CollectionSheet
          title={item.note ? 'Edit note' : 'Add note'}
          onClose={dismiss}
          busy={isSavingNote}
        >
          <Text className="text-sm leading-6 text-archive-300">
            {item.media.title} · A note just for this collection.
          </Text>
          <TextField
            accessibilityLabel="Collection note"
            autoFocus
            multiline
            textAlignVertical="top"
            className="min-h-28"
            label={`Your note (${note.length}/500)`}
            value={note}
            maxLength={500}
            onChangeText={setNote}
          />
          {error ? (
            <Text accessibilityRole="alert" className="text-sm text-reel-300">
              {error}
            </Text>
          ) : null}
          <Button title="Save note" loading={isSavingNote} onPress={save} />
          <Button
            title="Cancel"
            variant="secondary"
            disabled={isSavingNote}
            onPress={dismiss}
          />
        </CollectionSheet>
      ) : null}
    </View>
  );
}
