import type {
  FeedbackReportInsert,
  SubmitFeedbackInput,
} from '@/features/feedback/types';
import { validateFeedbackMessage } from '@/features/feedback/model/feedbackForm';
import { supabase } from '@/lib/supabase/client';

export class FeedbackOfflineError extends Error {
  constructor() {
    super('Feedback cannot be sent while offline.');
    this.name = 'FeedbackOfflineError';
  }
}

export async function submitFeedback(input: SubmitFeedbackInput) {
  const messageError = validateFeedbackMessage(input.message);
  if (messageError) throw new Error(messageError);

  const report: FeedbackReportInsert = {
    app_version: input.context.appVersion,
    build_number: input.context.buildNumber,
    category: input.category,
    contact_allowed: input.contactAllowed,
    error_code: input.context.errorCode,
    message: input.message.trim(),
    os_version: input.context.osVersion,
    platform: input.context.platform,
    source_screen: input.context.sourceScreen,
    user_id: input.userId,
  };

  const { data, error } = await supabase
    .from('feedback_reports')
    .insert(report)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export function getFeedbackErrorMessage(error?: unknown) {
  if (error instanceof FeedbackOfflineError) {
    return 'You’re offline. Your message is still here—reconnect and try again.';
  }

  return 'Could not send feedback. Your message is still here—try again.';
}
