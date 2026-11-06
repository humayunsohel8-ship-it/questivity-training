-- Promote the first administrator.
-- 1. Sign in to the app once with your work email (this creates your profile).
-- 2. Run this in Supabase → SQL Editor, replacing the email address.
update public.profiles
set role = 'admin'
where email = lower('your.name@questivity.com');

-- Check:
select email, full_name, role from public.profiles order by created_at;
