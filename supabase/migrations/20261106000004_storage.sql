-- ════════════════════════════════════════════════════════════════════
-- Questivity Academy — private storage for course media (videos, PDFs, images)
-- Files are served to signed-in users through short-lived signed URLs.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-media', 'course-media', false, 524288000)  -- 500 MB per file
on conflict (id) do nothing;

create policy "course media read (signed-in)" on storage.objects for select to authenticated
  using (bucket_id = 'course-media');

create policy "course media admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'course-media' and public.is_admin());

create policy "course media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'course-media' and public.is_admin());

create policy "course media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'course-media' and public.is_admin());
