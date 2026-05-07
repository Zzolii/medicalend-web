// Path: medicalend-web/app/(app)/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  CreditCard,
  FileText,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAppUser } from "@/components/user-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  daysUntilSubscriptionEnd,
  fetchMyClinicSubscription,
  formatDateTime,
  formatSubscriptionStatus,
  subscriptionStatusClass,
  type MyClinicSubscription,
} from "../../../lib/subscriptions";

type DashboardAppointment = {
  id: number;
  patient_id?: number | null;
  provider_id?: number | null;
  doctor_id?: number | null;
  episode_id?: number | null;
  clinic_id?: number | null;
  start_time?: string;
  end_time?: string | null;
  status?: string;
  notes?: string | null;
  patient_name?: string | null;
  provider_name?: string | null;
  doctor_name?: string | null;
};

type DashboardReferral = {
  id: number;
  status?: string;
  episode_id?: number | null;
  to_provider_id?: number | null;
  from_provider_id?: number | null;
  reason?: string | null;
  created_at?: string | null;
};

type ProviderDashboardOut = {
  provider_id: number;
  pending_referrals: DashboardReferral[];
  today_appointments: DashboardAppointment[];
};

type AdminStatsOut = {
  total_users?: number;
  total_patients?: number;
  total_providers?: number;
  pending_providers?: number;
  approved_providers?: number;
  rejected_providers?: number;
  total_clinics?: number;
  active_clinics?: number;
  total_subscription_plans?: number;
  active_subscription_plans?: number;
  total_clinic_subscriptions?: number;
  active_subscriptions?: number;
  trialing_subscriptions?: number;
  expired_subscriptions?: number;
  canceled_subscriptions?: number;
  subscriptions_expiring_soon?: number;
};

type EpisodeRow = {
  id: number;
  patient_id?: number;
  owner_provider_id?: number;
  title?: string;
  status?: string;
  created_at?: string;
};

function getStatusClass(status?: string) {
  if (
    status === "scheduled" ||
    status === "completed" ||
    status === "open" ||
    status === "active"
  ) {
    return "mc-pill mc-pill-success";
  }
  if (status === "pending" || status === "in_progress") {
    return "mc-pill mc-pill-warning";
  }
  return "mc-pill mc-pill-neutral";
}

function minutesBetween(start?: string, end?: string | null) {
  if (!start || !end) return null;

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return null;
  }

  return Math.round((endMs - startMs) / 60000);
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roleDashboardCopy(role?: string | null, clinicRole?: string | null) {
  if (role === "admin") {
    return {
      heroTitle: "Panou administrator",
      heroText:
        "Monitorizează rapid platforma, aprobările furnizorilor, clinicile și abonamentele fără a încărca fluxuri dedicate clinicilor.",
      quickLabel: "Administrare platformă",
    };
  }

  if (clinicRole === "clinic_admin") {
    return {
      heroTitle: "Panou clinică",
      heroText:
        "Ai o vedere de ansamblu asupra programărilor, referral-urilor și operațiunilor curente ale clinicii.",
      quickLabel: "Administrare clinică",
    };
  }

  if (clinicRole === "doctor") {
    return {
      heroTitle: "Panou medic",
      heroText:
        "Vezi rapid programările zilei, referral-urile active și deschide episoadele relevante.",
      quickLabel: "Flux medical",
    };
  }

  if (clinicRole === "assistant") {
    return {
      heroTitle: "Panou asistent",
      heroText:
        "Urmărește activitatea clinică și intră rapid în programările și episoadele care necesită suport.",
      quickLabel: "Activitate clinică",
    };
  }

  if (clinicRole === "reception") {
    return {
      heroTitle: "Panou recepție",
      heroText:
        "Gestionează programările vizibile și urmărește solicitările importante ale clinicii.",
      quickLabel: "Coordonare programări",
    };
  }

  if (role === "patient") {
    return {
      heroTitle: "Panou pacient",
      heroText:
        "Vezi rapid programările tale, episoadele active și punctele de intrare către căutare și rezervare.",
      quickLabel: "Cont pacient",
    };
  }

  return {
    heroTitle: "Panou principal",
    heroText:
      "Vizualizează rapid activitatea și datele esențiale din MediCalend.",
    quickLabel: "Dashboard",
  };
}

type QuickActionCardProps = {
  href: string;
  label: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
};

function QuickActionCard({
  href,
  label,
  value,
  note,
  icon,
}: QuickActionCardProps) {
  return (
    <Link href={href} className="mc-quick-card-link">
      <Card className="mc-stat-card mc-quick-card">
        <div className="mc-stat-top">
          <div>
            <p className="mc-stat-label">{label}</p>
            <p className="mc-stat-value">{value}</p>
          </div>
          <div className="mc-icon-badge">{icon}</div>
        </div>
        <p className="mc-stat-note">{note}</p>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { role, clinicRole } = useAppUser();

  const [providerData, setProviderData] = useState<ProviderDashboardOut | null>(
    null,
  );
  const [adminStats, setAdminStats] = useState<AdminStatsOut | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<
    DashboardAppointment[]
  >([]);
  const [patientEpisodes, setPatientEpisodes] = useState<EpisodeRow[]>([]);
  const [subscription, setSubscription] = useState<MyClinicSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = role === "admin";
  const isProviderLike = role === "provider";
  const isPatient = role === "patient";

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        if (isAdmin) {
          const stats = await apiRequest<AdminStatsOut>("/admin/stats", {
            token,
          }).catch(() => null);

          setAdminStats(stats);
          setProviderData(null);
          setSubscription(null);
          setPatientAppointments([]);
          setPatientEpisodes([]);
          return;
        }

        if (isProviderLike) {
          const [result, subscriptionResult] = await Promise.all([
            apiRequest<ProviderDashboardOut>("/dashboard/provider", { token }),
            fetchMyClinicSubscription(token).catch(() => null),
          ]);

          setProviderData(result);
          setSubscription(subscriptionResult);
          setAdminStats(null);
          setPatientAppointments([]);
          setPatientEpisodes([]);
          return;
        }

        if (isPatient) {
          const [appointments, episodes] = await Promise.all([
            apiRequest<DashboardAppointment[]>("/appointments/", { token }),
            apiRequest<EpisodeRow[]>("/care-episodes/", { token }),
          ]);

          setProviderData(null);
          setSubscription(null);
          setAdminStats(null);
          setPatientAppointments(appointments ?? []);
          setPatientEpisodes(episodes ?? []);
          return;
        }

        setProviderData(null);
        setSubscription(null);
        setAdminStats(null);
        setPatientAppointments([]);
        setPatientEpisodes([]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Nu am putut încărca dashboard-ul.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [isAdmin, isPatient, isProviderLike]);

  const copy = useMemo(
    () => roleDashboardCopy(role, clinicRole),
    [role, clinicRole],
  );

  const providerAppointments = providerData?.today_appointments ?? [];
  const providerReferrals = providerData?.pending_referrals ?? [];

  const patientUpcomingAppointments = useMemo(() => {
    const now = Date.now();

    return [...patientAppointments]
      .filter((item) => {
        if (!item.start_time) return false;
        const value = new Date(item.start_time).getTime();
        return !Number.isNaN(value) && value >= now;
      })
      .sort((a, b) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
        return aTime - bTime;
      });
  }, [patientAppointments]);

  const patientOpenEpisodes = useMemo(() => {
    return patientEpisodes.filter(
      (item) =>
        item.status === "open" ||
        item.status === "active" ||
        item.status === "in_progress",
    );
  }, [patientEpisodes]);

  const providerUpcomingAppointments = useMemo(() => {
    const now = Date.now();
    return providerAppointments.filter((item) => {
      if (!item.start_time) return false;
      const value = new Date(item.start_time).getTime();
      return !Number.isNaN(value) && value >= now;
    });
  }, [providerAppointments]);

  const providerCompletedAppointments = useMemo(
    () =>
      providerAppointments.filter((item) => item.status === "completed").length,
    [providerAppointments],
  );

  const providerInProgressAppointments = useMemo(
    () =>
      providerAppointments.filter((item) => item.status === "in_progress")
        .length,
    [providerAppointments],
  );

  const averageDurationMinutes = useMemo(() => {
    const durations = providerAppointments
      .map((item) => minutesBetween(item.start_time, item.end_time))
      .filter((value): value is number => typeof value === "number");

    if (durations.length === 0) return null;

    return Math.round(
      durations.reduce((sum, value) => sum + value, 0) / durations.length,
    );
  }, [providerAppointments]);

  const firstUpcomingAppointment = useMemo(() => {
    const sorted = [...providerUpcomingAppointments].sort((a, b) => {
      const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
      return aTime - bTime;
    });

    return sorted[0] ?? null;
  }, [providerUpcomingAppointments]);

  const nextUrgentReferral = useMemo(() => {
    const sorted = [...providerReferrals].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return sorted[0] ?? null;
  }, [providerReferrals]);

  const subscriptionDaysLeft = useMemo(
    () => daysUntilSubscriptionEnd(subscription?.ends_at),
    [subscription?.ends_at],
  );

  if (loading) {
    return (
      <div className="mc-page-shell">
        <p className="mc-empty-note">Se încarcă...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mc-page-shell">
        <p className="mc-error-banner">{error}</p>
      </div>
    );
  }

  if (isAdmin) {
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
                  {copy.quickLabel}
                </div>

                <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                  {copy.heroTitle}
                </h2>

                <p
                  style={{
                    margin: "14px 0 0",
                    color: "var(--mc-muted)",
                    lineHeight: 1.7,
                    maxWidth: 720,
                  }}
                >
                  {copy.heroText}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 18,
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/admin/providers">
                    <Button>Aprobări furnizori</Button>
                  </Link>

                  <Link href="/clinics">
                    <Button variant="secondary">Clinici & listings</Button>
                  </Link>

                  <Link href="/admin/clinic-subscriptions">
                    <Button variant="ghost">Abonamente</Button>
                  </Link>
                </div>
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
                  <strong>Furnizori în așteptare</strong>
                  <span>{safeNumber(adminStats?.pending_providers)}</span>
                </div>

                <div className="mc-list-item" style={{ background: "white" }}>
                  <strong>Clinici active</strong>
                  <span>{safeNumber(adminStats?.active_clinics)}</span>
                </div>

                <div className="mc-list-item" style={{ background: "white" }}>
                  <strong>Abonamente active</strong>
                  <span>{safeNumber(adminStats?.active_subscriptions)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="mc-stats-grid">
          <QuickActionCard
            href="/admin/providers"
            label="Furnizori total"
            value={safeNumber(adminStats?.total_providers)}
            note="Aprobă, respinge sau verifică furnizorii înregistrați."
            icon={<Stethoscope size={20} />}
          />

          <QuickActionCard
            href="/admin/providers"
            label="În așteptare"
            value={safeNumber(adminStats?.pending_providers)}
            note="Cererile care necesită decizie administrativă."
            icon={<Clock3 size={20} />}
          />

          <QuickActionCard
            href="/clinics"
            label="Clinici total"
            value={safeNumber(adminStats?.total_clinics)}
            note="Lista clinicilor și a furnizorilor vizibili în platformă."
            icon={<Activity size={20} />}
          />

          <QuickActionCard
            href="/patients"
            label="Pacienți"
            value={safeNumber(adminStats?.total_patients)}
            note="Utilizatori de tip pacient înregistrați în platformă."
            icon={<Users size={20} />}
          />
        </section>

        <section className="mc-stats-grid">
          <QuickActionCard
            href="/admin/subscription-plans"
            label="Planuri active"
            value={safeNumber(adminStats?.active_subscription_plans)}
            note="Planuri comerciale disponibile pentru clinici."
            icon={<CreditCard size={20} />}
          />

          <QuickActionCard
            href="/admin/clinic-subscriptions"
            label="Abonamente"
            value={safeNumber(adminStats?.total_clinic_subscriptions)}
            note="Toate abonamentele asociate clinicilor."
            icon={<ShieldCheck size={20} />}
          />

          <QuickActionCard
            href="/admin/clinic-subscriptions"
            label="Trial"
            value={safeNumber(adminStats?.trialing_subscriptions)}
            note="Clinici aflate în perioada de testare."
            icon={<CalendarDays size={20} />}
          />

          <QuickActionCard
            href="/admin/clinic-subscriptions"
            label="Expirate"
            value={safeNumber(adminStats?.expired_subscriptions)}
            note="Clinici care necesită reactivare sau follow-up."
            icon={<FileText size={20} />}
          />
        </section>
      </div>
    );
  }

  if (!isProviderLike && !isPatient) {
    return (
      <div className="mc-page-shell">
        <Card>
          <CardHeader>
            <CardTitle>Panou principal</CardTitle>
            <CardDescription>
              Dashboard-ul dedicat pentru acest rol va fi adăugat separat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mc-empty-note">
              Fluxurile deja funcționale rămân disponibile în navigare.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPatient) {
    const nextPatientAppointment = patientUpcomingAppointments[0] ?? null;

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
                  {copy.quickLabel}
                </div>

                <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                  {copy.heroTitle}
                </h2>

                <p
                  style={{
                    margin: "14px 0 0",
                    color: "var(--mc-muted)",
                    lineHeight: 1.7,
                    maxWidth: 720,
                  }}
                >
                  {copy.heroText}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 18,
                    flexWrap: "wrap",
                  }}
                >
                  <Link href="/search">
                    <Button>Caută clinică sau medic</Button>
                  </Link>

                  <Link href="/appointments">
                    <Button variant="secondary">Programările mele</Button>
                  </Link>

                  <Link href="/episodes">
                    <Button variant="ghost">Episoadele mele</Button>
                  </Link>
                </div>
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
                  <strong>Următoarea programare</strong>
                  <span>
                    {nextPatientAppointment?.start_time
                      ? formatDateTime(nextPatientAppointment.start_time)
                      : "Nu există programări viitoare"}
                  </span>
                </div>

                <div className="mc-list-item" style={{ background: "white" }}>
                  <strong>Episoade active</strong>
                  <span>{patientOpenEpisodes.length}</span>
                </div>

                <div className="mc-list-item" style={{ background: "white" }}>
                  <strong>Total programări</strong>
                  <span>{patientAppointments.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="mc-stats-grid">
          <QuickActionCard
            href="/appointments"
            label="Programări viitoare"
            value={patientUpcomingAppointments.length}
            note="Deschide direct lista programărilor tale."
            icon={<CalendarDays size={20} />}
          />

          <QuickActionCard
            href="/episodes"
            label="Episoade active"
            value={patientOpenEpisodes.length}
            note="Intră rapid în timeline-ul episodului."
            icon={<Activity size={20} />}
          />

          <QuickActionCard
            href="/appointments"
            label="Programări total"
            value={patientAppointments.length}
            note="Vezi toate programările asociate contului."
            icon={<Clock3 size={20} />}
          />

          <QuickActionCard
            href="/search"
            label="Acțiuni rapide"
            value={3}
            note="Căutare, rezervare și acces la flow-ul pacientului."
            icon={<ArrowRight size={20} />}
          />
        </section>
      </div>
    );
  }

  const visiblePatientsToday = new Set(
    providerAppointments
      .map((item) => item.patient_id)
      .filter((value): value is number => typeof value === "number"),
  ).size;

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
                {copy.quickLabel}
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                {copy.heroTitle}
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 720,
                }}
              >
                {copy.heroText}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 18,
                  flexWrap: "wrap",
                }}
              >
                <Link href="/appointments">
                  <Button>Deschide programările</Button>
                </Link>

                <Link href="/referrals">
                  <Button variant="secondary">Vezi trimiterile</Button>
                </Link>

                <Link href="/episodes">
                  <Button variant="ghost">Vezi episoadele</Button>
                </Link>
              </div>
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
                <strong>Provider ID</strong>
                <span>{providerData?.provider_id ?? "-"}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Prima programare viitoare</strong>
                <span>
                  {firstUpcomingAppointment?.start_time
                    ? formatDateTime(firstUpcomingAppointment.start_time)
                    : "Nicio programare viitoare"}
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Ultima trimitere pending</strong>
                <span>
                  {nextUrgentReferral?.created_at
                    ? formatDateTime(nextUrgentReferral.created_at)
                    : "Nicio trimitere în așteptare"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {subscription ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <CreditCard size={18} />
                Subscription clinică
              </span>
            </CardTitle>
            <CardDescription>
              Starea actuală a abonamentului clinicii tale.
            </CardDescription>
          </CardHeader>

          <CardContent>
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
                  <strong>Valabil până la</strong>
                  <span>{formatDateTime(subscription.ends_at)}</span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Zile rămase</strong>
                  <span>
                    {subscriptionDaysLeft === null
                      ? "-"
                      : subscriptionDaysLeft >= 0
                        ? `${subscriptionDaysLeft} zile`
                        : `depășit cu ${Math.abs(subscriptionDaysLeft)} zile`}
                  </span>
                </div>
              </div>
            </div>

            {subscription.status === "trialing" ? (
              <div className="mc-info-banner" style={{ marginTop: 16 }}>
                <ShieldCheck size={16} />
                <span>
                  Clinica ta este în perioada de trial. După expirare va trebui
                  activat un plan plătit.
                </span>
              </div>
            ) : null}

            {subscription.status === "expired" ? (
              <div className="mc-warning-banner" style={{ marginTop: 16 }}>
                <span>
                  Abonamentul clinicii este expirat. Contactează administratorul
                  platformei pentru reactivare.
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="mc-stats-grid">
        <QuickActionCard
          href="/appointments"
          label="Programări azi"
          value={providerAppointments.length}
          note="Deschide toate programările vizibile pentru ziua curentă."
          icon={<CalendarDays size={20} />}
        />

        <QuickActionCard
          href="/appointments"
          label="Viitoare"
          value={providerUpcomingAppointments.length}
          note="Vezi rapid ce urmează în continuarea zilei."
          icon={<Clock3 size={20} />}
        />

        <QuickActionCard
          href="/appointments"
          label="În desfășurare"
          value={providerInProgressAppointments}
          note="Intră direct în programările active."
          icon={<Stethoscope size={20} />}
        />

        <QuickActionCard
          href="/referrals"
          label="Trimiteri pending"
          value={providerReferrals.length}
          note="Procesează referral-urile care așteaptă decizie."
          icon={<FileText size={20} />}
        />
      </section>

      <section className="mc-stats-grid">
        <QuickActionCard
          href="/appointments"
          label="Programări finalizate"
          value={providerCompletedAppointments}
          note="Revizuiește vizitele deja închise."
          icon={<Activity size={20} />}
        />

        <QuickActionCard
          href="/appointments"
          label="Durată medie"
          value={
            averageDurationMinutes !== null ? `${averageDurationMinutes}m` : "—"
          }
          note="Calculată din programările care au început și final clar."
          icon={<Clock3 size={20} />}
        />

        <QuickActionCard
          href="/patients"
          label="Pacienți vizibili azi"
          value={visiblePatientsToday}
          note="Acces rapid către pacienții din programările zilei."
          icon={<Users size={20} />}
        />

        <QuickActionCard
          href={
            subscription
              ? "/profile"
              : providerReferrals.length > 0
                ? "/referrals"
                : "/episodes"
          }
          label="Subscription / flux"
          value={
            subscription
              ? formatSubscriptionStatus(subscription.status)
              : providerReferrals.length > 0
                ? "Inbox"
                : "Flux clinic"
          }
          note={
            subscription
              ? "Vezi subscription-ul clinicii în profil."
              : "Intrare rapidă spre trimiteri sau episoade."
          }
          icon={<CreditCard size={20} />}
        />
      </section>
    </div>
  );
}
