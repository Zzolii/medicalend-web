// Path: medicalend-web/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const user = getUser();
    const role = user?.role;

    if (role === "admin") {
      router.replace("/admin");
      return;
    }

    if (role === "patient") {
      router.replace("/dashboard");
      return;
    }

    if (role === "provider") {
      router.replace("/dashboard");
      return;
    }

    router.replace("/dashboard");
  }, [router]);

  return <p className="mc-empty-note">Se încarcă...</p>;
}
