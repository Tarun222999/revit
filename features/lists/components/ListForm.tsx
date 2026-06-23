import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import type { UserListDetails, UserListSummary } from '@/features/lists/types';

export type ListFormValues = {
  name: string;
  description: string;
};

export type ListFormErrors = Partial<Record<keyof ListFormValues, string>>;
export type ListFormTouchedFields = Partial<Record<keyof ListFormValues, boolean>>;

type ListFormProps = {
  deleteError?: string | null;
  errors: ListFormErrors;
  hasSubmitted?: boolean;
  isDeleting?: boolean;
  isSubmitting: boolean;
  list?: Pick<UserListSummary | UserListDetails, 'description' | 'id' | 'name'> | null;
  onCancel: () => void;
  onBlurField?: (key: keyof ListFormValues) => void;
  onChange: <Key extends keyof ListFormValues>(
    key: Key,
    value: ListFormValues[Key],
  ) => void;
  onDelete?: () => void;
  onSubmit: () => void;
  submitError?: string | null;
  touchedFields?: ListFormTouchedFields;
  values: ListFormValues;
};

const LIST_NAME_MAX_LENGTH = 80;
const LIST_DESCRIPTION_MAX_LENGTH = 280;

export function validateListForm(values: ListFormValues): ListFormErrors {
  const errors: ListFormErrors = {};
  const name = values.name.trim();

  if (name.length === 0) {
    errors.name = 'List name is required.';
  } else if (name.length > LIST_NAME_MAX_LENGTH) {
    errors.name = `List name must be ${LIST_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (values.description.length > LIST_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be ${LIST_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}

export function getVisibleListFormErrors(
  errors: ListFormErrors,
  touchedFields: ListFormTouchedFields,
  hasSubmitted: boolean,
): ListFormErrors {
  if (hasSubmitted) {
    return errors;
  }

  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => {
      return touchedFields[field as keyof ListFormValues];
    }),
  ) as ListFormErrors;
}

export function ListForm({
  deleteError,
  errors,
  hasSubmitted = false,
  isDeleting = false,
  isSubmitting,
  list,
  onBlurField,
  onCancel,
  onChange,
  onDelete,
  onSubmit,
  submitError,
  touchedFields = {},
  values,
}: ListFormProps) {
  const isEditMode = Boolean(list);
  const visibleErrors = getVisibleListFormErrors(
    errors,
    touchedFields,
    hasSubmitted,
  );
  const hasVisibleValidationErrors = Object.keys(visibleErrors).length > 0;

  return (
    <Card className="gap-4">
      <View className="gap-1">
        <Text className="text-xl font-bold text-archive-50">
          {isEditMode ? 'Edit List' : 'Create List'}
        </Text>
        <Text className="text-sm leading-5 text-archive-300">
          Lists can mix movies, series, and anime by default.
        </Text>
      </View>

      <TextField
        error={visibleErrors.name}
        label={`Name (${values.name.length}/${LIST_NAME_MAX_LENGTH})`}
        maxLength={LIST_NAME_MAX_LENGTH}
        onBlur={() => onBlurField?.('name')}
        onChangeText={(name) => onChange('name', name)}
        placeholder="Favorites"
        value={values.name}
      />

      <TextField
        className="min-h-24 py-3"
        error={visibleErrors.description}
        label={`Description (${values.description.length}/${LIST_DESCRIPTION_MAX_LENGTH})`}
        maxLength={LIST_DESCRIPTION_MAX_LENGTH}
        multiline
        onBlur={() => onBlurField?.('description')}
        onChangeText={(description) => onChange('description', description)}
        placeholder="Optional note about this collection"
        textAlignVertical="top"
        value={values.description}
      />

      {hasVisibleValidationErrors ? (
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

      <View className="gap-3">
        <Button
          disabled={isDeleting}
          loading={isSubmitting}
          onPress={onSubmit}
          title={isEditMode ? 'Save Changes' : 'Create List'}
        />
        <Button
          disabled={isSubmitting || isDeleting}
          onPress={onCancel}
          title="Cancel"
          variant="secondary"
        />
      </View>

      {isEditMode && onDelete ? (
        <View className="gap-3 border-t border-archive-700 pt-5">
          <View className="gap-1">
            <Text className="text-base font-bold text-archive-50">
              Delete list
            </Text>
            <Text className="text-sm leading-5 text-archive-300">
              This removes the collection only. Journal entries and media titles stay untouched.
            </Text>
          </View>
          <Button
            disabled={isSubmitting}
            loading={isDeleting}
            onPress={onDelete}
            title="Delete List"
            variant="danger"
          />
        </View>
      ) : null}
    </Card>
  );
}
