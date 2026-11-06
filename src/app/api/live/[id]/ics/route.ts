import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildIcs, type LiveSession } from "@/lib/live";
import { env } from "@/lib/env";

/** Downloadable calendar invite for one live class (RLS: only sessions the user can see). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await supabase.from("live_sessions").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const s = data as LiveSession;

  const filename = s.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "live-class";
  return new NextResponse(buildIcs(s, env.siteUrl(), s.status === "cancelled" ? "CANCEL" : "PUBLISH"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
