export function getProfileErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function isDuplicateProfileError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return message.toLowerCase().includes('duplicate') || message.includes('23505');
}
