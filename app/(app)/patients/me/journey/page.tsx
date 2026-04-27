// Path: medicalend-web/app/(app)/patients/me/journey/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";

type PatientMe = {
  id: number;
};

export default function MyJourneyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const token = getToken();
        const me = await apiRequest<PatientMe>("/patients/me", { token });

        if (!mounted) return;

        if (me?.id) {
          router.replace(`/patients/${me.id}/journey`);
          return;
        }

        router.replace("/profile");
      } catch {
        if (!mounted) return;
        router.replace("/profile");
      }
    }

    void boot();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="mc-page-shell">
      <p className="mc-empty-note">Se deschide Journey-ul tău...</p>
    </div>
  );
}
