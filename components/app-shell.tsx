// Path: medicalend-web/components/app-shell.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import {
  clearSession,
  getToken,
  getUser,
  setUser,
  type SessionRole,
} from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { AppUserProvider } from "@/components/user-context";

type ClinicMembership = {
  id?: number;
  clinic_id?: number;
  role?: string | null;
  is_active?: boolean;
};

type MeResponse = {
  id: number;
  email?: string;
  role?: string;
  clinic_memberships?: ClinicMembership[];
};

function getActiveClinicRole(
  role?: string | null,
  memberships?: ClinicMembership[] | null,
) {
  if (role === "admin") {
    return null;
  }

  const active = (memberships ?? []).find((m) => m?.is_active);
  return active?.role ?? null;
}

function normalizeSessionRole(value?: string | null): SessionRole {
  if (value === "admin" || value === "provider" || value === "patient") {
    return value;
  }

  return "patient";
}

function getCachedDisplayName(): string {
  const cachedUser = getUser();

  if (cachedUser && typeof cachedUser === "object") {
    const maybeFullName = (cachedUser as { full_name?: unknown }).full_name;
    if (typeof maybeFullName === "string" && maybeFullName.trim()) {
      return maybeFullName.trim();
    }

    const maybeEmail = (cachedUser as { email?: unknown }).email;
    if (typeof maybeEmail === "string" && maybeEmail.trim()) {
      return maybeEmail.trim();
    }
  }

  return "Utilizator";
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<SessionRole | null>(null);
  const [clinicRole, setClinicRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>(getCachedDisplayName);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const cachedUser = getUser();

        if (cachedUser?.role) {
          const cachedRole = normalizeSessionRole(cachedUser.role);

          if (!mounted) return;

          setRole(cachedRole);
          setClinicRole(null);
          setDisplayName(getCachedDisplayName());

          if (
            typeof cachedUser.email === "string" &&
            cachedUser.email.trim().length > 0
          ) {
            setEmail(cachedUser.email.trim());
          }
        }

        const me = await apiRequest<MeResponse>("/users/me", { token });
        const resolvedRole = normalizeSessionRole(me?.role);
        const resolvedClinicRole = getActiveClinicRole(
          resolvedRole,
          me.clinic_memberships ?? [],
        );

        setUser({
          email: me?.email,
          role: resolvedRole,
        });

        if (!mounted) return;

        setRole(resolvedRole);
        setClinicRole(resolvedClinicRole);
        setEmail(typeof me?.email === "string" ? me.email : null);

        if (typeof me?.email === "string" && me.email.trim()) {
          setDisplayName(me.email.trim());
        } else {
          setDisplayName(getCachedDisplayName());
        }

        setReady(true);
      } catch {
        clearSession();

        if (!mounted) return;

        setReady(false);
        setRole(null);
        setClinicRole(null);
        setEmail(null);

        router.replace("/login");
      }
    }

    void boot();

    return () => {
      mounted = false;
    };
  }, [router]);

  const contextValue = useMemo(
    () => ({
      ready,
      role,
      clinicRole,
      email,
      displayName,
    }),
    [ready, role, clinicRole, email, displayName],
  );

  if (!ready || !role) {
    return (
      <div className="mc-loading-screen">
        <div className="mc-loading-card">
          <div className="mc-spinner" />
          <p>Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <AppUserProvider value={contextValue}>
      <div className="mc-app-layout">
        <Sidebar role={role} clinicRole={clinicRole} />

        <div className="mc-app-main">
          <Topbar />
          <main className="mc-app-content">{children}</main>
        </div>
      </div>
    </AppUserProvider>
  );
}
