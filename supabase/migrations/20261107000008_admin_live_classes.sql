-- ════════════════════════════════════════════════════════════════════
-- Admin console v2: announcements, live classes (with Outlook invites),
-- shared links/resources, learner reporting.
-- ════════════════════════════════════════════════════════════════════

-- ─── Shared links on courses ("Resources") ──────────────────────────
alter table public.courses add column if not exists resources jsonb not null default '[]'
  check (jsonb_typeof(resources) = 'array');

-- ─── Announcements ─────────────────────────────────────────────────
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_md text not null default '',
  department_id uuid references public.departments (id) on delete cascade, -- null = everyone
  pinned boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists announcements_active_idx on public.announcements (starts_at desc);
alter table public.announcements enable row level security;

create policy "announcements read" on public.announcements for select to authenticated
  using (
    public.is_admin()
    or (
      starts_at <= now() and (ends_at is null or ends_at > now())
      and (department_id is null or department_id = (select p.department_id from public.profiles p where p.id = auth.uid()))
    )
  );
create policy "announcements admin write" on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── Live classes ───────────────────────────────────────────────────
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  course_id uuid references public.courses (id) on delete set null,
  host_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_url text,             -- Teams / Zoom / Webex join link
  location text,                -- room or "Online"
  audience text not null default 'all' check (audience in ('all', 'department', 'selected')),
  department_id uuid references public.departments (id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  recording_url text,
  links jsonb not null default '[]' check (jsonb_typeof(links) = 'array'), -- [{title,url}]
  outlook_event_id text,        -- set when invites were sent through Microsoft 365
  invites_sent_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists live_sessions_starts_idx on public.live_sessions (starts_at);
create trigger trg_live_sessions_touch before update on public.live_sessions
  for each row execute function public.touch_updated_at();

create table if not exists public.live_session_invitees (
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (session_id, user_id)
);

create table if not exists public.live_session_attendance (
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.live_sessions enable row level security;
alter table public.live_session_invitees enable row level security;
alter table public.live_session_attendance enable row level security;

create or replace function public.can_see_session(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.live_sessions s
    where s.id = target and (
      s.audience = 'all'
      or (s.audience = 'department' and s.department_id = (select p.department_id from public.profiles p where p.id = auth.uid()))
      or (s.audience = 'selected' and exists (
            select 1 from public.live_session_invitees i where i.session_id = s.id and i.user_id = auth.uid()))
    )
  )
$$;

create policy "sessions read" on public.live_sessions for select to authenticated
  using (public.can_see_session(id));
create policy "sessions admin write" on public.live_sessions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "invitees read" on public.live_session_invitees for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "invitees admin write" on public.live_session_invitees for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "attendance read" on public.live_session_attendance for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin());
create policy "attendance insert own" on public.live_session_attendance for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_session(session_id));

-- Everyone invited to a session (resolved from its audience), for invites and reports.
create or replace function public.session_audience(target uuid)
returns table (user_id uuid, email text, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name
  from public.live_sessions s
  join public.profiles p on p.is_active
  where s.id = target and public.is_admin() and (
    s.audience = 'all'
    or (s.audience = 'department' and p.department_id = s.department_id)
    or (s.audience = 'selected' and exists (
          select 1 from public.live_session_invitees i where i.session_id = s.id and i.user_id = p.id))
  )
  order by p.full_name nulls last, p.email
$$;

-- ─── Learner reporting ──────────────────────────────────────────────
create or replace function public.admin_learner_stats()
returns table (
  user_id uuid, email text, full_name text, role public.user_role, department text, is_active boolean,
  enrolled bigint, completed bigint, in_progress bigint, overdue bigint, certificates bigint,
  avg_quiz_score numeric, last_activity timestamptz, joined_on date
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select p.id, p.email, p.full_name, p.role, d.name, p.is_active,
    (select count(*) from public.enrollments e where e.user_id = p.id),
    (select count(*) from public.enrollments e where e.user_id = p.id and e.status = 'completed'),
    (select count(*) from public.enrollments e where e.user_id = p.id and e.status = 'in_progress'),
    (select count(*) from public.enrollments e where e.user_id = p.id and e.status <> 'completed' and e.due_date < current_date),
    (select count(*) from public.certificates c where c.user_id = p.id),
    (select round(avg(q.score), 1) from public.quiz_attempts q where q.user_id = p.id),
    greatest(
      (select max(lp.completed_at) from public.lesson_progress lp where lp.user_id = p.id),
      (select max(q.created_at) from public.quiz_attempts q where q.user_id = p.id),
      (select max(a.joined_at) from public.live_session_attendance a where a.user_id = p.id)
    ),
    p.joined_on
  from public.profiles p
  left join public.departments d on d.id = p.department_id
  order by p.full_name nulls last, p.email;
end $$;

-- Mandatory-course compliance by department.
create or replace function public.admin_department_compliance()
returns table (department text, learners bigint, mandatory_assigned bigint, mandatory_completed bigint, overdue bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select coalesce(d.name, 'No department'),
    count(distinct p.id),
    count(e.id),
    count(e.id) filter (where e.status = 'completed'),
    count(e.id) filter (where e.status <> 'completed' and e.due_date < current_date)
  from public.profiles p
  left join public.departments d on d.id = p.department_id
  left join public.enrollments e on e.user_id = p.id
    and e.course_id in (select c.id from public.courses c where c.is_mandatory)
  where p.is_active
  group by d.name
  order by 1;
end $$;

revoke execute on function public.can_see_session(uuid), public.session_audience(uuid),
  public.admin_learner_stats(), public.admin_department_compliance() from public, anon;
grant execute on function public.can_see_session(uuid), public.session_audience(uuid),
  public.admin_learner_stats(), public.admin_department_compliance() to authenticated;

-- Admin-uploaded media library lives in the existing private "course-media" bucket.
