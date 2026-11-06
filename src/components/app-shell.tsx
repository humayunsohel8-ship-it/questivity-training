"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, GraduationCap, Route, BookOpenText, Bot, Users, Settings2, Menu, X, LogOut, Award, UserCog, Video,
} from "lucide-react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import type { UserRole } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "My learning", icon: LayoutDashboard },
  { href: "/courses", label: "Course catalog", icon: GraduationCap },
  { href: "/paths", label: "Learning paths", icon: Route },
  { href: "/live", label: "Live classes", icon: Video },
  { href: "/kb", label: "Knowledge base", icon: BookOpenText },
  { href: "/assistant", label: brand.assistantName, icon: Bot },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/account", label: "My account", icon: UserCog },
];

export function AppShell({
  children, name, email, role, signOut,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
  role: UserRole;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    ...NAV,
    ...(role === "manager" || role === "admin" ? [{ href: "/team", label: "My team", icon: Users }] : []),
    ...(role === "admin" ? [{ href: "/admin", label: "Admin console", icon: Settings2 }] : []),
  ];

  const initials = name.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  // Styled like the www.questivity.com header: white, teal active state with a top/left accent bar.
  const sidebar = (
    <nav className="flex h-full flex-col border-r border-brand-line bg-white">
      <div className="flex h-20 items-center border-b border-brand-line px-5">
        <Link href="/dashboard" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 border-l-[3px] px-3 py-2 text-[15px] transition",
                  active
                    ? "border-brand bg-brand-light/70 font-bold text-brand"
                    : "border-transparent text-brand-ink hover:bg-brand-surface hover:text-brand",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-brand" : "text-brand-muted")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-brand-line p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-brand-ink">{name}</p>
            <p className="truncate text-xs text-brand-muted">{email}</p>
          </div>
          <form action={signOut}>
            <button title="Sign out" className="rounded-brand p-2 text-brand-muted hover:bg-brand-surface hover:text-brand">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72">{sidebar}</aside>
        </div>
      )}

      <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-brand-line bg-white px-4 lg:hidden">
        <button onClick={() => setOpen(!open)} className="rounded-brand p-2 hover:bg-brand-surface" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Logo />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
