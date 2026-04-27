// Path: medicalend-web/app/login/page.tsx

"use client";

import Link from "next/link";
import { useState } from "react";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit() {
    const safeEmail = email.trim();

    if (!safeEmail || !password) {
      setError("Introdu e-mailul și parola.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: {
          email: safeEmail,
          password,
        },
      });

      // 🔥 FONTOS: először mentjük
      saveSession(data.access_token);

      // 🔥 majd FULL reload (nem router!)
      window.location.href = "/";
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ?? e?.message ?? "Credentiale invalide";
      setError(normalizeDetail(detail));
    } finally {
      setBusy(false);
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
              disabled={busy}
            />

            <Input
              id="login-password"
              label="Parolă"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={busy}
            />

            {error ? <p className="mc-error-banner">{error}</p> : null}

            <Button onClick={onSubmit} disabled={busy}>
              {busy ? "Se autentifică..." : "Autentificare"}
            </Button>

            <div className="mc-auth-links">
              <Link href="/forgot-password" className="mc-link-button">
                Ai uitat parola?
              </Link>

              <Link
                href={`/check-email${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
                className="mc-link-button"
              >
                Retrimite e-mailul de confirmare
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
