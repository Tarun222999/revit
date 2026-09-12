import { useLocalSearchParams } from 'expo-router';

import { FeedbackModalScreen } from '@/features/feedback/components/FeedbackModalScreen';

export default function FeedbackModalRoute() {
  const { category, errorCode, source } = useLocalSearchParams<{
    category?: string;
    errorCode?: string;
    source?: string;
  }>();

  return (
    <FeedbackModalScreen
      category={category}
      errorCode={errorCode}
      source={source}
    />
  );
}
