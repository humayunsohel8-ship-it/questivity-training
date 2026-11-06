import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";
import { brand } from "@/config/brand";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Certificate" };

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("serial, issued_at, profile:profiles(full_name, email), course:courses(title, duration_minutes)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const cert = data as unknown as {
    serial: string; issued_at: string;
    profile: { full_name: string | null; email: string } | null;
    course: { title: string; duration_minutes: number } | null;
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <Link href="/certificates" className="text-sm text-brand hover:underline">← My certificates</Link>
        <PrintButton />
      </div>

      <div className="mx-auto aspect-[1.414] w-full max-w-4xl bg-white p-3 shadow-lg print:shadow-none">
        <div className="relative flex h-full flex-col items-center justify-between border-[6px] border-double border-brand p-8 text-center sm:p-12">
          <div aria-hidden className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-brand via-brand-accent to-brand" />
          <Image src={brand.logo} alt={brand.company} width={168} height={40} className="h-12 w-auto" />
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Certificate of completion</p>
            <p className="text-sm text-brand-muted">This certifies that</p>
            <p className="font-display text-3xl font-bold text-brand-ink sm:text-4xl">{cert.profile?.full_name || cert.profile?.email}</p>
            <p className="text-sm text-brand-muted">has successfully completed</p>
            <p className="font-display text-xl font-semibold text-brand sm:text-2xl">{cert.course?.title}</p>
          </div>
          <div className="grid w-full grid-cols-3 items-end gap-4 text-xs text-brand-muted">
            <div>
              <p className="border-t border-brand-line pt-2 font-semibold text-brand-ink">{formatDate(cert.issued_at)}</p>
              <p>Date issued</p>
            </div>
            <div className="font-mono">{cert.serial}</div>
            <div>
              <p className="border-t border-brand-line pt-2 font-semibold text-brand-ink">{brand.product}</p>
              <p>{brand.certificateSignatory}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
