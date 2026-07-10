// Path: medicalend-web/app/forgot-password/page.tsx
"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MessageResponse = {
  message?: string;
};

function cleanEmail(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const safeEmail = useMemo(() => cleanEmail(email), [email]);

  const canSubmit = safeEmail.length >= 5 && safeEmail.includes("@") && !busy;

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();

    if (!safeEmail || !safeEmail.includes("@")) {
      setError("Introdu o adresă de e-mail validă.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const response = await apiRequest<MessageResponse>(
        "/auth/forgot-password",
        {
          method: "POST",
          body: {
            email: safeEmail,
          },
        },
      );

      setSuccess(
        response?.message ||
          "Dacă există un cont asociat acestei adrese, am trimis instrucțiunile de resetare.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Cererea de resetare a parolei a eșuat.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mc-auth-shell">
      <Card className="mc-auth-card">
        <CardHeader>
          <CardTitle>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Mail size={22} />
              Ai uitat parola?
            </span>
          </CardTitle>

          <CardDescription>
            Introdu adresa de e-mail a contului tău. Îți vom trimite un link
            securizat pentru alegerea unei parole noi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="mc-auth-form">
            <Input
              id="forgot-password-email"
              label="E-mail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@exemplu.ro"
              autoComplete="email"
              disabled={busy || !!success}
            />

            {error ? <p className="mc-error-banner">{error}</p> : null}

            {success ? (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#166534",
                  lineHeight: 1.6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <CheckCircle2
                    size={19}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <span>{success}</span>
                </div>
              </div>
            ) : null}

            {!success ? (
              <Button type="submit" disabled={!canSubmit}>
                {busy ? "Se trimite..." : "Trimite linkul de resetare"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSuccess("");
                  setError("");
                }}
              >
                Trimite din nou
              </Button>
            )}

            <Link href="/login" className="mc-link-button">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ArrowLeft size={16} />
                Înapoi la autentificare
              </span>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
