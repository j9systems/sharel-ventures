"use client";

import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPwMessage({
        type: "error",
        text: "Password must be at least 6 characters.",
      });
      return;
    }

    setPwLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPwMessage({ type: "error", text: error.message });
    } else {
      setPwMessage({ type: "success", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPwLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h2 className="text-xl font-semibold mb-8">Settings</h2>

      <div className="space-y-6">
        <div className="p-5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
          <h3 className="text-sm font-medium mb-1">Appearance</h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Choose your preferred color scheme.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                theme === "light"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                theme === "dark"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        </div>

        <div className="p-5 rounded-lg bg-[var(--card)] border border-[var(--border)]">
          <h3 className="text-sm font-medium mb-1">Password</h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-4">
            Update your account password.
          </p>

          {pwMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                pwMessage.type === "success"
                  ? "bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)]"
                  : "bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)]"
              }`}
            >
              {pwMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {pwLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
