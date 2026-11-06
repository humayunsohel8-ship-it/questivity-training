"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fstr } from "@/lib/utils";

export type AssignState = { message?: string; error?: string };

/** Managers (for their reports) and admins (for anyone) can assign a learning path. Enforced in the database. */
export async function assignPathAction(_prev: AssignState, fd: FormData): Promise<AssignState> {
  const supabase = await createClient();
  const due = fstr(fd, "due");
  const { data, error } = await supabase.rpc("assign_path_to_user", {
    p_path: fstr(fd, "path_id"),
    p_user: fstr(fd, "user_id"),
    p_due: due || null,
    p_assigned_by: null,
  });
  if (error) return { error: error.code === "42501" ? "You can't assign to this person." : "Could not assign the path." };
  revalidatePath("/team");
  revalidatePath("/admin/users");
  return { message: `Assigned ${data ?? 0} course(s).` };
}
