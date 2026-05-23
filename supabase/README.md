# Supabase

Supabase project assets live here.

Expected structure:

```text
supabase/
  migrations/
  functions/
  seed/
```

Use SQL migrations and generated TypeScript database types. Do not introduce an ORM for v1.

## Generate Database Types

After applying a schema migration to the Supabase project, regenerate the app database types:

```text
npx supabase gen types typescript --project-id <project-ref> --schema public > lib/supabase/types.ts
```

The project ref is the first subdomain in the Supabase URL:

```text
https://<project-ref>.supabase.co
```

Run `npm run typecheck` after regenerating types.
