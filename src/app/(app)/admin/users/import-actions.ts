"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ImportResult = { email: string; name: string; password?: string; status: "created" | "skipped" | "error"; note?: string };
export type ImportState = { results?: ImportResult[]; error?: string };

/** Readable temporary password, e.g. "Qv7-taro-mesa-41" (no ambiguous characters). */
function tempPassword() {
  const words = ["atlas", "cedar", "delta", "ember", "fjord", "glade", "haven", "iris", "jade", "koala", "lumen", "mesa", "nova", "orbit", "pixel", "quartz", "river", "sable", "taro", "umber", "vista", "willow", "xenon", "yarrow", "zephyr"];
  const w = () => words[randomInt(words.length)];
  return `Qv${randomInt(2, 10)}-${w()}-${w()}-${randomInt(10, 100)}`;
}

/**
 * Lines: "Full name, email[, role][, department]". Role defaults to learner.
 * Each new user gets a random temporary password (shown once) and must change it at first sign-in.
 */
export async function bulkImportUsers(_prev: ImportState, fd: FormData): Promise<ImportState> {
  await requireAdmin();
  const text = String(fd.get("rows") || "");
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !/^name\s*,/i.test(l));
  if (!lines.length) return { error: "Paste at least one line: Full name, email" };
  if (lines.length > 200) return { error: "Import up to 200 people at a time." };

  const db = createAdminClient();
  const { data: depts } = await db.from("departments").select("id, name");
  const deptByName = new Map((depts ?? []).map((d) => [d.name.toLowerCase(), d.id as string]));
  const results: ImportResult[] = [];

  for (const line of lines) {
    const [nameRaw, emailRaw, roleRaw, deptRaw] = line.split(/[,\t;]/).map((s) => (s ?? "").trim());
    const name = nameRaw ?? "";
    const email = (emailRaw ?? "").toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      results.push({ email: emailRaw ?? line, name, status: "error", note: "Invalid email" });
      continue;
    }
    const role = ["learner", "manager", "admin"].includes((roleRaw ?? "").toLowerCase()) ? (roleRaw as string).toLowerCase() : "learner";
    const departmentId = deptRaw ? deptByName.get(deptRaw.toLowerCase()) ?? null : null;
    const password = tempPassword();

    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (error || !data.user) {
      const msg = error?.message ?? "";
      results.push({
        email, name,
        status: /already/i.test(msg) ? "skipped" : "error",
        note: /already/i.test(msg) ? "Already has an account" : /Database error|restricted/i.test(msg) ? "Email domain not allowed" : msg,
      });
      continue;
    }
    await db.from("profiles").update({ full_name: name || null, role, department_id: departmentId, must_change_password: true }).eq("id", data.user.id);
    results.push({ email, name, password, status: "created", note: deptRaw && !departmentId ? `Department "${deptRaw}" not found` : undefined });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/learners");
  return { results };
}
