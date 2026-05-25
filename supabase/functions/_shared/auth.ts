import { createClient } from '@supabase/supabase-js';

import { HttpError } from './cors.ts';

export type AuthContext = {
  userId: string;
  userAccessToken: string;
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new HttpError(500, `Missing required server configuration: ${name}`);
  }

  return value;
}

export async function requireAuth(request: Request): Promise<AuthContext> {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication is required.');
  }

  const supabase = createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new HttpError(401, 'Authentication is required.');
  }

  return {
    userId: data.user.id,
    userAccessToken: authorization.replace('Bearer ', ''),
  };
}

export function createServiceClient() {
  return createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
      },
    },
  );
}
