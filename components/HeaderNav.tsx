"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  ClipboardCheck,
  ArrowLeftRight,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

export function HeaderNav() {
  const pathname = usePathname();
  const { teamMember } = useAuth();

  const linkClass = (href: string) => {
    const isActive =
      href === "/"
        ? pathname === "/" || pathname.startsWith("/reconciliation")
        : pathname.startsWith(href);
    return `flex items-center gap-1.5 text-sm transition-colors ${
      isActive
        ? "text-[var(--foreground)] font-medium"
        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    }`;
  };

  return (
    <>
      <div className="flex items-center justify-center gap-4">
        <Link href="/" className={linkClass("/")} title="Reconciliations">
          <ArrowLeftRight className="h-4 w-4" />
          <span>Reconciliations</span>
        </Link>
        <Link
          href="/report-cards"
          className={linkClass("/report-cards")}
          title="Report Cards"
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>Report Cards</span>
        </Link>
        {teamMember?.role === "Admin" && (
          <Link href="/team" className={linkClass("/team")} title="Team">
            <Users className="h-4 w-4" />
            <span>Team</span>
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 justify-self-end">
        <Link
          href="/settings"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </>
  );
}
