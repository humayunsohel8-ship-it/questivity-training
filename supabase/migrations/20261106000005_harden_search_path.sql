-- Pin search_path on the two remaining helper functions (Supabase security advisor 0011).
alter function public.touch_updated_at() set search_path = public;
alter function public.chunk_markdown(text, int) set search_path = public;
