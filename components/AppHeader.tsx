"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, Settings } from "lucide-react";
import { HeaderNav } from "@/components/HeaderNav";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useMobilePortrait } from "@/lib/hooks/useMobilePortrait";

export function AppHeader() {
  const pathname = usePathname();
  const isMobilePortrait = useMobilePortrait();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (pathname === "/login") return null;

  const logo = (
    <a href="/" className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1775746619/Untitled_design_1_vbkzsn.png"
        alt="Sharel-NGEN"
        className="h-8 w-8 rounded-lg object-cover"
      />
      <h1 className="text-lg font-semibold tracking-tight">Sharel-NGEN</h1>
    </a>
  );

  if (isMobilePortrait) {
    return (
      <>
        {/* Mobile top bar */}
        <header className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between">
            {logo}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Menu"
              >
                {menuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg z-50">
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>
        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </>
    );
  }

  return (
    <header className="border-b border-[var(--border)] px-4 py-4">
      <nav className="grid grid-cols-[auto_1fr_auto] items-center">
        {logo}
        <HeaderNav />
      </nav>
    </header>
  );
}
