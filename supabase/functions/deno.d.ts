declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module 'npm:@supabase/supabase-js@2.106.1' {
  type QueryResult = Promise<{
    data: unknown;
    error: unknown;
  }>;

  type PostgrestFilterBuilder = {
    eq: (
      column: string,
      value: string | number | boolean,
    ) => PostgrestFilterBuilder;
    maybeSingle: () => QueryResult;
    single: () => QueryResult;
  };

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: {
      auth?: {
        persistSession?: boolean;
      };
      global?: {
        headers?: Record<string, string>;
      };
    },
  ): {
    auth: {
      getUser: () => Promise<{
        data: {
          user: {
            id: string;
          } | null;
        };
        error: unknown;
      }>;
    };
    from: (table: string) => {
      select: (columns?: string) => PostgrestFilterBuilder;
      upsert: (
        values: Record<string, unknown>,
        options?: {
          onConflict?: string;
        },
      ) => {
        select: (columns?: string) => {
          single: () => Promise<{
            data: unknown;
            error: unknown;
          }>;
        };
      };
    };
  };
}
