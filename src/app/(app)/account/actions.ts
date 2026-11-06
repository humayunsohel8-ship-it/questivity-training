"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";

export type PasswordChangeState = { error?: string; ok?: boolean };

const MIN_PASSWORD = 10;

/** Signed-in user sets a new password for themselves. */
export async function changePassword(_prev: PasswordChangeState, fd: FormData): Promise<PasswordChangeState> {
  const profile = await requireProfile();
  const password = String(fd.get("password") || "");
  const confirm = String(fd.get("confirm") || "");

  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters.` };
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return { error: "Use a mix of letters and numbers." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different from the old/i.test(error.message)) return { error: "Choose a password different from your current one." };
    return { error: "Couldn't update your password. Please try again." };
  }

  // Clear the "must change password" flag (server-side; users can't edit this flag directly).
  await createAdminClient().from("profiles").update({ must_change_password: false }).eq("id", profile.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateName(fd: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ full_name: String(fd.get("full_name") || "").trim() || null, job_title: String(fd.get("job_title") || "").trim() || null })
    .eq("id", profile.id);
  revalidatePath("/", "layout");
}
