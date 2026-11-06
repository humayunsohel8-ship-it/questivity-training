import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";
import { updateName } from "./actions";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const profile = await requireProfile();
  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="My account" description={profile.email} />

      <section className="card space-y-4 p-6">
        <h2 className="section-title">Profile</h2>
        <form action={updateName} className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Full name</label><input name="full_name" defaultValue={profile.full_name ?? ""} className="input" /></div>
          <div><label className="label">Job title</label><input name="job_title" defaultValue={profile.job_title ?? ""} className="input" /></div>
          <div className="sm:col-span-2"><button className="btn-ghost">Save profile</button></div>
        </form>
        <p className="text-xs text-brand-muted">
          Role: <b>{profile.role}</b>{profile.departments?.name && <> · Department: <b>{profile.departments.name}</b></>}. Ask an administrator to change these.
        </p>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="section-title">Password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
