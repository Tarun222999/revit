import {
  parseTitleShareUrl,
} from '@/features/sharing/model/titleShare';

type RouteDestination = {
  pathname: '/title/[id]';
  params: { id: string };
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Limits auth continuation to title-share URLs. This prevents the return
 * parameter from becoming an open navigation target.
 */
export function getPendingAuthDestination(
  value: string | string[] | undefined,
): RouteDestination | null {
  const destination = firstParam(value);

  if (!destination) return null;

  try {
    const title = parseTitleShareUrl(destination);
    return { pathname: '/title/[id]', params: { id: title.id } };
  } catch {
    return null;
  }
}
