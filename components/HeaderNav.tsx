"use client";

import Link from "next/link";
import { Settings, ClipboardCheck } from "lucide-react";

export function HeaderNav() {
  return (
    <div className="flex items-center gap-4">
      <Link
        href="/report-cards"
        className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        title="Report Cards"
      >
        <ClipboardCheck className="h-4 w-4" />
        <span>Report Cards</span>
      </Link>
      <Link
        href="/settings"
        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </div>
  );
}
