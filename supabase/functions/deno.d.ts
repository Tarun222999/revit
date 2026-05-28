declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module 'npm:@supabase/supabase-js@2.106.1' {
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
      select: (columns?: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          maybeSingle: () => Promise<{
            data: unknown;
            error: unknown;
          }>;
        };
        single: () => Promise<{
          data: unknown;
          error: unknown;
        }>;
      };
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
