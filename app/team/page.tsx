"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  createTeamMember,
  updateTeamMemberRole,
  deleteTeamMember,
} from "./actions";

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLES = ["Admin", "Payroll", "Ops"] as const;

export default function TeamPage() {
  const router = useRouter();
  const { teamMember: currentUser, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== "Admin")) {
      router.push("/");
    }
  }, [authLoading, currentUser, router]);

  // Fetch members
  useEffect(() => {
    async function fetchMembers() {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setMembers(data);
      setLoading(false);
    }
    if (currentUser?.role === "Admin") {
      fetchMembers();
    }
  }, [currentUser]);

  async function handleRoleChange(memberId: string, newRole: string) {
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    const result = await updateTeamMemberRole(memberId, newRole);
    if (!result.success) {
      // Revert on failure
      const supabase = getSupabaseBrowser();
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setMembers(data);
    }
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the team? They will lose app access.`)) {
      return;
    }
    const result = await deleteTeamMember(userId);
    if (result.success) {
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    }
  }

  async function handleMemberAdded() {
    setShowAddModal(false);
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setMembers(data);
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-[var(--muted-foreground)] text-sm">Loading...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "Admin") {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold">Team</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Manage team members and their roles.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                Role
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                  {member.name}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  {member.email}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(member.id, e.target.value)
                    }
                    className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      handleDelete(member.user_id, member.name)
                    }
                    className="text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]"
                >
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleMemberAdded}
        />
      )}
    </div>
  );
}

function AddMemberModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("Ops");
  const [password, setPassword] = useState("Sharel-NGEN2026");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await createTeamMember(name, email, role, password);

    if (!result.success) {
      setError(result.error ?? "Failed to create member");
      setSubmitting(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 p-6 rounded-lg bg-[var(--card)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Add Team Member
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1.5">
              Default password. Member can change it in Settings.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
