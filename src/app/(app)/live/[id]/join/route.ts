import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Records attendance, then sends the learner to the Teams/Zoom meeting. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/live`);

  const { data: session } = await supabase.from("live_sessions").select("meeting_url, status").eq("id", id).maybeSingle();
  if (!session?.meeting_url || session.status === "cancelled") return NextResponse.redirect(`${origin}/live`);

  await supabase
    .from("live_session_attendance")
    .upsert({ session_id: id, user_id: user.id }, { onConflict: "session_id,user_id", ignoreDuplicates: true });

  if (!/^https?:\/\//i.test(session.meeting_url)) return NextResponse.redirect(`${origin}/live`);
  return NextResponse.redirect(session.meeting_url);
}
