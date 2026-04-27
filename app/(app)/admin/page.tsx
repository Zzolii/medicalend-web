// Path: medicalend-web/app/(app)/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CreditCard,
  FileText,
  Layers3,
  Shield,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdminStatsOut = {
  total_users: number;
  total_patients: number;
  total_providers: number;

  pending_providers: number;
  approved_providers: number;
  rejected_providers: number;

  total_clinics: number;
  active_clinics: number;

  total_referrals: number;
  pending_referrals?: number;

  total_subscription_plans: number;
  active_subscription_plans: number;

  total_clinic_subscriptions: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  expired_subscriptions: number;
  canceled_subscriptions: number;

  subscriptions_expiring_soon: number;

  active_users_30d?: number;
  new_patients_30d?: number;
  appointments_7d?: number;
  appointments_total?: number;
  timeline_entries?: number;
  documents_total?: number;
};

function safeNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatDeltaLabel(value?: number | null, unit = "înregistrări") {
  const safe = safeNumber(value);
  if (safe === 0) return `0 ${unit}`;
  if (safe === 1) return `1 ${unit}`;
  return `${safe} ${unit}`;
}

function shouldHideTechnicalError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("method not allowed") ||
    normalized.includes("405") ||
    normalized.includes("no clinic membership found")
  );
}

function friendlyAdminError(err: unknown) {
  const raw =
    err instanceof Error ? err.message : "Încărcarea statisticilor a eșuat.";

  if (shouldHideTechnicalError(raw)) {
    return "";
  }

  return raw;
}

function EmptyStatsState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Panoul admin nu a putut încărca datele</CardTitle>
        <CardDescription>
          Dashboard-ul rămâne disponibil, dar datele nu au fost returnate de
          backend în acest moment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mc-empty-note">
          Verifică dacă backend-ul rulează și dacă endpoint-ul{" "}
          <strong>/admin/stats</strong> răspunde corect.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStatsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        const data = await apiRequest<AdminStatsOut>("/admin/stats", {
          token,
        });

        if (!alive) return;

        setStats(data);
      } catch (err) {
        if (!alive) return;

        const friendly = friendlyAdminError(err);
        setError(friendly);
        setStats(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, []);

  const productHealth = useMemo(() => {
    if (!stats) return null;

    return {
      activeUsers30d: safeNumber(stats.active_users_30d),
      newPatients30d: safeNumber(stats.new_patients_30d),
      appointments7d: safeNumber(stats.appointments_7d),
      appointmentsTotal: safeNumber(stats.appointments_total),
      timelineEntries: safeNumber(stats.timeline_entries),
      documentsTotal: safeNumber(stats.documents_total),
    };
  }, [stats]);

  const subscriptionHealth = useMemo(() => {
    if (!stats) return null;

    return {
      total: safeNumber(stats.total_clinic_subscriptions),
      active: safeNumber(stats.active_subscriptions),
      trialing: safeNumber(stats.trialing_subscriptions),
      expired: safeNumber(stats.expired_subscriptions),
      canceled: safeNumber(stats.canceled_subscriptions),
      expiringSoon: safeNumber(stats.subscriptions_expiring_soon),
    };
  }, [stats]);

  const providerHealth = useMemo(() => {
    if (!stats) return null;

    return {
      total: safeNumber(stats.total_providers),
      pending: safeNumber(stats.pending_providers),
      approved: safeNumber(stats.approved_providers),
      rejected: safeNumber(stats.rejected_providers),
    };
  }, [stats]);

  return (
    <div className="mc-page-shell">
      <Card
        className="mc-stat-card"
        style={{
          overflow: "hidden",
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(255,255,255,0.96) 58%)",
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
            <div style={{ maxWidth: 760 }}>
              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <Shield size={16} style={{ marginRight: 8 }} />
                Admin platformă
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Panou general
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 760,
                }}
              >
                Imagine de ansamblu asupra utilizatorilor, clinicilor,
                furnizorilor, trimiterilor și abonamentelor. Metricile sunt
                încărcate din endpoint-ul real <strong>/admin/stats</strong>.
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
                <strong>Utilizatori activi 30d</strong>
                <span>
                  {stats
                    ? formatDeltaLabel(stats.active_users_30d, "utilizatori")
                    : "—"}
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Programări 7 zile</strong>
                <span>
                  {stats
                    ? formatDeltaLabel(stats.appointments_7d, "programări")
                    : "—"}
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Timeline entries</strong>
                <span>
                  {stats
                    ? formatDeltaLabel(stats.timeline_entries, "evenimente")
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}

      {!loading && error ? <p className="mc-error-banner">{error}</p> : null}

      {!loading && !error && !stats ? <EmptyStatsState /> : null}

      {!loading && !error && stats ? (
        <>
          <section className="mc-stats-grid">
            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Utilizatori total</p>
                  <p className="mc-stat-value">{stats.total_users}</p>
                </div>
                <div className="mc-icon-badge">
                  <Users size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Baza totală de conturi în platformă.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Pacienți total</p>
                  <p className="mc-stat-value">{stats.total_patients}</p>
                </div>
                <div className="mc-icon-badge">
                  <Users size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Profilurile de pacient existente în sistem.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Clinici total</p>
                  <p className="mc-stat-value">{stats.total_clinics}</p>
                </div>
                <div className="mc-icon-badge">
                  <Building2 size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Total unități clinice/furnizori în platformă.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Clinici active</p>
                  <p className="mc-stat-value">{stats.active_clinics}</p>
                </div>
                <div className="mc-icon-badge">
                  <Building2 size={20} />
                </div>
              </div>
              <p className="mc-stat-note">Entități aprobate și operaționale.</p>
            </Card>
          </section>

          <section className="mc-dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Product value / usage MVP</CardTitle>
                <CardDescription>
                  Metrici orientate pe valoare de produs și utilizare reală.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Active users 30d</strong>
                      <span>{productHealth?.activeUsers30d ?? 0}</span>
                    </div>
                    <span className="mc-pill mc-pill-info">usage</span>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>New patients 30d</strong>
                      <span>{productHealth?.newPatients30d ?? 0}</span>
                    </div>
                    <span className="mc-pill mc-pill-success">growth</span>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Appointments 7d</strong>
                      <span>{productHealth?.appointments7d ?? 0}</span>
                    </div>
                    <span className="mc-pill mc-pill-warning">activity</span>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Appointments total</strong>
                      <span>{productHealth?.appointmentsTotal ?? 0}</span>
                    </div>
                    <span className="mc-pill mc-pill-neutral">volume</span>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Timeline entries</strong>
                      <span>{productHealth?.timelineEntries ?? 0}</span>
                    </div>
                    <span className="mc-pill mc-pill-info">core feature</span>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Documents total</strong>
                      <span>{productHealth?.documentsTotal ?? 0}</span>
                    </div>
                    <span className="mc-pill mc-pill-neutral">documents</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Focus rapid</CardTitle>
                <CardDescription>
                  Puncte cheie pentru evaluarea sănătății platformei.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Furnizori pending</strong>
                      <span>{providerHealth?.pending ?? 0}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Trimiteri total</strong>
                      <span>{stats.total_referrals}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Abonamente care expiră în 7 zile</strong>
                      <span>{subscriptionHealth?.expiringSoon ?? 0}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Recomandare</strong>
                      <span>
                        {(providerHealth?.pending ?? 0) > 0
                          ? "Verifică mai întâi furnizorii în așteptare pentru a debloca creșterea platformei."
                          : (subscriptionHealth?.expiringSoon ?? 0) > 0
                            ? "Revizuiește clinicile cu abonamente aproape expirate pentru retenție."
                            : "Platforma pare stabilă la nivel operațional pe baza indicatorilor actuali."}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mc-stats-grid">
            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Furnizori total</p>
                  <p className="mc-stat-value">{stats.total_providers}</p>
                </div>
                <div className="mc-icon-badge">
                  <Building2 size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Pending</p>
                  <p className="mc-stat-value">{stats.pending_providers}</p>
                </div>
                <div className="mc-icon-badge">
                  <Shield size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Aprobați</p>
                  <p className="mc-stat-value">{stats.approved_providers}</p>
                </div>
                <div className="mc-icon-badge">
                  <Shield size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Respinși</p>
                  <p className="mc-stat-value">{stats.rejected_providers}</p>
                </div>
                <div className="mc-icon-badge">
                  <Shield size={20} />
                </div>
              </div>
            </Card>
          </section>

          <section className="mc-stats-grid">
            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Planuri abonament</p>
                  <p className="mc-stat-value">
                    {stats.total_subscription_plans}
                  </p>
                </div>
                <div className="mc-icon-badge">
                  <Layers3 size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Planuri active</p>
                  <p className="mc-stat-value">
                    {stats.active_subscription_plans}
                  </p>
                </div>
                <div className="mc-icon-badge">
                  <Layers3 size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Abonamente total</p>
                  <p className="mc-stat-value">
                    {stats.total_clinic_subscriptions}
                  </p>
                </div>
                <div className="mc-icon-badge">
                  <CreditCard size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Active</p>
                  <p className="mc-stat-value">{stats.active_subscriptions}</p>
                </div>
                <div className="mc-icon-badge">
                  <CreditCard size={20} />
                </div>
              </div>
            </Card>
          </section>

          <section className="mc-dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Subscription health</CardTitle>
                <CardDescription>
                  Statusul comercial al clinicilor abonate.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Trialing</strong>
                      <span>{stats.trialing_subscriptions}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Expired</strong>
                      <span>{stats.expired_subscriptions}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Canceled</strong>
                      <span>{stats.canceled_subscriptions}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Expiră curând</strong>
                      <span>{stats.subscriptions_expiring_soon}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Core business snapshot</CardTitle>
                <CardDescription>
                  Indicatori operaționali rapizi pentru citire de management.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-list">
                  <div className="mc-list-item">
                    <strong>Trimiteri total</strong>
                    <span>{stats.total_referrals}</span>
                  </div>

                  <div className="mc-list-item">
                    <strong>Programări total</strong>
                    <span>{productHealth?.appointmentsTotal ?? 0}</span>
                  </div>

                  <div className="mc-list-item">
                    <strong>Timeline entries</strong>
                    <span>{productHealth?.timelineEntries ?? 0}</span>
                  </div>

                  <div className="mc-list-item">
                    <strong>Documente</strong>
                    <span>{productHealth?.documentsTotal ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
