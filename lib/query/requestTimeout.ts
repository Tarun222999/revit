export const STARTUP_REQUEST_TIMEOUT_MS = 10 * 1000;

export class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestTimeoutError';
  }
}

export async function withRequestTimeout<T>(
  promise: PromiseLike<T>,
  message: string,
  timeoutMs = STARTUP_REQUEST_TIMEOUT_MS,
  onTimeout?: () => void,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.();
      reject(new RequestTimeoutError(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function isRequestTimeoutError(error: unknown): error is RequestTimeoutError {
  return error instanceof RequestTimeoutError;
}
