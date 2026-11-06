"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type LoginState = { step: "email" | "code"; email?: string; error?: string; message?: string; next?: string };

const Email = z.string().trim().toLowerCase().email();

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function sendCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const next = safeNext(String(formData.get("next") || ""));
  const parsed = Email.safeParse(formData.get("email"));
  if (!parsed.success) return { step: "email", error: "Enter a valid email address.", next };
  const email = parsed.data;

  const domains = env.allowedDomains();
  if (domains.length && !domains.includes(email.split("@")[1])) {
    return { step: "email", error: `Please use your company email (${domains.map((d) => "@" + d).join(", ")}).`, next };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${env.siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    console.error("signInWithOtp", error.message);
    return { step: "email", error: "We couldn't send a sign-in email. Check the address or try again shortly.", next };
  }
  return {
    step: "code",
    email,
    next,
    message: "Check your inbox and click the sign-in link. Open it in this same browser. If your email shows a 6-digit code instead, enter it below.",
  };
}

export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "");
  const token = String(formData.get("token") || "").replace(/\s/g, "");
  const next = safeNext(String(formData.get("next") || ""));
  if (!/^\d{6,10}$/.test(token)) return { step: "code", email, next, error: "Enter the code from the email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "code", email, next, error: "That code is invalid or has expired. Request a new one." };
  redirect(next);
}

export async function signInWithMicrosoft(formData: FormData) {
  const next = safeNext(String(formData.get("next") || ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      scopes: "email openid profile",
      redirectTo: `${env.siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect("/login?error=sso");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
