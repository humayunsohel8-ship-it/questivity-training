import Link from "next/link";
import type { Metadata } from "next";
import { Award } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("id, serial, issued_at, course:courses(title, category)")
    .eq("user_id", profile.id)
    .order("issued_at", { ascending: false });
  const certs = (data ?? []) as unknown as { id: string; serial: string; issued_at: string; course: { title: string; category: string } | null }[];

  return (
    <div>
      <PageHeader title="My certificates" description="Earned by completing every lesson and passing the course assessment." />
      {certs.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {certs.map((c) => (
            <Link key={c.id} href={`/certificates/${c.id}`} className="card flex items-start gap-4 p-5 hover:shadow-md">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-accent/15 text-brand-accent"><Award className="h-5 w-5" /></span>
              <div>
                <p className="font-semibold">{c.course?.title}</p>
                <p className="text-xs text-brand-muted">{c.course?.category} · {formatDate(c.issued_at)}</p>
                <p className="mt-1 font-mono text-xs text-brand-muted">{c.serial}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No certificates yet" body="Complete a course to earn your first certificate." href="/dashboard" cta="Go to my learning" />
      )}
    </div>
  );
}
