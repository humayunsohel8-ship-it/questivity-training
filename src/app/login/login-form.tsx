"use client";

import { useActionState, useState } from "react";
import { Loader2, Mail, KeyRound, Lock } from "lucide-react";
import { sendCode, verifyCode, signInWithPassword, type LoginState, type PasswordState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [emailState, emailAction, sending] = useActionState<LoginState, FormData>(sendCode, { step: "email", next });
  const [codeState, codeAction, verifying] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });
  const [pwState, passwordAction, signingIn] = useActionState<PasswordState, FormData>(signInWithPassword, {});

  if (emailState.step === "code") {
    const error = codeState.error;
    return (
      <form action={codeAction} className="space-y-4">
        <p className="rounded-brand bg-brand-light/70 p-3 text-sm text-brand-dark">
          {emailState.message} <br />
          <span className="font-semibold">{emailState.email}</span>
        </p>
        <input type="hidden" name="email" value={emailState.email} />
        <input type="hidden" name="next" value={emailState.next ?? next} />
        <div>
          <label className="label" htmlFor="token">Sign-in code (only if your email has one)</label>
          <input id="token" name="token" inputMode="numeric" autoComplete="one-time-code" className="input text-center text-lg tracking-[0.4em]" placeholder="••••••" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={verifying}>
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Verify and sign in
        </button>
        <a href={`/login?next=${encodeURIComponent(next)}`} className="block text-center text-sm text-brand hover:underline">
          Use a different email
        </a>
      </form>
    );
  }

  if (mode === "password") {
    return (
      <form action={passwordAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="pw-email">Work email</label>
          <input id="pw-email" name="email" type="email" autoComplete="email" className="input" placeholder="you@questivity.com" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
        </div>
        {pwState.error && <p className="text-sm text-red-600">{pwState.error}</p>}
        <button className="btn-primary w-full" disabled={signingIn}>
          {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          Sign in
        </button>
        <button type="button" onClick={() => setMode("link")} className="block w-full text-center text-sm text-brand hover:underline">
          Email me a sign-in link instead
        </button>
      </form>
    );
  }

  return (
    <form action={emailAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" autoComplete="email" className="input" placeholder="you@questivity.com" required autoFocus />
      </div>
      {emailState.error && <p className="text-sm text-red-600">{emailState.error}</p>}
      <button className="btn-primary w-full" disabled={sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        Email me a sign-in link
      </button>
      <button type="button" onClick={() => setMode("password")} className="block w-full text-center text-sm text-brand hover:underline">
        Sign in with password
      </button>
    </form>
  );
}
