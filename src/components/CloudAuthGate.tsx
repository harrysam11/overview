import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Cloud-mode route boundary. RLS remains the actual data authorization layer. */
export const CloudAuthGate = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(error ? null : data.session);
      setChecking(false);
    }).catch(() => {
      if (active) {
        setSession(null);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="sr-only">Checking your session…</span>
      </main>
    );
  }

  const isPublicAuthRoute = location.pathname === "/auth" || location.pathname === "/reset-password";
  if (!session && !isPublicAuthRoute) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  if (session && (location.pathname === "/auth" || location.pathname === "/")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
