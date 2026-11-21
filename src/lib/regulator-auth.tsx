import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { createAuthTransitionGuard } from "./auth-transition";
const AuthContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export function RegulatorAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const queries = useQueryClient();
  useEffect(() => {
    let active = true;
    const guard = createAuthTransitionGuard();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) return;
      if (!active) return;
      guard.observe();
      setUser(session?.user ?? null); setReady(true);
      if (event === "SIGNED_OUT") { void queries.cancelQueries(); queries.clear(); }
      else void queries.invalidateQueries({ queryKey: ["regulator-filings"] });
      void router.invalidate();
    });
    void supabase.auth.getUser().then(({ data }) => {
      if (active && guard.initialIsCurrent()) { setUser(data.user); setReady(true); }
    }).catch(() => {
      if (active && guard.initialIsCurrent()) { setUser(null); setReady(true); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [router, queries]);
  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>;
}
export const useRegulatorAuth = () => useContext(AuthContext);