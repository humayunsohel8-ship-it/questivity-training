"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/paths", label: "Learning paths" },
  { href: "/admin/kb", label: "Knowledge base" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-brand-line">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold",
              active ? "border-brand text-brand" : "border-transparent text-brand-muted hover:text-brand-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

function FlashInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const saved = params.get("saved");
  if (error)
    return (
      <p className="mb-6 flex items-center gap-2 rounded-brand bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" /> {error}
      </p>
    );
  if (saved)
    return (
      <p className="mb-6 flex items-center gap-2 rounded-brand bg-emerald-50 p-3 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4" /> Saved.
      </p>
    );
  return null;
}

export function Flash() {
  return (
    <Suspense>
      <FlashInner />
    </Suspense>
  );
}
