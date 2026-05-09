// Path: medicalend-web/app/login/page.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

type MessageResponse = {
  message: string;
};

function normalizeDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String(
            (item as { msg?: unknown }).msg ?? "Eroare de validare",
          );
        }
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }

  return "Credentiale invalide";
}

function cleanEmail(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const safeEmail = useMemo(() => cleanEmail(email), [email]);
  const canResend =
    safeEmail.length >= 5 && safeEmail.includes("@") && !resendBusy;

  async function onSubmit() {
    if (!safeEmail || !password) {
      setError("Introdu e-mailul și parola.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: {
          email: safeEmail,
          password,
        },
      });

      saveSession(data.access_token);
      window.location.href = "/";
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ?? e?.message ?? "Credentiale invalide";
      setError(normalizeDetail(detail));
    } finally {
      setBusy(false);
    }
  }

  async function onResendVerification() {
    if (!canResend) {
      setError("Introdu adresa de e-mail înainte de retrimitere.");
      return;
    }

    try {
      setResendBusy(true);
      setError("");
      setSuccess("");

      const res = await apiRequest<MessageResponse>(
        "/auth/resend-verification",
        {
          method: "POST",
          body: { email: safeEmail },
        },
      );

      setSuccess(res.message || "E-mailul de confirmare a fost retrimis.");
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ?? e?.message ?? "Retrimiterea a eșuat.";
      setError(normalizeDetail(detail));
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <div className="mc-auth-shell">
      <Card className="mc-auth-card">
        <CardHeader>
          <CardTitle>Autentificare</CardTitle>
          <CardDescription>Intră în contul tău MediCalend.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mc-auth-form">
            <Input
              id="login-email"
              label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplu.ro"
              disabled={busy || resendBusy}
            />

            <Input
              id="login-password"
              label="Parolă"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={busy || resendBusy}
            />

            {error ? <p className="mc-error-banner">{error}</p> : null}

            {success ? (
              <p
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#166534",
                  lineHeight: 1.55,
                  fontSize: 14,
                }}
              >
                {success}
              </p>
            ) : null}

            <Button onClick={onSubmit} disabled={busy || resendBusy}>
              {busy ? "Se autentifică..." : "Autentificare"}
            </Button>

            <Button
              variant="secondary"
              onClick={onResendVerification}
              disabled={!canResend || busy}
            >
              {resendBusy
                ? "Se retrimite..."
                : "Retrimite e-mailul de confirmare"}
            </Button>

            <div className="mc-auth-links">
              <Link href="/forgot-password" className="mc-link-button">
                Ai uitat parola?
              </Link>

              <Link
                href={`/check-email${safeEmail ? `?email=${encodeURIComponent(safeEmail)}` : ""}`}
                className="mc-link-button"
              >
                Deschide pagina de confirmare
              </Link>
            </div>

            <Link href="/register">
              <Button variant="secondary" className="w-full">
                Înregistrare
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
