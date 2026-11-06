import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AssistantLauncher } from "@/components/assistant/launcher";
import { PasswordForm } from "@/components/password-form";
import { signOut } from "@/app/login/actions";
import { brand } from "@/config/brand";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  // Accounts created with a temporary password must set their own before using the platform.
  if (profile.must_change_password) {
    return (
      <main className="grid min-h-screen place-items-center bg-brand-surface p-6">
        <div className="card w-full max-w-md space-y-6 p-8">
          <div>
            <h1 className="page-title">Set your password</h1>
            <p className="mt-1 text-sm text-brand-muted">
              Welcome to {brand.product}, {profile.full_name || profile.email}. You signed in with a temporary password — please choose your own to continue.
            </p>
          </div>
          <PasswordForm submitLabel="Set password and continue" onDoneHref="/dashboard" />
          <form action={signOut}>
            <button className="text-sm text-brand-muted hover:underline">Sign out</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      name={profile.full_name || profile.email}
      email={profile.email}
      role={profile.role}
      signOut={signOut}
    >
      {children}
      <AssistantLauncher />
    </AppShell>
  );
}
