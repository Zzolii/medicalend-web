// Path: medicalend-web/components/user-context.tsx
"use client";

import { createContext, useContext } from "react";
import type { SessionRole } from "@/lib/auth";

export type AppUserContextValue = {
  ready: boolean;
  role: SessionRole | null;
  clinicRole: string | null;
  email: string | null;
  displayName: string;
};

const AppUserContext = createContext<AppUserContextValue | undefined>(
  undefined,
);

export function AppUserProvider({
  value,
  children,
}: {
  value: AppUserContextValue;
  children: React.ReactNode;
}) {
  return (
    <AppUserContext.Provider value={value}>{children}</AppUserContext.Provider>
  );
}

export function useAppUser() {
  const ctx = useContext(AppUserContext);

  if (!ctx) {
    throw new Error("useAppUser must be used inside AppUserProvider.");
  }

  return ctx;
}
