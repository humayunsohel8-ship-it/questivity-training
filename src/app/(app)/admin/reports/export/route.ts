import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection and quote every field.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};
const toCsv = (header: string[], rows: unknown[][]) => [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";

/** CSV exports for admins: ?type=enrollments | learners | attendance */
export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const type = new URL(request.url).searchParams.get("type") ?? "enrollments";
  const db = createAdminClient();
  let csv = "";

  if (type === "learners") {
    const supabase = await createClient();
    const { data } = await supabase.rpc("admin_learner_stats");
    type R = { full_name: string | null; email: string; role: string; department: string | null; is_active: boolean; enrolled: number; completed: number; in_progress: number; overdue: number; certificates: number; avg_quiz_score: number | null; last_activity: string | null; joined_on: string | null };
    csv = toCsv(
      ["Name", "Email", "Role", "Department", "Active", "Enrolled", "Completed", "In progress", "Overdue", "Certificates", "Avg quiz %", "Last activity", "Joined"],
      ((data ?? []) as R[]).map((r) => [r.full_name, r.email, r.role, r.department, r.is_active ? "Yes" : "No", r.enrolled, r.completed, r.in_progress, r.overdue, r.certificates, r.avg_quiz_score, r.last_activity, r.joined_on]),
    );
  } else if (type === "attendance") {
    const { data } = await db.from("live_session_attendance").select("joined_at, session:live_sessions(title, starts_at), profile:profiles(full_name, email)").order("joined_at", { ascending: false });
    type R = { joined_at: string; session: { title: string; starts_at: string } | null; profile: { full_name: string | null; email: string } | null };
    csv = toCsv(["Class", "Class start", "Name", "Email", "Joined at"], ((data ?? []) as unknown as R[]).map((r) => [r.session?.title, r.session?.starts_at, r.profile?.full_name, r.profile?.email, r.joined_at]));
  } else {
    const { data } = await db
      .from("enrollments")
      .select("status, due_date, started_at, completed_at, created_at, course:courses(title, category, is_mandatory), profile:profiles!enrollments_user_id_fkey(full_name, email, departments(name))")
      .order("created_at", { ascending: false });
    type R = { status: string; due_date: string | null; started_at: string | null; completed_at: string | null; created_at: string; course: { title: string; category: string; is_mandatory: boolean } | null; profile: { full_name: string | null; email: string; departments: { name: string } | null } | null };
    const today = new Date().toISOString().slice(0, 10);
    csv = toCsv(
      ["Name", "Email", "Department", "Course", "Category", "Mandatory", "Status", "Overdue", "Assigned", "Started", "Completed", "Due"],
      ((data ?? []) as unknown as R[]).map((r) => [
        r.profile?.full_name, r.profile?.email, r.profile?.departments?.name, r.course?.title, r.course?.category, r.course?.is_mandatory ? "Yes" : "No",
        r.status, r.status !== "completed" && r.due_date && r.due_date < today ? "Yes" : "No", r.created_at?.slice(0, 10), r.started_at?.slice(0, 10), r.completed_at?.slice(0, 10), r.due_date,
      ]),
    );
  }

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="questivity-lms-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
