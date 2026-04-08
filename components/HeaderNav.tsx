"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

export function HeaderNav() {
  return (
    <div className="flex items-center gap-4">
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
