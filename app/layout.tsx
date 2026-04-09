import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HeaderNav } from "@/components/HeaderNav";

export const metadata: Metadata = {
  title: "Sherel-NGEN",
  description: "McDonald's franchise deposit reconciliation tool",
  icons: {
    icon: "https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1775746603/Untitled_design_2_cmzpwm.png",
    apple: "https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1775746603/Untitled_design_2_cmzpwm.png",
  },
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
          <header className="border-b border-[var(--border)] px-4 py-4">
            <nav className="grid grid-cols-[auto_1fr_auto] items-center">
              <a href="/" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://res.cloudinary.com/duy32f0q4/image/upload/q_auto/f_auto/v1775746619/Untitled_design_1_vbkzsn.png"
                  alt="Sherel-NGEN"
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <h1 className="text-lg font-semibold tracking-tight">
                  Sherel-NGEN
                </h1>
              </a>
              <HeaderNav />
            </nav>
          </header>
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
