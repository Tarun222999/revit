const KEY_PATTERN = /^[a-f0-9]{64}$/;

export function parseListShareKey(value: string) {
  if (!KEY_PATTERN.test(value))
    throw new Error('This list link is unavailable.');
  return value;
}

export function createListShareUrl(key: string) {
  return `revit://shared/list/${parseListShareKey(key)}`;
}

export function parseListShareUrl(value: string) {
  // Match the raw URL too: URL normalization must not accept dot segments,
  // credentials, encoded slashes, ports, or trailing query/fragment delimiters.
  const match = /^revit:\/\/shared\/list\/([a-f0-9]{64})$/.exec(value);
  if (!match) throw new Error('This list link is unavailable.');
  return parseListShareKey(match[1]);
}

export function isPotentialListSharePath(pathname: string) {
  return pathname === '/shared/list' || pathname.startsWith('/shared/list/');
}

export function getSharedListAuthReturnTo(pathname: string) {
  const match = /^\/shared\/list\/([a-f0-9]{64})$/.exec(pathname);
  return match ? createListShareUrl(match[1]) : null;
}
