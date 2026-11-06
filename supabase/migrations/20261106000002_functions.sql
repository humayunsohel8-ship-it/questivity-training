-- ════════════════════════════════════════════════════════════════════
-- Questivity LMS — functions & triggers (business rules live here)
-- ════════════════════════════════════════════════════════════════════

-- ─── Role helpers (security definer so they can be used inside RLS) ──
create or replace function public.current_role_name() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and is_active), false)
$$;

create or replace function public.is_manager_of(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target and p.manager_id = auth.uid()
  )
$$;

create or replace function public.can_view_course(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.courses c where c.id = target and c.status = 'published'
  )
$$;

-- ─── Onboarding: enroll a user in every published onboarding path ──
create or replace function public.assign_path_to_user(
  p_path uuid, p_user uuid, p_due date default null, p_assigned_by uuid default null
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_due date;
  v_count int;
begin
  -- Only admins or the user's manager may assign (or internal calls with no session)
  if auth.uid() is not null and not (public.is_admin() or public.is_manager_of(p_user)) then
    raise exception 'Not allowed to assign learning paths to this user' using errcode = '42501';
  end if;

  select coalesce(p_due, current_date + lp.default_due_days) into v_due
  from public.learning_paths lp where lp.id = p_path;
  if not found then
    raise exception 'Learning path not found';
  end if;

  insert into public.enrollments (user_id, course_id, path_id, assigned_by, due_date)
  select p_user, lpc.course_id, p_path, coalesce(p_assigned_by, auth.uid()), v_due
  from public.learning_path_courses lpc
  join public.courses c on c.id = lpc.course_id and c.status = 'published'
  where lpc.path_id = p_path
  on conflict (user_id, course_id) do update
    set due_date = least(coalesce(public.enrollments.due_date, excluded.due_date), excluded.due_date),
        path_id = coalesce(public.enrollments.path_id, excluded.path_id);

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ─── New sign-ups: domain allow-list, profile, onboarding ──────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_domains text[];
  v_domain text := lower(split_part(new.email, '@', 2));
  v_path record;
begin
  select allowed_email_domains into v_domains from public.org_settings where id;
  if coalesce(array_length(v_domains, 1), 0) > 0
     and not (v_domain = any (select lower(d) from unnest(v_domains) d)) then
    raise exception 'Sign-ups are restricted to company email addresses';
  end if;

  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  for v_path in
    select id from public.learning_paths where is_onboarding and status = 'published'
  loop
    perform public.assign_path_to_user(v_path.id, new.id, null, null);
  end loop;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Prevent privilege escalation through profile self-edits ────────
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for server-side / service-role operations
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.department_id is distinct from old.department_id
       or new.manager_id is distinct from old.manager_id
       or new.is_active is distinct from old.is_active then
      raise exception 'Only administrators can change role, email, department, manager or status'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ─── Course completion & certificates ───────────────────────────────
create or replace function public.sync_course_completion(p_user uuid, p_course uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_done int;
begin
  select count(*) into v_total from public.lessons where course_id = p_course;
  select count(*) into v_done
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    where lp.user_id = p_user and l.course_id = p_course;

  insert into public.enrollments (user_id, course_id, status, started_at)
  values (p_user, p_course, 'in_progress', now())
  on conflict (user_id, course_id) do nothing;

  if v_total > 0 and v_done >= v_total then
    update public.enrollments
      set status = 'completed',
          completed_at = coalesce(completed_at, now()),
          started_at = coalesce(started_at, now())
      where user_id = p_user and course_id = p_course;

    insert into public.certificates (user_id, course_id)
    values (p_user, p_course)
    on conflict (user_id, course_id) do nothing;
  else
    update public.enrollments
      set status = case when status = 'completed' then status else 'in_progress' end,
          started_at = coalesce(started_at, now())
      where user_id = p_user and course_id = p_course;
  end if;
end $$;

create or replace function public.on_lesson_progress() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_course_completion(new.user_id, new.course_id);
  return new;
end $$;

create trigger trg_lesson_progress_after after insert on public.lesson_progress
  for each row execute function public.on_lesson_progress();

-- Keep lesson_progress.course_id consistent with the lesson
create or replace function public.lesson_progress_fill_course() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select course_id into new.course_id from public.lessons where id = new.lesson_id;
  return new;
end $$;

create trigger trg_lesson_progress_before before insert on public.lesson_progress
  for each row execute function public.lesson_progress_fill_course();

-- ─── Self-enrolment ─────────────────────────────────────────────────
create or replace function public.enroll_self(p_course uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if not public.can_view_course(p_course) then raise exception 'Course not available'; end if;
  insert into public.enrollments (user_id, course_id, status, started_at)
  values (auth.uid(), p_course, 'in_progress', now())
  on conflict (user_id, course_id) do update
    set started_at = coalesce(public.enrollments.started_at, now()),
        status = case when public.enrollments.status = 'assigned' then 'in_progress'::public.enrollment_status
                      else public.enrollments.status end;
end $$;

-- ─── Quiz grading (answers never leave the database) ────────────────
create or replace function public.submit_quiz(p_lesson uuid, p_answers int[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_course uuid;
  v_kind public.lesson_kind;
  v_total int := 0;
  v_correct int := 0;
  v_score int;
  v_pass int;
  v_passed boolean;
  v_results jsonb := '[]'::jsonb;
  q record;
  i int := 0;
  v_given int;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  select course_id, kind into v_course, v_kind from public.lessons where id = p_lesson;
  if v_course is null or v_kind <> 'quiz' or not public.can_view_course(v_course) then
    raise exception 'Quiz not available';
  end if;

  select quiz_pass_mark into v_pass from public.org_settings where id;

  for q in select * from public.quiz_questions where lesson_id = p_lesson order by position, id loop
    i := i + 1;
    v_total := v_total + 1;
    v_given := p_answers[i];
    if v_given is not null and v_given = q.correct_index then
      v_correct := v_correct + 1;
    end if;
    v_results := v_results || jsonb_build_object(
      'question_id', q.id,
      'correct', v_given is not null and v_given = q.correct_index,
      'given', v_given,
      'explanation', q.explanation
    );
  end loop;

  if v_total = 0 then raise exception 'Quiz has no questions'; end if;

  v_score := round(100.0 * v_correct / v_total);
  v_passed := v_score >= coalesce(v_pass, 70);

  insert into public.quiz_attempts (user_id, lesson_id, answers, score, passed)
  values (auth.uid(), p_lesson, to_jsonb(p_answers), v_score, v_passed);

  if v_passed then
    insert into public.lesson_progress (user_id, lesson_id, course_id)
    values (auth.uid(), p_lesson, v_course)
    on conflict do nothing;
    -- reveal the correct answers only once the learner has passed
    select coalesce(jsonb_agg(r || jsonb_build_object('correct_index', qq.correct_index) order by ord), '[]'::jsonb)
      into v_results
      from jsonb_array_elements(v_results) with ordinality as t(r, ord)
      join public.quiz_questions qq on qq.id = (r ->> 'question_id')::uuid;
  end if;

  return jsonb_build_object(
    'score', v_score, 'passed', v_passed, 'correct', v_correct,
    'total', v_total, 'pass_mark', v_pass, 'results', v_results
  );
end $$;

-- ─── Knowledge base chunking ────────────────────────────────────────
-- Splits markdown into heading-aware chunks of roughly 400–1600 characters.
create or replace function public.chunk_markdown(p_body text, p_max int default 1400)
returns table (chunk_index int, heading text, content text)
language plpgsql immutable as $$
declare
  v_line text;
  v_heading text := null;
  v_buf text := '';
  v_idx int := 0;
begin
  foreach v_line in array regexp_split_to_array(coalesce(p_body, ''), E'\n') loop
    if v_line ~ '^#{1,4}\s+' then
      if length(btrim(v_buf)) > 0 then
        chunk_index := v_idx; heading := v_heading; content := btrim(v_buf);
        return next; v_idx := v_idx + 1;
      end if;
      v_heading := btrim(regexp_replace(v_line, '^#{1,4}\s+', ''));
      v_buf := '';
    else
      v_buf := v_buf || v_line || E'\n';
      if length(v_buf) >= p_max and btrim(v_line) = '' then
        chunk_index := v_idx; heading := v_heading; content := btrim(v_buf);
        return next; v_idx := v_idx + 1;
        v_buf := '';
      end if;
    end if;
  end loop;

  if length(btrim(v_buf)) > 0 then
    chunk_index := v_idx; heading := v_heading; content := btrim(v_buf);
    return next;
  end if;
end $$;

create or replace function public.rebuild_kb_chunks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.kb_chunks where article_id = new.id;
  insert into public.kb_chunks (article_id, chunk_index, heading, content)
  select new.id, c.chunk_index, coalesce(c.heading, new.title), c.content
  from public.chunk_markdown(new.body_md) c
  where length(c.content) > 0;
  return new;
end $$;

create trigger trg_kb_chunks
  after insert or update of body_md, title on public.kb_articles
  for each row execute function public.rebuild_kb_chunks();

-- ─── Knowledge retrieval for the assistant ──────────────────────────
-- Runs with the caller's permissions (RLS applies: only published articles).
-- Uses OR-matching so partial keyword overlap still retrieves, ranked by relevance.
create or replace function public.search_kb_chunks(p_query text, p_limit int default 6)
returns table (
  chunk_id uuid, article_id uuid, slug text, title text, heading text, content text, rank real
)
language plpgsql stable security invoker set search_path = public as $$
declare
  v_and tsquery := plainto_tsquery('english', coalesce(p_query, ''));
  v_or tsquery;
begin
  if v_and is null or numnode(v_and) = 0 then
    return;
  end if;
  v_or := replace(v_and::text, ' & ', ' | ')::tsquery;

  return query
  select c.id, a.id, a.slug, a.title, c.heading, c.content,
         (ts_rank_cd(c.search, v_or, 32) + 2 * ts_rank_cd(c.search, v_and, 32)
          + 0.5 * ts_rank_cd(a.search, v_or, 32))::real as rank
  from public.kb_chunks c
  join public.kb_articles a on a.id = c.article_id
  where a.status = 'published' and c.search @@ v_or
  order by 7 desc
  limit greatest(1, least(p_limit, 12));
end $$;

create or replace function public.increment_kb_view(p_slug text) returns void
language sql security definer set search_path = public as $$
  update public.kb_articles set views = views + 1 where slug = p_slug and status = 'published';
$$;

-- ─── Admin reporting ────────────────────────────────────────────────
create or replace function public.admin_course_stats()
returns table (
  course_id uuid, title text, status public.content_status, is_mandatory boolean,
  enrolled bigint, completed bigint, overdue bigint, avg_quiz_score numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select c.id, c.title, c.status, c.is_mandatory,
         count(e.id),
         count(e.id) filter (where e.status = 'completed'),
         count(e.id) filter (where e.status <> 'completed' and e.due_date < current_date),
         (select round(avg(qa.score), 1) from public.quiz_attempts qa
            join public.lessons l on l.id = qa.lesson_id where l.course_id = c.id)
  from public.courses c
  left join public.enrollments e on e.course_id = c.id
  group by c.id
  order by c.title;
end $$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'learners', (select count(*) from public.profiles where is_active),
    'courses_published', (select count(*) from public.courses where status = 'published'),
    'kb_published', (select count(*) from public.kb_articles where status = 'published'),
    'enrollments', (select count(*) from public.enrollments),
    'completed', (select count(*) from public.enrollments where status = 'completed'),
    'overdue', (select count(*) from public.enrollments where status <> 'completed' and due_date < current_date),
    'certificates', (select count(*) from public.certificates),
    'questions_30d', (select count(*) from public.assistant_messages where role = 'user' and created_at > now() - interval '30 days'),
    'unanswered_30d', (select count(*) from public.assistant_messages where role = 'assistant' and answered_from_kb = false and created_at > now() - interval '30 days'),
    'thumbs_down_30d', (select count(*) from public.assistant_messages where feedback = -1 and created_at > now() - interval '30 days')
  );
end $$;

-- Questions the assistant couldn't answer or that got a thumbs-down: the KB gap list.
create or replace function public.admin_content_gaps(p_limit int default 50)
returns table (asked_at timestamptz, question text, answer text, reason text, user_email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select a.created_at,
         (select u.content from public.assistant_messages u
           where u.conversation_id = a.conversation_id and u.role = 'user' and u.created_at <= a.created_at
           order by u.created_at desc limit 1),
         a.content,
         case when a.answered_from_kb = false then 'Not in knowledge base' else 'Thumbs down' end,
         p.email
  from public.assistant_messages a
  join public.profiles p on p.id = a.user_id
  where a.role = 'assistant' and (a.answered_from_kb = false or a.feedback = -1)
  order by a.created_at desc
  limit p_limit;
end $$;

-- Lock down: only the functions below are callable through the API.
-- (Supabase grants EXECUTE to anon/authenticated by default, so revoke explicitly.)
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.current_role_name(), public.is_admin(), public.is_manager_of(uuid), public.can_view_course(uuid),
  public.assign_path_to_user(uuid, uuid, date, uuid), public.enroll_self(uuid), public.submit_quiz(uuid, int[]),
  public.search_kb_chunks(text, int), public.increment_kb_view(text),
  public.admin_course_stats(), public.admin_overview(), public.admin_content_gaps(int)
to authenticated;
