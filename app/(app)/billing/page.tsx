// Path: medicalend-web/app/(app)/billing/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Gift,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import {
  createBillingPortalSession,
  createStripeCheckoutSession,
} from "../../../lib/billing";
import {
  daysUntilSubscriptionEnd,
  fetchMyClinicSubscription,
  formatDateTime,
  formatSubscriptionStatus,
  subscriptionStatusClass,
  type MyClinicSubscription,
} from "../../../lib/subscriptions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DEFAULT_MONTHLY_PLAN_ID = 2;

export default function BillingPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => getToken(), []);

  const [subscription, setSubscription] = useState<MyClinicSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const sub = await fetchMyClinicSubscription(token);
      setSubscription(sub);
    } catch (err) {
      setSubscription(null);
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut încărca datele de billing.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setSuccess(
        "Plata a fost inițiată cu succes. După confirmarea Stripe, subscription-ul va fi actualizat.",
      );
    } else if (checkout === "cancel") {
      setError("Checkout-ul a fost anulat.");
    }

    void load();
  }, [searchParams]);

  const daysLeft = useMemo(
    () => daysUntilSubscriptionEnd(subscription?.ends_at),
    [subscription?.ends_at],
  );

  async function handleUpgradeMonthly() {
    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const result = await createStripeCheckoutSession(
        token,
        DEFAULT_MONTHLY_PLAN_ID,
      );

      window.location.href = result.checkout_url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut crea sesiunea de checkout.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenPortal() {
    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const result = await createBillingPortalSession(token);
      window.location.href = result.url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut deschide portalul de billing.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mc-page-shell">
      <Card
        className="mc-stat-card"
        style={{
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(255,255,255,0.96) 58%)",
        }}
      >
        <CardContent style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: 800 }}>
              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <CreditCard size={16} style={{ marginRight: 8 }} />
                Billing clinică
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Billing & subscription
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 760,
                }}
              >
                Aici vezi trialul, starea abonamentului și poți porni upgrade-ul
                către planul plătit prin Stripe.
              </p>
            </div>

            <div
              style={{
                minWidth: 280,
                maxWidth: 360,
                flex: 1,
                display: "grid",
                gap: 12,
              }}
            >
              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Status curent</strong>
                <span>
                  {subscription
                    ? formatSubscriptionStatus(subscription.status)
                    : "Necunoscut"}
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Zile rămase</strong>
                <span>
                  {daysLeft === null
                    ? "-"
                    : daysLeft >= 0
                      ? `${daysLeft} zile`
                      : `depășit cu ${Math.abs(daysLeft)} zile`}
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Plan</strong>
                <span>
                  {subscription?.plan_name ||
                    subscription?.plan_code ||
                    "Nespecificat"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="mc-error-banner">{error}</p> : null}
      {success ? <p className="mc-success-banner">{success}</p> : null}

      <section className="mc-stats-grid">
        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Plan activ</p>
              <p className="mc-stat-value">
                {subscription?.plan_name || subscription?.plan_code || "—"}
              </p>
            </div>
            <div className="mc-icon-badge">
              <ShieldCheck size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Planul asociat clinicii în acest moment.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Status</p>
              <p className="mc-stat-value">
                {subscription
                  ? formatSubscriptionStatus(subscription.status)
                  : "—"}
              </p>
            </div>
            <div className="mc-icon-badge">
              {subscription?.status === "trialing" ? (
                <Gift size={20} />
              ) : subscription?.status === "active" ? (
                <CheckCircle2 size={20} />
              ) : (
                <XCircle size={20} />
              )}
            </div>
          </div>
          <p className="mc-stat-note">Trial, activ, expirat sau anulat.</p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Valabil până la</p>
              <p className="mc-stat-value">
                {subscription ? formatDateTime(subscription.ends_at) : "—"}
              </p>
            </div>
            <div className="mc-icon-badge">
              <RefreshCw size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Data la care expiră trialul sau abonamentul.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Upgrade Stripe</p>
              <p className="mc-stat-value">Ready</p>
            </div>
            <div className="mc-icon-badge">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Checkout-ul poate fi pornit direct din această pagină.
          </p>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Subscription curent</CardTitle>
          <CardDescription>
            Rezumatul complet al stării curente a clinicii.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}

          {!loading && subscription ? (
            <div className="mc-status-row">
              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Status</strong>
                  <span>{formatSubscriptionStatus(subscription.status)}</span>
                </div>
                <span className={subscriptionStatusClass(subscription.status)}>
                  {formatSubscriptionStatus(subscription.status)}
                </span>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Clinică</strong>
                  <span>
                    {subscription.clinic_name ||
                      `Clinică #${subscription.clinic_id}`}
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Plan</strong>
                  <span>
                    {subscription.plan_name ||
                      subscription.plan_code ||
                      `Plan #${subscription.plan_id}`}
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Început</strong>
                  <span>{formatDateTime(subscription.starts_at)}</span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Expiră la</strong>
                  <span>{formatDateTime(subscription.ends_at)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="mc-dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>Acțiuni billing</CardTitle>
            <CardDescription>
              Pornește upgrade-ul Stripe sau intră în portalul Stripe.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={handleUpgradeMonthly} disabled={busy}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <ArrowUpRight size={16} />
                  {busy ? "Se pregătește..." : "Upgrade cu Stripe"}
                </span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleOpenPortal}
                disabled={busy}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <ExternalLink size={16} />
                  Deschide billing portal
                </span>
              </Button>

              <Button
                variant="ghost"
                onClick={() => void load()}
                disabled={busy}
              >
                Reîncarcă statusul
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Note importante</CardTitle>
            <CardDescription>
              Ce este deja funcțional și ce mai trebuie făcut în production.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-list">
              <div className="mc-list-item">
                <strong>Checkout Session</strong>
                <span>Implementat backend + frontend.</span>
              </div>

              <div className="mc-list-item">
                <strong>Webhook Stripe</strong>
                <span>
                  Implementat, dar trebuie configurat în dashboard-ul Stripe cu
                  secretul real.
                </span>
              </div>

              <div className="mc-list-item">
                <strong>Customer Portal</strong>
                <span>
                  Implementat, funcționează după ce Stripe este configurat
                  corect.
                </span>
              </div>

              <div className="mc-list-item">
                <strong>Production</strong>
                <span>
                  Necesită chei live, webhook live și test complet end-to-end.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
