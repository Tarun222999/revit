import {
  errorResponse,
  handleOptions,
  HttpError,
  jsonResponse,
} from './cors.ts';
import {
  getAppCapabilities,
  type AppCapabilities,
} from './app-capabilities.ts';
import type { ReadEnvironment } from './app-capability-values.ts';

export function createAppCapabilitiesHandler(
  readEnvironment?: ReadEnvironment,
) {
  return (request: Request): Response => {
    const optionsResponse = handleOptions(request);

    if (optionsResponse) {
      return optionsResponse;
    }

    try {
      if (request.method !== 'POST') {
        throw new HttpError(405, 'Method not allowed.');
      }

      const capabilities: AppCapabilities = readEnvironment
        ? getAppCapabilities(readEnvironment)
        : getAppCapabilities();

      return jsonResponse(capabilities);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
