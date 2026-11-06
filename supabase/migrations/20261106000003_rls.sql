-- ════════════════════════════════════════════════════════════════════
-- Questivity Academy — row level security
-- Every table is locked down; access is granted per role below.
-- ════════════════════════════════════════════════════════════════════

alter table public.org_settings enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.kb_categories enable row level security;
alter table public.kb_articles enable row level security;
alter table public.kb_chunks enable row level security;
alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;

-- ─── Organisation ───────────────────────────────────────────────────
create policy "settings readable" on public.org_settings for select to authenticated using (true);
create policy "settings admin write" on public.org_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "departments readable" on public.departments for select to authenticated using (true);
create policy "departments admin write" on public.departments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "profiles read own/team/admin" on public.profiles for select to authenticated
  using (id = auth.uid() or manager_id = auth.uid() or public.is_admin());
create policy "profiles update own or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- (role/department/manager changes by non-admins are blocked by trg_profiles_guard)

-- ─── Course content ─────────────────────────────────────────────────
create policy "courses read published" on public.courses for select to authenticated
  using (status = 'published' or public.is_admin());
create policy "courses admin write" on public.courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "modules read" on public.course_modules for select to authenticated
  using (public.can_view_course(course_id));
create policy "modules admin write" on public.course_modules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "lessons read" on public.lessons for select to authenticated
  using (public.can_view_course(course_id));
create policy "lessons admin write" on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "quiz read" on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and public.can_view_course(l.course_id)));
create policy "quiz admin write" on public.quiz_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Learners must never receive correct answers: hide the column from the API role.
-- Admin screens read answers through the server-side service client.
revoke select on public.quiz_questions from authenticated;
grant select (id, lesson_id, prompt, options, position) on public.quiz_questions to authenticated;

create policy "paths read" on public.learning_paths for select to authenticated
  using (status = 'published' or public.is_admin());
create policy "paths admin write" on public.learning_paths for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "path courses read" on public.learning_path_courses for select to authenticated using (true);
create policy "path courses admin write" on public.learning_path_courses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── Learner records ────────────────────────────────────────────────
create policy "enrollments read" on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin());
create policy "enrollments admin write" on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Learners enrol through enroll_self(); managers assign through assign_path_to_user().

create policy "progress read" on public.lesson_progress for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin());
create policy "progress insert own non-quiz" on public.lesson_progress for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_id and l.kind <> 'quiz' and public.can_view_course(l.course_id)
    )
  );

create policy "attempts read" on public.quiz_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin());
-- inserts only via submit_quiz()

create policy "certificates read" on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin());
-- inserts only via sync_course_completion()

-- ─── Knowledge base ─────────────────────────────────────────────────
create policy "kb categories read" on public.kb_categories for select to authenticated using (true);
create policy "kb categories admin write" on public.kb_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "kb read published" on public.kb_articles for select to authenticated
  using (status = 'published' or public.is_admin());
create policy "kb admin write" on public.kb_articles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "kb chunks read" on public.kb_chunks for select to authenticated
  using (exists (select 1 from public.kb_articles a where a.id = article_id and (a.status = 'published' or public.is_admin())));

-- ─── Assistant (private to each user; admins see aggregates via RPC) ─
create policy "conversations own" on public.assistant_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "messages read own" on public.assistant_messages for select to authenticated
  using (user_id = auth.uid());
create policy "messages insert own" on public.assistant_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.assistant_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
create policy "messages feedback own" on public.assistant_messages for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Users may only change the feedback column on their own messages.
revoke update on public.assistant_messages from authenticated;
grant update (feedback) on public.assistant_messages to authenticated;
