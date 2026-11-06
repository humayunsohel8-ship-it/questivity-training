import Image from "next/image";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Official Questivity logo (from www.questivity.com) with an "LMS" product tag. */
export function Logo({ className, tag = true }: { className?: string; tag?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image src={brand.logo} alt={brand.company} width={168} height={40} priority className="h-9 w-auto" />
      {tag && (
        <span className="rounded border border-brand/30 bg-brand-light px-1.5 py-0.5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
          LMS
        </span>
      )}
    </span>
  );
}
