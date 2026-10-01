import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseTitleShareId,
  parseTitleShareUrl,
} from '@/features/sharing/model/titleShare';

const PENDING_AUTH_RETURN_TO_STORAGE_KEY = 'revit.pending-auth-return-to';

type RouteDestination = {
  pathname: '/title/[id]';
  params: { id: string };
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function canonicalTitleShareUrl(titleId: string) {
  return `revit://title/${encodeURIComponent(titleId)}`;
}

/**
 * Returns only a canonical title URL suitable for carrying through auth.
 * Keeping this representation canonical prevents an auth-route parameter
 * from becoming a general-purpose navigation target.
 */
export function getPendingAuthReturnTo(
  value: string | string[] | undefined,
) {
  const destination = firstParam(value);

  if (!destination) return null;

  try {
    return canonicalTitleShareUrl(parseTitleShareUrl(destination).id);
  } catch {
    return null;
  }
}

/** Builds a canonical continuation from a valid public title route. */
export function getSharedTitleAuthReturnTo(pathname: string) {
  const match = /^\/title\/([^/]+)$/.exec(pathname);
  if (!match) return null;

  try {
    return canonicalTitleShareUrl(parseTitleShareId(decodeURIComponent(match[1])).id);
  } catch {
    return null;
  }
}

/**
 * Persists only a validated canonical URL for email-link auth, whose callback
 * may open in a fresh app process without the original route parameters.
 */
export async function storePendingAuthReturnTo(
  value: string | string[] | undefined,
) {
  const destination = getPendingAuthReturnTo(value);

  if (destination) {
    await AsyncStorage.setItem(PENDING_AUTH_RETURN_TO_STORAGE_KEY, destination);
  } else {
    await AsyncStorage.removeItem(PENDING_AUTH_RETURN_TO_STORAGE_KEY);
  }

  return destination;
}

export async function getStoredPendingAuthReturnTo() {
  try {
    const destination = await AsyncStorage.getItem(PENDING_AUTH_RETURN_TO_STORAGE_KEY);
    const canonicalDestination = getPendingAuthReturnTo(destination ?? undefined);

    if (!canonicalDestination && destination) {
      await AsyncStorage.removeItem(PENDING_AUTH_RETURN_TO_STORAGE_KEY);
    }

    return canonicalDestination;
  } catch {
    return null;
  }
}

export async function clearPendingAuthReturnTo() {
  await AsyncStorage.removeItem(PENDING_AUTH_RETURN_TO_STORAGE_KEY);
}

/** A storage failure must not turn a completed sign-in into an app error. */
export function clearPendingAuthReturnToSafely() {
  return clearPendingAuthReturnTo().catch(() => undefined);
}

/**
 * Limits auth continuation to title-share URLs. This prevents the return
 * parameter from becoming an open navigation target.
 */
export function getPendingAuthDestination(
  value: string | string[] | undefined,
): RouteDestination | null {
  const destination = getPendingAuthReturnTo(value);
  if (!destination) return null;

  try {
    const title = parseTitleShareUrl(destination);
    return { pathname: '/title/[id]', params: { id: title.id } };
  } catch {
    return null;
  }
}
