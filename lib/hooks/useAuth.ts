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

  useEffect(() => {
    const supabase = getClient();

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase
          .from("team_members")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        setTeamMember(data);
      }
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase
          .from("team_members")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        setTeamMember(data);
      } else {
        setTeamMember(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  return { user, teamMember, loading, signOut };
}
