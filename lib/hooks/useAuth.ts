"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { User, SupabaseClient, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  function getClient(): SupabaseClient {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseBrowser();
    }
    return supabaseRef.current!;
  }

  // Listen for auth state changes — keep callback synchronous to avoid
  // deadlocking the Supabase auth lock (async callbacks that call back into
  // the Supabase client will deadlock on the internal navigator lock).
  useEffect(() => {
    const supabase = getClient();

    async function loadSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        // Only mark loading done if there's no user (no team member to fetch).
        // When a user exists, loading stays true until fetchTeamMember resolves.
        if (!session?.user) {
          setLoading(false);
        }
      } catch (err) {
        console.error("loadSession failed:", err);
        setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setTeamMember(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch team_members row whenever the authenticated user changes.
  // This runs outside the auth lock so it cannot deadlock.
  useEffect(() => {
    if (!user) {
      setTeamMember(null);
      return;
    }

    let cancelled = false;
    const supabase = getClient();

    async function fetchTeamMember() {
      try {
        const { data, error } = await supabase
          .from("team_members")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle();
        if (error) {
          console.error("team_members query error:", error.message);
          if (!cancelled) setTeamMember(null);
          return;
        }
        if (!cancelled) setTeamMember(data);
      } catch (err) {
        console.error("team_members fetch failed:", err);
        if (!cancelled) setTeamMember(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTeamMember();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      const supabase = getClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore — we redirect regardless
    }
    window.location.href = "/login";
  }, []);

  return { user, teamMember, loading, signOut };
}
