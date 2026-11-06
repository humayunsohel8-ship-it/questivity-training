-- ════════════════════════════════════════════════════════════════════
-- Questivity LMS — core schema
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────
create type public.user_role as enum ('learner', 'manager', 'admin');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.lesson_kind as enum ('article', 'video', 'pdf', 'quiz');
create type public.enrollment_status as enum ('assigned', 'in_progress', 'completed');

-- ─── Organisation ───────────────────────────────────────────────────
create table public.org_settings (
  id boolean primary key default true check (id), -- single-row table
  allowed_email_domains text[] not null default '{}',
  quiz_pass_mark int not null default 70 check (quiz_pass_mark between 0 and 100),
  updated_at timestamptz not null default now()
);
insert into public.org_settings (id) values (true);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  job_title text,
  role public.user_role not null default 'learner',
  department_id uuid references public.departments (id) on delete set null,
  manager_id uuid references public.profiles (id) on delete set null,
  joined_on date default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles (department_id);
create index on public.profiles (manager_id);

-- ─── Courses ────────────────────────────────────────────────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  description_md text not null default '',
  category text not null default 'General',
  level text not null default 'Beginner' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  cover_url text,
  duration_minutes int not null default 0,
  is_mandatory boolean not null default false,
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.courses (status);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.course_modules (course_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  kind public.lesson_kind not null default 'article',
  body_md text not null default '',
  media_url text,          -- storage path (course-media bucket) or external URL (YouTube/Vimeo/SharePoint)
  duration_minutes int not null default 5,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.lessons (module_id, position);
create index on public.lessons (course_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  correct_index int not null check (correct_index >= 0),
  explanation text not null default '',
  position int not null default 0
);
create index on public.quiz_questions (lesson_id, position);

-- ─── Learning paths ─────────────────────────────────────────────────
create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null default '',
  audience text not null default 'All employees',
  is_onboarding boolean not null default false, -- auto-assigned to new joinees
  default_due_days int not null default 30,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.learning_path_courses (
  path_id uuid not null references public.learning_paths (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  position int not null default 0,
  primary key (path_id, course_id)
);

-- ─── Learner records ────────────────────────────────────────────────
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  path_id uuid references public.learning_paths (id) on delete set null,
  assigned_by uuid references public.profiles (id) on delete set null,
  status public.enrollment_status not null default 'assigned',
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index on public.enrollments (course_id);
create index on public.enrollments (status, due_date);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index on public.lesson_progress (user_id, course_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  answers jsonb not null,
  score int not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts (user_id, lesson_id);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  serial text not null unique default ('QA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ─── Knowledge base ─────────────────────────────────────────────────
create table public.kb_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  position int not null default 0
);

create table public.kb_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  body_md text not null default '',
  category_id uuid references public.kb_categories (id) on delete set null,
  tags text[] not null default '{}',
  status public.content_status not null default 'draft',
  author_id uuid references public.profiles (id) on delete set null,
  owner_team text,
  review_due date,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_md, '')), 'C')
  ) stored
);
create index kb_articles_search_idx on public.kb_articles using gin (search);
create index on public.kb_articles (status, category_id);

-- Chunks used for retrieval by the assistant (rebuilt automatically on save)
create table public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.kb_articles (id) on delete cascade,
  chunk_index int not null,
  heading text,
  content text not null,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(heading, '')), 'A') ||
    setweight(to_tsvector('english', content), 'B')
  ) stored,
  unique (article_id, chunk_index)
);
create index kb_chunks_search_idx on public.kb_chunks using gin (search);

-- ─── Assistant ──────────────────────────────────────────────────────
create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.assistant_conversations (user_id, updated_at desc);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb not null default '[]',
  answered_from_kb boolean,     -- false = assistant could not find an answer (content gap)
  feedback smallint check (feedback in (-1, 1)),
  created_at timestamptz not null default now()
);
create index on public.assistant_messages (conversation_id, created_at);
create index on public.assistant_messages (user_id, created_at desc);

-- ─── updated_at triggers ────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trg_courses_touch before update on public.courses for each row execute function public.touch_updated_at();
create trigger trg_lessons_touch before update on public.lessons for each row execute function public.touch_updated_at();
create trigger trg_kb_touch before update on public.kb_articles for each row execute function public.touch_updated_at();
