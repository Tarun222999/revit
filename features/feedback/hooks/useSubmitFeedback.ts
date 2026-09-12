import { useMutation } from '@tanstack/react-query';

import { submitFeedback } from '@/features/feedback/api/feedback-api';
import type { SubmitFeedbackInput } from '@/features/feedback/types';

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: (input: SubmitFeedbackInput) => submitFeedback(input),
  });
}
