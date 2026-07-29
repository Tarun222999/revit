import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { MediaPoster } from '@/components/media/MediaPoster';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { REVIEW_BODY_MAX_LENGTH } from '@/constants/reviews';
import { RatingInput } from '@/features/journal/components/RatingInput';
import {
  allowsRating,
  isCompletedIntent,
  isPlanningIntent,
  JOURNAL_INTENT_COPY,
} from '@/features/journal/model/journalIntentForm';
import type {
  JournalEvent,
  JournalFormIntent,
  JournalIntentFormErrors,
  JournalIntentFormValues,
} from '@/features/journal/types';
import type { NormalizedMediaItem } from '@/types/media';

type JournalIntentFormProps = {
  errors: JournalIntentFormErrors;
  event?: JournalEvent | null;
  intent: JournalFormIntent;
  isSubmitting: boolean;
  item?: NormalizedMediaItem;
  onChange: <Key extends keyof JournalIntentFormValues>(
    key: Key,
    value: JournalIntentFormValues[Key],
  ) => void;
  onSubmit: () => void;
  submitError?: string | null;
  values: JournalIntentFormValues;
};

function dateFromInput(value: string | null) {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date();
}

function dateToInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | null, emptyLabel: string) {
  if (!value) return emptyLabel;
  const date = dateFromInput(value);
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function JournalDatePicker({
  allowEmpty,
  error,
  label,
  onChange,
  value,
}: {
  allowEmpty: boolean;
  error?: string;
  label: string;
  onChange: (value: string | null) => void;
  value: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const pickerDate = useMemo(() => dateFromInput(value), [value]);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type !== 'dismissed' && selected) onChange(dateToInput(selected));
    if (Platform.OS !== 'ios' || event.type === 'dismissed') setVisible(false);
  };

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-archive-100">{label}</Text>
      <View className="gap-3 rounded-app border border-archive-500 bg-archive-800 px-4 py-3">
        <View className="flex-row items-center gap-3">
          <Ionicons color="#f0c15a" name="calendar-outline" size={20} />
          <Text className="min-w-0 flex-1 text-base font-semibold text-archive-50">
            {formatDate(value, 'Someday')}
          </Text>
          <Button
            className="min-h-10 px-3"
            title={visible ? 'Done' : 'Choose'}
            variant="secondary"
            onPress={() => setVisible((current) => !current)}
          />
        </View>
        {visible ? (
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            mode="date"
            value={pickerDate}
            onChange={handleChange}
          />
        ) : null}
      </View>
      {allowEmpty && value ? (
        <Button
          className="self-start px-0"
          title="Move to Someday"
          variant="ghost"
          onPress={() => onChange(null)}
        />
      ) : null}
      {error ? <Text className="text-sm text-reel-400">{error}</Text> : null}
    </View>
  );
}

function MediaSummary({ item }: { item?: NormalizedMediaItem }) {
  if (!item) return null;
  return (
    <Card className="flex-row gap-3">
      <MediaPoster imageUrl={item.imageUrl} size="sm" />
      <View className="min-w-0 flex-1 justify-center gap-1">
        <Text className="text-xl font-bold text-archive-50" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-sm capitalize text-archive-300">
          {[item.year, item.mediaType].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Card>
  );
}

export function JournalIntentForm({
  errors,
  event,
  intent,
  isSubmitting,
  item,
  onChange,
  onSubmit,
  submitError,
  values,
}: JournalIntentFormProps) {
  const copy = JOURNAL_INTENT_COPY[intent];
  const planning = isPlanningIntent(intent);
  const ratingAllowed = allowsRating(intent, event ?? undefined);
  const showNotes = !planning;
  const releaseWarning =
    ratingAllowed &&
    values.date &&
    item?.releaseDate &&
    values.date < item.releaseDate;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <MediaSummary item={item} />

      <View className="gap-1">
        <Text className="text-sm leading-5 text-archive-300">
          {copy.description}
        </Text>
      </View>

      <JournalDatePicker
        allowEmpty={planning}
        error={errors.date}
        label={copy.dateLabel}
        value={values.date}
        onChange={(date) => onChange('date', date)}
      />

      {releaseWarning ? (
        <Card className="gap-1 border-gold-700 bg-archive-800">
          <Text className="font-semibold text-gold-300">Check the date</Text>
          <Text className="text-sm leading-5 text-archive-300">
            This is before the provider release date. You can still save it if the date is right for you.
          </Text>
        </Card>
      ) : null}

      {ratingAllowed ? (
        <RatingInput
          value={values.rating}
          onChange={(rating) => onChange('rating', rating)}
        />
      ) : null}

      {showNotes ? (
        <TextField
          className="min-h-32 py-3"
          error={errors.notes}
          label={`Notes (${values.notes.length}/${REVIEW_BODY_MAX_LENGTH})`}
          maxLength={REVIEW_BODY_MAX_LENGTH}
          multiline
          onChangeText={(notes) => onChange('notes', notes)}
          placeholder={
            isCompletedIntent(intent) ? 'What stayed with you?' : 'Optional personal note'
          }
          textAlignVertical="top"
          value={values.notes}
        />
      ) : null}

      {submitError ? (
        <Card className="border-reel-500 bg-archive-800">
          <Text accessibilityRole="alert" className="text-sm leading-5 text-reel-300">
            {submitError} Your changes are still here—try again when ready.
          </Text>
        </Card>
      ) : null}

      <Button
        disabled={hasErrors || isSubmitting}
        loading={isSubmitting}
        onPress={onSubmit}
        title={copy.submitLabel}
      />
    </>
  );
}
