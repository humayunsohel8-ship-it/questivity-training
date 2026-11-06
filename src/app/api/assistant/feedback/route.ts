import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  messageId: z.string().uuid(),
  feedback: z.union([z.literal(1), z.literal(-1), z.null()]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });

  const { error } = await supabase
    .from("assistant_messages")
    .update({ feedback: parsed.data.feedback })
    .eq("id", parsed.data.messageId)
    .eq("role", "assistant");
  if (error) return NextResponse.json({ error: "Could not save feedback" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
