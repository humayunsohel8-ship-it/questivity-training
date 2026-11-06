-- Password-based accounts created by admins: force a password change on first sign-in.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Only admins / server-side code may change the flag (users clear it by setting a new password,
-- which the server does on their behalf).
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.department_id is distinct from old.department_id
       or new.manager_id is distinct from old.manager_id
       or new.is_active is distinct from old.is_active
       or new.must_change_password is distinct from old.must_change_password then
      raise exception 'Only administrators can change role, email, department, manager, status or password flags'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
