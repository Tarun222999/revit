-- `rls_auto_enable` is an internal SECURITY DEFINER helper that must not be
-- callable through the public Data API. It was created outside migration
-- history, so tolerate environments where it is absent.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
  end if;
end;
$$;
