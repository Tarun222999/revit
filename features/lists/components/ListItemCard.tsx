import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { Alert, Platform, Pressable, Text, View } from 'react-native';
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
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const busy = isSaving || isSavingNote;
  const close = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);
  const dismiss = useCollectionDismiss(
    editing,
    note !== (item.note ?? ''),
    busy || saving.current,
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
    setIsSaving(true);
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
      setIsSaving(false);
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
              const message = `Remove ${item.media.title} and its note from this list? Your Journal and other lists stay as they are.`;
              if (Platform.OS === 'web') {
                if (window.confirm(message)) onRemove();
                return;
              }
              Alert.alert('Remove this title?', message, [
                { text: 'Keep title', style: 'cancel' },
                {
                  text: 'Remove from list',
                  style: 'destructive',
                  onPress: onRemove,
                },
              ]);
            }}
          />
        </CollectionSheet>
      ) : null}
      {editing ? (
        <CollectionSheet
          title={item.note ? 'Edit note' : 'Add note'}
          onClose={dismiss}
          busy={busy}
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
            editable={!busy}
            maxLength={500}
            onChangeText={(value) => {
              if (!saving.current && !isSavingNote) setNote(value);
            }}
          />
          {error ? (
            <Text accessibilityRole="alert" className="text-sm text-reel-300">
              {error}
            </Text>
          ) : null}
          <Button title="Save note" loading={busy} onPress={save} />
          <Button
            title="Cancel"
            variant="secondary"
            disabled={busy}
            onPress={dismiss}
          />
        </CollectionSheet>
      ) : null}
    </View>
  );
}
