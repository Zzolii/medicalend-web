// Path: medicalend-web/app/verify-email/page.tsx
"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type VerifyEmailResponse = {
  message?: string;
  detail?: unknown;
};

function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://192.168.0.115:8000/api/v1"
  );
}

function extractApiError(
  data: unknown,
  fallback = "Confirmarea e-mailului a eșuat.",
) {
  if (typeof data === "string" && data.trim()) return data;

  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;

    if (typeof detail === "string") return detail;

    if (Array.isArray(detail) && detail.length) {
      const first = detail[0];
      if (first && typeof first === "object" && "msg" in first) {
        return String((first as { msg?: unknown }).msg || fallback);
      }
    }
  }

  return fallback;
}

async function verifyEmailToken(token: string): Promise<VerifyEmailResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/auth/verify-email`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  let data: VerifyEmailResponse | string = "";

  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  if (!response.ok) {
    throw new Error(extractApiError(data));
  }

  return data as VerifyEmailResponse;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function verify() {
      if (!token) {
        setLoading(false);
        setError("Tokenul de confirmare lipsește din link.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const response = await verifyEmailToken(token);

        if (!alive) return;

        setSuccess(
          response.message || "Adresa de e-mail a fost confirmată cu succes.",
        );
      } catch (err: any) {
        if (!alive) return;
        setError(String(err?.message || "Confirmarea e-mailului a eșuat."));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    void verify();

    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="mc-auth-shell">
      <Card className="mc-auth-card">
        <CardHeader>
          <CardTitle>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <MailCheck size={22} />
              Confirmare e-mail
            </span>
          </CardTitle>
          <CardDescription>
            Validăm adresa de e-mail pentru contul tău MediCalend.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="mc-empty-note">Se confirmă e-mailul...</p>
          ) : null}

          {!loading && success ? (
            <div style={{ display: "grid", gap: 14 }}>
              <p
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  borderRadius: 14,
                  color: "#166534",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                <CheckCircle2
                  size={18}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                {success}
              </p>

              <Link href="/login">
                <Button className="w-full">Mergi la autentificare</Button>
              </Link>
            </div>
          ) : null}

          {!loading && error ? (
            <div style={{ display: "grid", gap: 14 }}>
              <p className="mc-error-banner">
                <XCircle
                  size={18}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                {error}
              </p>

              <Link href="/login">
                <Button variant="secondary" className="w-full">
                  Înapoi la autentificare
                </Button>
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="mc-auth-shell">Se încarcă...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
