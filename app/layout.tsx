import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HeaderNav } from "@/components/HeaderNav";

export const metadata: Metadata = {
  title: "Deposit Reconciliation — J9 Systems",
  description: "McDonald's franchise deposit reconciliation tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] font-sans">
        <ThemeProvider>
          <header className="border-b border-[var(--border)] px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <a href="/" className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#7c3aed] flex items-center justify-center text-white font-bold text-sm">
                  J9
                </div>
                <h1 className="text-lg font-semibold tracking-tight">
                  Deposit Reconciliation
                </h1>
              </a>
              <HeaderNav />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
