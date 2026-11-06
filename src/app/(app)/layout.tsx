import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AssistantLauncher } from "@/components/assistant/launcher";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
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
