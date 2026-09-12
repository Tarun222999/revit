import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_ERROR_CODES,
  FEEDBACK_SOURCES,
  type FeedbackCategory,
  type FeedbackContext,
  type FeedbackErrorCode,
  type FeedbackSource,
} from '@/features/feedback/types';

export const FEEDBACK_MESSAGE_MAX_LENGTH = 1200;

const CATEGORY_COPY: Record<
  FeedbackCategory,
  { label: string; prompt: string; placeholder: string }
> = {
  bug: {
    label: 'Bug',
    prompt: 'Tell us what happened',
    placeholder: 'What were you trying to do, and what happened instead?',
  },
  feature_idea: {
    label: 'Feature idea',
    prompt: 'What would make Revit better?',
    placeholder: 'Describe the idea and when it would be useful to you.',
  },
  other: {
    label: 'Other',
    prompt: 'What would you like us to know?',
    placeholder: 'Share your feedback.',
  },
};

const SOURCE_LABELS: Record<FeedbackSource, string> = {
  help_feedback: 'Help & Feedback',
  journal_planner: 'Journal · Planner',
};

function optionalString(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function isFeedbackCategory(value?: string): value is FeedbackCategory {
  return FEEDBACK_CATEGORIES.includes(value as FeedbackCategory);
}

export function isFeedbackSource(value?: string): value is FeedbackSource {
  return FEEDBACK_SOURCES.includes(value as FeedbackSource);
}

export function isFeedbackErrorCode(value?: string): value is FeedbackErrorCode {
  return FEEDBACK_ERROR_CODES.includes(value as FeedbackErrorCode);
}

export function getFeedbackCategoryCopy(category: FeedbackCategory) {
  return CATEGORY_COPY[category];
}

export function getFeedbackSourceLabel(source: FeedbackSource) {
  return SOURCE_LABELS[source];
}

export function validateFeedbackMessage(message: string) {
  const normalized = message.trim();

  if (!normalized) return 'Tell us what happened or what you would like to improve.';
  if (normalized.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
    return `Keep feedback to ${FEEDBACK_MESSAGE_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export function collectFeedbackContext({
  errorCode,
  sourceScreen,
}: {
  errorCode?: FeedbackErrorCode | null;
  sourceScreen: FeedbackSource;
}): FeedbackContext {
  const configBuildNumber = Platform.select({
    android: optionalString(Constants.expoConfig?.android?.versionCode, 40),
    ios: Constants.expoConfig?.ios?.buildNumber,
    default: null,
  });
  const usesHostAppMetadata =
    Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient';
  const appVersion = usesHostAppMetadata
    ? Constants.expoConfig?.version
    : Application.nativeApplicationVersion ?? Constants.expoConfig?.version;
  const buildNumber = usesHostAppMetadata
    ? configBuildNumber
    : Application.nativeBuildVersion ?? configBuildNumber;

  return {
    appVersion: optionalString(appVersion, 40),
    buildNumber: optionalString(buildNumber, 40),
    errorCode: errorCode ?? null,
    osVersion: optionalString(Platform.Version, 80),
    platform: Platform.OS.slice(0, 20),
    sourceScreen,
  };
}

export function formatFeedbackReference(id: string) {
  return `RV-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}
