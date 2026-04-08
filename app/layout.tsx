import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#0f0f0f] text-[#f5f5f5] font-sans">
        <header className="border-b border-[#2a2a2a] px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#7c3aed] flex items-center justify-center text-white font-bold text-sm">
                J9
              </div>
              <h1 className="text-lg font-semibold tracking-tight">
                Deposit Reconciliation
              </h1>
            </div>
            <span className="text-xs text-[#a3a3a3]">J9 Systems</span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
