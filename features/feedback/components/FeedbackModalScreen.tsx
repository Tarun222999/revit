import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { getFeedbackErrorMessage } from '@/features/feedback/api/feedback-api';
import { FeedbackForm } from '@/features/feedback/components/FeedbackForm';
import { useSubmitFeedback } from '@/features/feedback/hooks/useSubmitFeedback';
import {
  collectFeedbackContext,
  formatFeedbackReference,
  isFeedbackCategory,
  isFeedbackErrorCode,
  isFeedbackSource,
  validateFeedbackMessage,
} from '@/features/feedback/model/feedbackForm';
import type { FeedbackCategory } from '@/features/feedback/types';
import { useAuth } from '@/features/auth/hooks/useAuth';

type FeedbackModalScreenProps = {
  category?: string;
  errorCode?: string;
  source?: string;
};

export function FeedbackModalScreen({
  category: categoryParam,
  errorCode: errorCodeParam,
  source: sourceParam,
}: FeedbackModalScreenProps) {
  const { user } = useAuth();
  const submitFeedback = useSubmitFeedback();
  const initialCategory: FeedbackCategory = isFeedbackCategory(categoryParam)
    ? categoryParam
    : 'other';
  const [category, setCategory] = useState(initialCategory);
  const [message, setMessage] = useState('');
  const [contactAllowed, setContactAllowed] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const context = useMemo(
    () =>
      collectFeedbackContext({
        errorCode: isFeedbackErrorCode(errorCodeParam) ? errorCodeParam : null,
        sourceScreen: isFeedbackSource(sourceParam) ? sourceParam : 'help_feedback',
      }),
    [errorCodeParam, sourceParam],
  );
  const messageError = hasSubmitted ? validateFeedbackMessage(message) : null;

  const reset = () => {
    setCategory(initialCategory);
    setMessage('');
    setContactAllowed(false);
    setHasSubmitted(false);
    setSubmitError(null);
    setReportId(null);
  };

  const submit = async () => {
    if (submitFeedback.isPending) return;
    setHasSubmitted(true);
    setSubmitError(null);

    if (validateFeedbackMessage(message)) return;
    if (!user?.id) {
      setSubmitError('Sign in again before sending feedback.');
      return;
    }

    try {
      const result = await submitFeedback.mutateAsync({
        category,
        contactAllowed,
        context,
        message,
        userId: user.id,
      });
      setReportId(result.id);
      AccessibilityInfo.announceForAccessibility('Feedback sent successfully.');
    } catch {
      setSubmitError(getFeedbackErrorMessage());
      AccessibilityInfo.announceForAccessibility('Could not send feedback.');
    }
  };

  if (!user?.id) {
    return (
      <Screen className="justify-center" safeAreaEdges={['top', 'right', 'bottom', 'left']}>
        <ErrorState
          message="Sign in before sending product feedback. You can still use the public Support page."
          title="Sign in required"
        />
        <View className="mt-4 gap-3">
          <Button onPress={() => router.replace('/(auth)/welcome')} title="Sign in" />
          <Button onPress={() => router.replace('/support')} title="Open Support" variant="secondary" />
        </View>
      </Screen>
    );
  }

  if (reportId) {
    return (
      <Screen className="justify-center" safeAreaEdges={['top', 'right', 'bottom', 'left']}>
        <View accessibilityLiveRegion="polite" className="gap-5 text-center">
          <View className="h-20 w-20 self-center items-center justify-center rounded-full border border-teal-500 bg-archive-800">
            <Ionicons color="#8bc6bd" name="checkmark" size={38} />
          </View>
          <View className="gap-2">
            <Text className="text-center text-3xl font-bold text-archive-50">Thanks for helping.</Text>
            <Text className="text-center text-base leading-6 text-archive-200">
              Your feedback is in the review queue. We’ll use it to improve Revit.
            </Text>
          </View>
          <Text className="text-center text-sm text-archive-300">
            Reference <Text className="font-bold text-archive-100">{formatFeedbackReference(reportId)}</Text>
          </Text>
          <View className="gap-3">
            <Button onPress={() => router.back()} title="Done" />
            <Button onPress={reset} title="Send another" variant="secondary" />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll safeAreaEdges={['top', 'right', 'bottom', 'left']}>
      <View className="gap-6">
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-2xl font-bold text-archive-50">Send feedback</Text>
            <Text className="text-sm text-archive-300">A short report is enough.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close feedback form"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full border border-archive-700 bg-archive-800"
            disabled={submitFeedback.isPending}
            hitSlop={8}
            onPress={() => router.back()}
          >
            <Ionicons color="#fbf6ec" name="close" size={21} />
          </Pressable>
        </View>

        <FeedbackForm
          category={category}
          contactAllowed={contactAllowed}
          context={context}
          error={submitError}
          message={message}
          messageError={messageError}
          onCategoryChange={(nextCategory) => {
            setCategory(nextCategory);
            setSubmitError(null);
          }}
          onContactAllowedChange={setContactAllowed}
          onMessageChange={(value) => {
            setMessage(value);
            setSubmitError(null);
          }}
          onSubmit={() => void submit()}
          submitting={submitFeedback.isPending}
        />
      </View>
    </Screen>
  );
}
