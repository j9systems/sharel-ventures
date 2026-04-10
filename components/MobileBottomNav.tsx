"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ClipboardCheck, Users } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { teamMember } = useAuth();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/reconciliation")
      : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `flex flex-col items-center gap-0.5 text-xs transition-colors ${
      isActive(href)
        ? "text-[var(--primary)] font-medium"
        : "text-[var(--muted-foreground)]"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--background)] px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="flex items-center justify-around">
        <Link href="/" className={linkClass("/")} title="Reconciliations">
          <ArrowLeftRight className="h-5 w-5" />
          <span>Reconciliations</span>
        </Link>
        <Link
          href="/report-cards"
          className={linkClass("/report-cards")}
          title="Report Cards"
        >
          <ClipboardCheck className="h-5 w-5" />
          <span>Report Cards</span>
        </Link>
        {teamMember?.role === "Admin" && (
          <Link href="/team" className={linkClass("/team")} title="Team">
            <Users className="h-5 w-5" />
            <span>Team</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
