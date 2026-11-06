import Image from "next/image";
import type { Metadata } from "next";
import { GraduationCap, BookOpenText, Bot } from "lucide-react";
import { brand } from "@/config/brand";
import { LoginForm } from "./login-form";
import { signInWithMicrosoft, signOut } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  auth: "That sign-in link is invalid, has expired or was already used (company email scanners sometimes open links first). Request a new email and enter the 6-digit code instead.",
  sso: "Microsoft sign-in isn't available right now.",
  inactive: "Your account has been deactivated. Contact your administrator.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/dashboard", error } = await searchParams;
  const microsoftEnabled = process.env.NEXT_PUBLIC_ENABLE_MICROSOFT_SSO === "true";

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-dark p-12 text-white lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgb(var(--brand-accent)) 0, transparent 35%), radial-gradient(circle at 80% 70%, rgb(var(--brand-primary)) 0, transparent 45%)" }}
        />
        <Image src="/brand/logo-white.svg" alt={brand.product} width={220} height={41} priority className="relative" />
        <div className="relative space-y-8">
          <h1 className="font-display text-4xl font-bold leading-tight">
            {brand.tagline}
          </h1>
          <ul className="space-y-5 text-white/85">
            <li className="flex gap-3"><GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" /> Structured learning paths for new joinees and every technical track</li>
            <li className="flex gap-3"><BookOpenText className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" /> One knowledge base for processes, runbooks and policies</li>
            <li className="flex gap-3"><Bot className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" /> {brand.assistantName}: instant answers from our knowledge base, with sources</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} {brand.company} · Internal use only</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <Image src="/brand/logo.svg" alt={brand.product} width={200} height={37} priority />
          </div>
          <div>
            <h2 className="page-title">Sign in</h2>
            <p className="mt-1 text-sm text-brand-muted">Use your {brand.company} work account.</p>
          </div>

          {error && ERRORS[error] && <p className="rounded-brand bg-red-50 p-3 text-sm text-red-700">{ERRORS[error]}</p>}
          {error === "inactive" && (
            <form action={signOut}>
              <button className="btn-ghost w-full">Sign out</button>
            </form>
          )}

          {microsoftEnabled && (
            <>
              <form action={signInWithMicrosoft}>
                <input type="hidden" name="next" value={next} />
                <button className="btn-ghost w-full">
                  <svg aria-hidden viewBox="0 0 21 21" className="h-4 w-4"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
                  Sign in with Microsoft
                </button>
              </form>
              <div className="flex items-center gap-3 text-xs uppercase text-brand-muted">
                <span className="h-px flex-1 bg-brand-line" /> or <span className="h-px flex-1 bg-brand-line" />
              </div>
            </>
          )}

          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
