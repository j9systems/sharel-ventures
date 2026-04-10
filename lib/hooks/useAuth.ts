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

  async function fetchTeamMember(supabase: SupabaseClient, userId: string) {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("team_members query error:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error("team_members fetch failed:", err);
      return null;
    }
  }

  useEffect(() => {
    const supabase = getClient();

    async function loadSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const tm = await fetchTeamMember(supabase, session.user.id);
          setTeamMember(tm);
        }
      } catch (err) {
        console.error("loadSession failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const tm = await fetchTeamMember(supabase, session.user.id);
        setTeamMember(tm);
      } else {
        setTeamMember(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
