import type { Tables, TablesInsert } from '@/lib/supabase/types';

export const FEEDBACK_CATEGORIES = ['bug', 'feature_idea', 'other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_SOURCES = ['help_feedback', 'journal_planner'] as const;
export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

export const FEEDBACK_ERROR_CODES = ['remove_plan_failed'] as const;
export type FeedbackErrorCode = (typeof FEEDBACK_ERROR_CODES)[number];

export type FeedbackContext = {
  appVersion: string | null;
  buildNumber: string | null;
  errorCode: FeedbackErrorCode | null;
  osVersion: string | null;
  platform: string;
  sourceScreen: FeedbackSource;
};

export type SubmitFeedbackInput = {
  category: FeedbackCategory;
  contactAllowed: boolean;
  context: FeedbackContext;
  message: string;
  userId: string;
};

export type FeedbackReportRow = Tables<'feedback_reports'>;
export type FeedbackReportInsert = TablesInsert<'feedback_reports'>;
