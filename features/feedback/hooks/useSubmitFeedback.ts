import { onlineManager, useMutation } from '@tanstack/react-query';

import {
  FeedbackOfflineError,
  submitFeedback,
} from '@/features/feedback/api/feedback-api';
import type { SubmitFeedbackInput } from '@/features/feedback/types';

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (input: SubmitFeedbackInput) => {
      if (!onlineManager.isOnline()) throw new FeedbackOfflineError();
      return submitFeedback(input);
    },
    networkMode: 'always',
  });
}
