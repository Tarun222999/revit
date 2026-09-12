create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  message text not null,
  source_screen text,
  error_code text,
  app_version text,
  build_number text,
  platform text,
  os_version text,
  contact_allowed boolean not null default false,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint feedback_reports_category_check
    check (category in ('bug', 'feature_idea', 'other')),
  constraint feedback_reports_message_length_check
    check (char_length(btrim(message)) between 1 and 1200),
  constraint feedback_reports_source_screen_length_check
    check (source_screen is null or char_length(source_screen) <= 120),
  constraint feedback_reports_error_code_length_check
    check (error_code is null or char_length(error_code) <= 80),
  constraint feedback_reports_app_version_length_check
    check (app_version is null or char_length(app_version) <= 40),
  constraint feedback_reports_build_number_length_check
    check (build_number is null or char_length(build_number) <= 40),
  constraint feedback_reports_platform_length_check
    check (platform is null or char_length(platform) <= 20),
  constraint feedback_reports_os_version_length_check
    check (os_version is null or char_length(os_version) <= 80),
  constraint feedback_reports_status_check
    check (status in ('new', 'reviewed', 'planned', 'closed'))
);

create index feedback_reports_user_id_created_at_idx
  on public.feedback_reports (user_id, created_at desc);

alter table public.feedback_reports enable row level security;

revoke all on table public.feedback_reports from anon, authenticated;
grant select (id) on table public.feedback_reports to authenticated;
grant insert (
  user_id,
  category,
  message,
  source_screen,
  error_code,
  app_version,
  build_number,
  platform,
  os_version,
  contact_allowed
) on table public.feedback_reports to authenticated;

create policy "Users can create their own feedback reports"
on public.feedback_reports
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can receive their own feedback receipt"
on public.feedback_reports
for select
to authenticated
using ((select auth.uid()) = user_id);
