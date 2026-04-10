"use client";

import { usePathname } from "next/navigation";
import { HeaderNav } from "@/components/HeaderNav";

export function AppHeader() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <header className="border-b border-[var(--border)] px-4 py-4">
      <nav className="grid grid-cols-[auto_1fr_auto] items-center">
        <a href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1775746619/Untitled_design_1_vbkzsn.png"
            alt="Sharel-NGEN"
            className="h-8 w-8 rounded-lg object-cover"
          />
          <h1 className="text-lg font-semibold tracking-tight">
            Sharel-NGEN
          </h1>
        </a>
        <HeaderNav />
      </nav>
    </header>
  );
}
