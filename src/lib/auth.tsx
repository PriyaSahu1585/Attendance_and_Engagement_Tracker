import { useEffect, useState, useRef, type ReactNode } from "react";
import { AuthContext, type Role, type Profile } from '@/lib/auth-context';
import { authErrorMessage } from '@/lib/auth-errors';
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let active = true;
    let generation = 0;
    const load = async (u: User | null) => {
      const current = ++generation;
      setError(null); setUser(u); setRole(null); setProfile(null);
      if (!u) { setLoading(false); return; }
      setLoading(true);
      try {
        const [roles, prof] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", u.id),
          supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
        ]);
        if (roles.error) throw roles.error;
        if (prof.error) throw prof.error;
        if (!active || current !== generation) return;
        setRole(roles.data?.some(x => x.role === "admin") ? "admin" : roles.data?.some(x => x.role === "teacher") ? "teacher" : roles.data?.some(x => x.role === "student") ? "student" : null);
        setProfile(prof.data);
      } catch (e) {
        if (active && current === generation) setError(authErrorMessage(e, "Account details could not be loaded. Please try again."));
      } finally { if (active && current === generation) setLoading(false); }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      setTimeout(() => {
        if (!active) return;
        void load(session?.user ?? null);
        void router.invalidate();
        if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
      }, 0);
    });
    reload.current = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error && error.name !== 'AuthSessionMissingError') throw error;
        if (active) await load(data.user);
      } catch (error) { if (active) { setLoading(false); setError(authErrorMessage(error, "Could not connect. Please try again.")); } }
    };
    void reload.current();
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [queryClient, router]);

  return (
    <AuthContext.Provider
      value={{ user, role, profile, loading, error, retry: () => reload.current(), signOut: async () => {
        await queryClient.cancelQueries(); queryClient.clear();
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
        setUser(null); setRole(null); setProfile(null);
        await router.navigate({ to: "/auth", replace: true });
      } }}
    >
      {children}
    </AuthContext.Provider>
  );
}

