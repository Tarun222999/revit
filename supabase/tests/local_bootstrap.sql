-- Minimal Supabase role/auth surface for isolated migration verification.
-- The hosted/local Supabase stack already supplies these objects.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

create schema if not exists auth;

do $$
begin
  if to_regclass('auth.users') is null then
    execute $create_users$
      create table auth.users (
        id uuid primary key,
        instance_id uuid,
        aud text,
        role text,
        email text,
        encrypted_password text,
        confirmed_at timestamptz,
        created_at timestamptz,
        updated_at timestamptz
      )
    $create_users$;
  end if;

  if to_regprocedure('auth.uid()') is null then
    execute $create_uid$
      create function auth.uid()
      returns uuid
      language sql
      stable
      as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid'
    $create_uid$;
  end if;

  begin
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
