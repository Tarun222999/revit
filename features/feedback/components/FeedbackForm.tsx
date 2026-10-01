import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { InlineNotice } from '@/components/feedback/InlineNotice';
import { Button } from '@/components/ui/Button';
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  getFeedbackCategoryCopy,
  getFeedbackSourceLabel,
} from '@/features/feedback/model/feedbackForm';
import {
  FEEDBACK_CATEGORIES,
  type FeedbackCategory,
  type FeedbackContext,
} from '@/features/feedback/types';
import { cn } from '@/lib/utils/cn';

type FeedbackFormProps = {
  category: FeedbackCategory;
  contactAllowed: boolean;
  context: FeedbackContext;
  error: string | null;
  message: string;
  messageError: string | null;
  onCategoryChange: (category: FeedbackCategory) => void;
  onContactAllowedChange: (value: boolean) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
};

export function FeedbackForm({
  category,
  contactAllowed,
  context,
  error,
  message,
  messageError,
  onCategoryChange,
  onContactAllowedChange,
  onMessageChange,
  onSubmit,
  submitting,
}: FeedbackFormProps) {
  const copy = getFeedbackCategoryCopy(category);
  const versionText = [context.appVersion, context.buildNumber]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="text-sm font-semibold text-archive-100">
          What kind of feedback is this?
        </Text>
        <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
          {FEEDBACK_CATEGORIES.map((option) => {
            const selected = option === category;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                className={cn(
                  'min-h-11 justify-center rounded-full border px-4',
                  selected
                    ? 'border-gold-400 bg-shelf-700'
                    : 'border-archive-500 bg-archive-800',
                )}
                disabled={submitting}
                onPress={() => onCategoryChange(option)}
              >
                <Text
                  className={cn(
                    'text-sm font-semibold',
                    selected ? 'text-gold-300' : 'text-archive-200',
                  )}
                >
                  {getFeedbackCategoryCopy(option).label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-archive-100">{copy.prompt}</Text>
        <TextInput
          accessibilityLabel={copy.prompt}
          className={cn(
            'min-h-40 rounded-app border bg-archive-800 px-4 py-3 text-base leading-6 text-archive-50',
            messageError ? 'border-reel-400' : 'border-archive-500',
          )}
          editable={!submitting}
          maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
          multiline
          onChangeText={onMessageChange}
          placeholder={copy.placeholder}
          placeholderTextColor="#aa9473"
          textAlignVertical="top"
          value={message}
        />
        <View className="flex-row justify-between gap-4">
          <Text className="min-w-0 flex-1 text-xs leading-4 text-archive-300">
            Specific steps help us investigate.
          </Text>
          <Text className="text-xs text-archive-300">
            {message.length} / {FEEDBACK_MESSAGE_MAX_LENGTH}
          </Text>
        </View>
        {messageError ? (
          <Text accessibilityRole="alert" className="text-sm text-reel-300">
            {messageError}
          </Text>
        ) : null}
      </View>

      <View className="gap-2 rounded-app border border-archive-700 bg-archive-800 p-4">
        <Text className="text-sm font-bold text-archive-50">Included automatically</Text>
        <View className="flex-row justify-between gap-4">
          <Text className="text-xs text-archive-300">App</Text>
          <Text className="text-right text-xs text-archive-100">
            {versionText || 'Version unavailable'}
          </Text>
        </View>
        <View className="flex-row justify-between gap-4">
          <Text className="text-xs text-archive-300">Device</Text>
          <Text className="text-right text-xs text-archive-100">
            {context.platform} {context.osVersion ?? ''}
          </Text>
        </View>
        <View className="flex-row justify-between gap-4">
          <Text className="text-xs text-archive-300">From</Text>
          <Text className="text-right text-xs text-archive-100">
            {getFeedbackSourceLabel(context.sourceScreen)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-start gap-3">
        <Switch
          accessibilityLabel="Allow Revit to contact me about this report"
          disabled={submitting}
          onValueChange={onContactAllowedChange}
          thumbColor={contactAllowed ? '#fbf6ec' : '#aa9473'}
          trackColor={{ false: '#4a3a2a', true: '#4d9188' }}
          value={contactAllowed}
        />
        <Pressable
          accessibilityRole="button"
          className="min-h-11 min-w-0 flex-1 justify-center"
          disabled={submitting}
          onPress={() => onContactAllowedChange(!contactAllowed)}
        >
          <Text className="text-sm leading-5 text-archive-200">
            Revit may contact me using the email connected to my account.
          </Text>
        </Pressable>
      </View>

      <Text className="text-sm leading-5 text-reel-300">
        Do not include passwords, one-time codes, access tokens, or other secrets.
      </Text>

      {error ? <InlineNotice message={error} tone="error" /> : null}

      <Button loading={submitting} onPress={onSubmit} title="Send feedback" />
    </View>
  );
}
