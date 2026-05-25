declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}
