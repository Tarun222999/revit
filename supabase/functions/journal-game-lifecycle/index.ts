import { createServiceClient, requireAuth } from '../_shared/auth.ts';
import { requireGamesFeatureEnabled } from '../_shared/app-capabilities.ts';
import { createJournalGameLifecycleHandler } from '../_shared/journal-game-lifecycle-handler.ts';

const service = createServiceClient();

Deno.serve(createJournalGameLifecycleHandler({
  requireAuth,
  requireGamesEnabled: requireGamesFeatureEnabled,
  rpc: (name, args) => service.rpc(name, args),
}));
