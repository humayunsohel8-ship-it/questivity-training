-- Business-rule and security tests. Run after migrations + seed (see .github/workflows/ci.yml).
-- Any failed assertion raises an exception and fails the run.
\set ON_ERROR_STOP 1

create or replace function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, false);
$$;

create or replace function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAILED: % (expected an error)', label;
exception when others then
  if sqlerrm like 'FAILED:%' then raise; end if;
  raise notice 'ok: % (%)', label, sqlerrm;
end $$;

grant execute on function pg_temp.as_user(uuid), pg_temp.expect_error(text, text) to authenticated;

-- ─── Sign-up rules ──────────────────────────────────────────────────
select pg_temp.expect_error($$insert into auth.users(email) values ('someone@gmail.com')$$, 'non-company domain blocked');

insert into auth.users(id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'learner@questivity.com', '{"full_name":"Test Learner"}'),
  ('22222222-2222-2222-2222-222222222222', 'admin@questivity.com', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'manager@questivity.com', '{}');
update public.profiles set role = 'admin' where email = 'admin@questivity.com';
update public.profiles set role = 'manager' where email = 'manager@questivity.com';
update public.profiles set manager_id = '33333333-3333-3333-3333-333333333333' where email = 'learner@questivity.com';

do $$ begin
  assert (select count(*) from public.enrollments where user_id = '11111111-1111-1111-1111-111111111111') = 3,
    'new joiner should be auto-enrolled in the 3 onboarding courses';
  assert (select due_date from public.enrollments where user_id = '11111111-1111-1111-1111-111111111111' limit 1) = current_date + 30,
    'onboarding due date should be 30 days out';
end $$;

-- ─── Learner ────────────────────────────────────────────────────────
set role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');

select pg_temp.expect_error($$select correct_index from public.quiz_questions limit 1$$, 'learners cannot read quiz answers');
select pg_temp.expect_error($$update public.profiles set role = 'admin' where id = auth.uid()$$, 'learners cannot self-promote');
select pg_temp.expect_error($$select public.admin_overview()$$, 'learners cannot read admin reports');
select pg_temp.expect_error(
  $$select public.assign_path_to_user((select id from public.learning_paths where slug = 'network-engineer-track'), auth.uid())$$,
  'learners cannot assign paths');
select pg_temp.expect_error(
  $$insert into public.lesson_progress (user_id, lesson_id) select auth.uid(), id from public.lessons where kind = 'quiz' limit 1$$,
  'quiz lessons cannot be marked complete without passing');

do $$ begin
  assert (select count(*) from public.profiles) = 1, 'learner sees only own profile';
  assert (select count(*) from public.kb_articles where status <> 'published') = 0, 'drafts hidden from learners';
end $$;

-- Complete the orientation course
insert into public.lesson_progress (user_id, lesson_id)
select auth.uid(), id from public.lessons
where course_id = (select id from public.courses where slug = 'welcome-to-questivity') and kind <> 'quiz';

do $$
declare r jsonb;
begin
  r := public.submit_quiz((select id from public.lessons where title = 'Orientation quiz'), '{0,0,0,0,0}');
  assert (r ->> 'passed')::boolean = false, 'wrong answers should fail';
  assert not (r -> 'results' -> 0 ? 'correct_index'), 'answers must not be revealed on a failed attempt';
  r := public.submit_quiz((select id from public.lessons where title = 'Orientation quiz'), '{1,2,1,0,1}');
  assert (r ->> 'score')::int = 100, 'correct answers should score 100';
  assert (select e.status from public.enrollments e join public.courses c on c.id = e.course_id
          where c.slug = 'welcome-to-questivity' and e.user_id = auth.uid()) = 'completed', 'course should be completed';
  assert (select count(*) from public.certificates where user_id = auth.uid()) = 1, 'certificate should be issued';
end $$;

-- Knowledge retrieval respects publication status
do $$ begin
  assert (select slug from public.search_kb_chunks('how long keep vmware snapshot', 1)) = 'vmware-snapshot-best-practices',
    'search should find the snapshot runbook';
  assert not exists (select 1 from public.search_kb_chunks('annual leave sick leave', 10) where slug = 'leave-and-holidays'),
    'draft articles must never reach the assistant';
end $$;

-- Assistant privacy and feedback-only updates
insert into public.assistant_conversations (id, user_id, title) values ('44444444-4444-4444-4444-444444444444', auth.uid(), 'test');
insert into public.assistant_messages (conversation_id, user_id, role, content, answered_from_kb)
values ('44444444-4444-4444-4444-444444444444', auth.uid(), 'assistant', 'answer', false);
update public.assistant_messages set feedback = -1 where conversation_id = '44444444-4444-4444-4444-444444444444';
select pg_temp.expect_error($$update public.assistant_messages set content = 'edited'$$, 'users can only change feedback');

-- ─── Manager ────────────────────────────────────────────────────────
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
do $$ begin
  assert public.assign_path_to_user((select id from public.learning_paths where slug = 'network-engineer-track'),
                                    '11111111-1111-1111-1111-111111111111') = 3, 'manager can assign to a report';
  assert (select count(*) from public.enrollments where user_id = '11111111-1111-1111-1111-111111111111') = 6, 'manager sees report enrolments';
  assert (select count(*) from public.assistant_messages) = 0, 'manager cannot read report chats';
end $$;

-- ─── Admin ──────────────────────────────────────────────────────────
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
do $$ begin
  assert (public.admin_overview() ->> 'certificates')::int = 1, 'admin overview counts certificates';
  assert (select count(*) from public.admin_content_gaps(10)) = 1, 'unanswered question appears as a content gap';
  assert (select count(*) from public.kb_articles where status = 'draft') = 2, 'admins see drafts';
end $$;

reset role;
\echo 'All business-rule tests passed.'
