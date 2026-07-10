// Path: medicalend-web/app/reset-password/page.tsx
"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, LockKeyhole, XCircle } from "lucide-react";

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

function ResetPasswordContent() {
  const searchParams = useSearchParams();

  const token = useMemo(
    () => String(searchParams.get("token") || "").trim(),
    [searchParams],
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  const canSubmit =
    !!token &&
    newPassword.length >= 8 &&
    confirmPassword.length >= 8 &&
    passwordsMatch &&
    !busy;

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();

    if (!token) {
      setError(
        "Linkul de resetare nu conține un token valid. Solicită un link nou.",
      );
      return;
    }

    if (newPassword.length < 8) {
      setError("Parola trebuie să aibă minimum 8 caractere.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Parolele introduse nu coincid.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const response = await apiRequest<MessageResponse>(
        "/auth/reset-password",
        {
          method: "POST",
          body: {
            token,
            new_password: newPassword,
          },
        },
      );

      setSuccess(response?.message || "Parola a fost resetată cu succes.");

      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Parola nu a putut fi resetată.",
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
              <KeyRound size={22} />
              Alege o parolă nouă
            </span>
          </CardTitle>

          <CardDescription>
            Introdu noua parolă pentru contul tău MediCalend.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!token ? (
            <div style={{ display: "grid", gap: 14 }}>
              <p className="mc-error-banner">
                <XCircle
                  size={18}
                  style={{
                    marginRight: 8,
                    verticalAlign: "middle",
                  }}
                />
                Tokenul de resetare lipsește din link.
              </p>

              <Link href="/forgot-password">
                <Button className="w-full">Solicită un link nou</Button>
              </Link>

              <Link href="/login">
                <Button variant="secondary" className="w-full">
                  Înapoi la autentificare
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div style={{ display: "grid", gap: 14 }}>
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

              <Link href="/login">
                <Button className="w-full">
                  Autentifică-te cu parola nouă
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mc-auth-form">
              <Input
                id="reset-password-new"
                label="Parolă nouă"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 8 caractere"
                autoComplete="new-password"
                disabled={busy}
              />

              <Input
                id="reset-password-confirm"
                label="Confirmă parola nouă"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Introdu din nou parola"
                autoComplete="new-password"
                disabled={busy}
              />

              {confirmPassword && !passwordsMatch ? (
                <p
                  style={{
                    margin: 0,
                    color: "#b45309",
                    fontSize: 14,
                  }}
                >
                  Parolele introduse nu coincid.
                </p>
              ) : null}

              {error ? <p className="mc-error-banner">{error}</p> : null}

              <Button type="submit" disabled={!canSubmit}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <LockKeyhole size={16} />
                  {busy ? "Se salvează..." : "Salvează parola nouă"}
                </span>
              </Button>

              <Link href="/login" className="mc-link-button">
                Înapoi la autentificare
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mc-auth-shell">Se încarcă pagina de resetare...</div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
