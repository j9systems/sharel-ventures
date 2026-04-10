import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Sharel-NGEN",
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
          <AppHeader />
          <main className="flex-1">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
