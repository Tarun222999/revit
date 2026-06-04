import { Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import type { JournalStatus } from '@/constants/journal';
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_HEADLINE_MAX_LENGTH,
} from '@/constants/reviews';
import { JournalStatusSelector } from '@/features/journal/components/JournalStatusSelector';
import { RatingInput } from '@/features/journal/components/RatingInput';
import { SpoilerToggle } from '@/features/journal/components/SpoilerToggle';
import type { JournalEntryFormErrors } from '@/features/journal/model/journalEntryForm';
import type { JournalEntryFormValues } from '@/features/journal/types';
import type { NormalizedMediaItem } from '@/types/media';

type JournalEntryFormProps = {
  canDelete: boolean;
  deleteError?: string | null;
  errors: JournalEntryFormErrors;
  isEditMode: boolean;
  isDeleting: boolean;
  isSubmitting: boolean;
  item?: NormalizedMediaItem;
  onChange: <Key extends keyof JournalEntryFormValues>(
    key: Key,
    value: JournalEntryFormValues[Key],
  ) => void;
  onDelete: () => void;
  onSubmit: () => void;
  onStatusChange: (status: JournalStatus) => void;
  submitError?: string | null;
  values: JournalEntryFormValues;
};

export function JournalEntryForm({
  canDelete,
  deleteError,
  errors,
  isEditMode,
  isDeleting,
  isSubmitting,
  item,
  onChange,
  onDelete,
  onSubmit,
  onStatusChange,
  submitError,
  values,
}: JournalEntryFormProps) {
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      {item ? (
        <Card className="flex-row gap-3">
          <MediaPoster imageUrl={item.imageUrl} size="sm" />
          <View className="min-w-0 flex-1 justify-center gap-1">
            <Text className="text-xl font-bold text-archive-50" numberOfLines={2}>
              {item.title}
            </Text>
            <Text className="text-sm text-archive-300">
              {item.year ? `${item.year} - ` : ''}
              {item.mediaType}
            </Text>
          </View>
        </Card>
      ) : null}

      <JournalStatusSelector value={values.status} onChange={onStatusChange} />

      <RatingInput
        value={values.rating}
        onChange={(rating) => onChange('rating', rating)}
      />

      {values.status === 'completed' ? (
        <TextField
          error={errors.completedOn}
          label="Completed on"
          onChangeText={(completedOn) =>
            onChange('completedOn', completedOn || null)
          }
          placeholder="YYYY-MM-DD"
          value={values.completedOn ?? ''}
        />
      ) : null}

      <TextField
        error={errors.reviewHeadline}
        label={`Headline (${values.reviewHeadline.length}/${REVIEW_HEADLINE_MAX_LENGTH})`}
        maxLength={REVIEW_HEADLINE_MAX_LENGTH}
        onChangeText={(reviewHeadline) =>
          onChange('reviewHeadline', reviewHeadline)
        }
        placeholder="Optional short headline"
        value={values.reviewHeadline}
      />

      <TextField
        className="min-h-32 py-3"
        error={errors.reviewBody}
        label={`Review (${values.reviewBody.length}/${REVIEW_BODY_MAX_LENGTH})`}
        maxLength={REVIEW_BODY_MAX_LENGTH}
        multiline
        onChangeText={(reviewBody) => onChange('reviewBody', reviewBody)}
        placeholder="Write a short review"
        textAlignVertical="top"
        value={values.reviewBody}
      />

      <SpoilerToggle
        value={values.containsSpoilers}
        onChange={(containsSpoilers) =>
          onChange('containsSpoilers', containsSpoilers)
        }
      />

      {hasErrors ? (
        <Text className="text-sm leading-5 text-reel-400">
          Fix the highlighted fields before saving.
        </Text>
      ) : null}

      {submitError ? (
        <Text className="text-sm leading-5 text-reel-400">{submitError}</Text>
      ) : null}

      {deleteError ? (
        <Text className="text-sm leading-5 text-reel-400">{deleteError}</Text>
      ) : null}

      <View className="gap-2 pb-2">
        <Button
          disabled={hasErrors || isDeleting}
          loading={isSubmitting}
          onPress={onSubmit}
          title={isEditMode ? 'Save Changes' : 'Save Entry'}
        />
      </View>

      {canDelete ? (
        <View className="gap-3 border-t border-archive-700 pt-5">
          <View className="gap-1">
            <Text className="text-base font-bold text-archive-50">
              Remove from journal
            </Text>
            <Text className="text-sm leading-5 text-archive-300">
              Delete this entry and return the title to the empty journal state.
            </Text>
          </View>
          <Button
            disabled={isSubmitting}
            loading={isDeleting}
            onPress={onDelete}
            title="Delete Entry"
            variant="danger"
          />
        </View>
      ) : null}
    </>
  );
}
