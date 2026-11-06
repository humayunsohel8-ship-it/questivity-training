-- Optional AI answers for Quest Assistant.
-- OFF (default): the assistant answers in search mode — the most relevant knowledge-base sections with links.
-- ON: answers are written by Claude from those sections (requires ANTHROPIC_API_KEY in the hosting environment).
alter table public.org_settings
  add column if not exists ai_assistant_enabled boolean not null default false;
