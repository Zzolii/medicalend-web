// Path: medicalend-web/app/(app)/admin/clinic-subscriptions/page.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Gift,
  Plus,
  RefreshCw,
  Search,
  CalendarDays,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ClinicSubscription = {
  id: number;
  clinic_id: number;
  clinic_name?: string | null;
  plan_id: number;
  plan_code?: string | null;
  plan_name?: string | null;
  price_eur?: number | null;
  duration_days?: number | null;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at?: string | null;
};

type CreateClinicSubscriptionPayload = {
  clinic_id: number;
  plan_id: number;
  status: string;
  starts_at: string;
  ends_at: string;
};

type UpdateClinicSubscriptionPayload = {
  plan_id?: number;
  status?: string;
  starts_at?: string;
  ends_at?: string;
};

type FilterValue = "all" | "trialing" | "active" | "expired" | "canceled";

const STATUS_OPTIONS = ["trialing", "active", "expired", "canceled"] as const;
const DEFAULT_TRIAL_DAYS = 90;
const DEFAULT_TRIAL_PLAN_ID = 2;
const DEFAULT_PAID_DAYS = 30;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ro-RO");
  } catch {
    return value;
  }
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function statusClass(status: string) {
  if (status === "trialing") return "mc-pill mc-pill-warning";
  if (status === "active") return "mc-pill mc-pill-success";
  if (status === "expired") return "mc-pill mc-pill-danger";
  if (status === "canceled") return "mc-pill mc-pill-neutral";
  return "mc-pill mc-pill-neutral";
}

function statusLabel(status: string) {
  if (status === "trialing") return "Trial";
  if (status === "active") return "Activ";
  if (status === "expired") return "Expirat";
  if (status === "canceled") return "Anulat";
  return status;
}

function filterLabel(value: FilterValue) {
  if (value === "all") return "Toate";
  if (value === "trialing") return "Trial";
  if (value === "active") return "Active";
  if (value === "expired") return "Expirate";
  if (value === "canceled") return "Anulate";
  return value;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function searchableSubscriptionText(item: ClinicSubscription) {
  return normalizeText(
    [
      item.id,
      item.clinic_id,
      item.clinic_name,
      item.plan_id,
      item.plan_code,
      item.plan_name,
      item.status,
      item.starts_at,
      item.ends_at,
      item.created_at,
      item.price_eur,
      item.duration_days,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

function addDays(base: Date, days: number) {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

function toIsoDateTimeLocal(value: Date) {
  return value.toISOString().slice(0, 16);
}

function getTrialRange() {
  const now = new Date();
  const end = addDays(now, DEFAULT_TRIAL_DAYS);
  return {
    startsAt: toIsoDateTimeLocal(now),
    endsAt: toIsoDateTimeLocal(end),
  };
}

function getPaidRange(days = DEFAULT_PAID_DAYS) {
  const now = new Date();
  const end = addDays(now, days);
  return {
    startsAt: now.toISOString(),
    endsAt: end.toISOString(),
  };
}

function getExpiredRange() {
  const now = new Date();
  const expiredAt = new Date(now.getTime() - 60_000);
  return {
    startsAt: expiredAt.toISOString(),
    endsAt: expiredAt.toISOString(),
  };
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86400000);
}

async function fetchClinicSubscriptions(token: string | null) {
  return apiRequest<ClinicSubscription[]>("/admin/clinic-subscriptions", {
    token,
  });
}

async function createClinicSubscription(
  token: string | null,
  payload: CreateClinicSubscriptionPayload,
) {
  return apiRequest("/admin/clinic-subscriptions", {
    method: "POST",
    token,
    body: payload,
  });
}

async function updateClinicSubscription(
  token: string | null,
  subscriptionId: number,
  payload: UpdateClinicSubscriptionPayload,
) {
  return apiRequest(`/admin/clinic-subscriptions/${subscriptionId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export default function ClinicSubscriptionsPage() {
  const token = getToken();

  const [items, setItems] = useState<ClinicSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);

  const [filter, setFilter] = useState<FilterValue>("all");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [clinicId, setClinicId] = useState("");
  const [planId, setPlanId] = useState(String(DEFAULT_TRIAL_PLAN_ID));
  const [status, setStatus] = useState("trialing");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlanId, setEditPlanId] = useState("");
  const [editStatus, setEditStatus] = useState("trialing");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const rows = await fetchClinicSubscriptions(token);
      setItems(rows ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Eroare la încărcarea abonamentelor.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(appliedQuery);

    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!normalizedQuery) return true;
      return searchableSubscriptionText(item).includes(normalizedQuery);
    });
  }, [items, filter, appliedQuery]);

  const trialingCount = useMemo(
    () => items.filter((item) => item.status === "trialing").length,
    [items],
  );

  const activeCount = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items],
  );

  const expiredCount = useMemo(
    () => items.filter((item) => item.status === "expired").length,
    [items],
  );

  const expiringSoonCount = useMemo(
    () =>
      items.filter((item) => {
        if (item.status !== "trialing" && item.status !== "active")
          return false;
        const remaining = daysUntil(item.ends_at);
        return remaining !== null && remaining >= 0 && remaining <= 7;
      }).length,
    [items],
  );

  function handleSearchSubmit(event?: FormEvent) {
    event?.preventDefault();
    setAppliedQuery(query);
  }

  function clearSearch() {
    setQuery("");
    setAppliedQuery("");
  }

  function openCreateTrial() {
    const range = getTrialRange();
    setClinicId("");
    setPlanId(String(DEFAULT_TRIAL_PLAN_ID));
    setStatus("trialing");
    setStartsAt(range.startsAt);
    setEndsAt(range.endsAt);
    setCreateOpen(true);
    closeEdit();
  }

  function openCreatePaid() {
    const now = new Date();
    const end = addDays(now, DEFAULT_PAID_DAYS);
    setClinicId("");
    setPlanId(String(DEFAULT_TRIAL_PLAN_ID));
    setStatus("active");
    setStartsAt(toIsoDateTimeLocal(now));
    setEndsAt(toIsoDateTimeLocal(end));
    setCreateOpen(true);
    closeEdit();
  }

  function openEdit(item: ClinicSubscription) {
    setCreateOpen(false);
    setError("");
    setSuccess("");
    setEditingId(item.id);
    setEditPlanId(String(item.plan_id));
    setEditStatus(item.status);
    setEditStartsAt(formatDateInput(item.starts_at));
    setEditEndsAt(formatDateInput(item.ends_at));
  }

  function closeEdit() {
    setEditingId(null);
    setEditPlanId("");
    setEditStatus("trialing");
    setEditStartsAt("");
    setEditEndsAt("");
  }

  async function handleCreate() {
    const clinic = Number(clinicId);
    const plan = Number(planId);

    if (Number.isNaN(clinic) || clinic <= 0) {
      setError("Clinic ID invalid.");
      return;
    }

    if (Number.isNaN(plan) || plan <= 0) {
      setError("Plan ID invalid.");
      return;
    }

    if (!startsAt || !endsAt) {
      setError("Completează datele de început și sfârșit.");
      return;
    }

    if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
      setError("Data de început trebuie să fie înaintea datei de sfârșit.");
      return;
    }

    try {
      setSubmitBusy(true);
      setError("");
      setSuccess("");

      await createClinicSubscription(token, {
        clinic_id: clinic,
        plan_id: plan,
        status,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      });

      setCreateOpen(false);
      setSuccess(
        status === "trialing"
          ? "Trialul de 3 luni a fost creat."
          : "Abonamentul a fost creat.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la creare.");
    } finally {
      setSubmitBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (editingId === null) return;

    const plan = Number(editPlanId);
    if (Number.isNaN(plan) || plan <= 0) {
      setError("Plan ID invalid.");
      return;
    }

    if (!editStartsAt || !editEndsAt) {
      setError("Completează datele de început și sfârșit.");
      return;
    }

    if (new Date(editStartsAt).getTime() >= new Date(editEndsAt).getTime()) {
      setError("Data de început trebuie să fie înaintea datei de sfârșit.");
      return;
    }

    try {
      setSubmitBusy(true);
      setError("");
      setSuccess("");

      await updateClinicSubscription(token, editingId, {
        plan_id: plan,
        status: editStatus,
        starts_at: new Date(editStartsAt).toISOString(),
        ends_at: new Date(editEndsAt).toISOString(),
      });

      closeEdit();
      setSuccess("Abonamentul a fost actualizat.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la actualizare.");
    } finally {
      setSubmitBusy(false);
    }
  }

  async function activateFromTrial(item: ClinicSubscription) {
    try {
      setSubmitBusy(true);
      setError("");
      setSuccess("");

      const planDuration =
        typeof item.duration_days === "number" && item.duration_days > 0
          ? item.duration_days
          : DEFAULT_PAID_DAYS;

      const range = getPaidRange(planDuration);

      await updateClinicSubscription(token, item.id, {
        status: "active",
        starts_at: range.startsAt,
        ends_at: range.endsAt,
      });

      setSuccess("Abonamentul a fost activat cu perioadă validă.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la activare.");
    } finally {
      setSubmitBusy(false);
    }
  }

  async function markExpired(item: ClinicSubscription) {
    const confirmed = window.confirm(
      `Sigur vrei să marchezi abonamentul clinicii "${
        item.clinic_name || `Clinică #${item.clinic_id}`
      }" ca expirat?`,
    );

    if (!confirmed) return;

    try {
      setSubmitBusy(true);
      setError("");
      setSuccess("");

      const range = getExpiredRange();

      await updateClinicSubscription(token, item.id, {
        status: "expired",
        ends_at: range.endsAt,
      });

      setSuccess("Abonamentul a fost marcat ca expirat.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la expirare.");
    } finally {
      setSubmitBusy(false);
    }
  }

  async function cancelSubscription(item: ClinicSubscription) {
    const confirmed = window.confirm(
      `Sigur vrei să anulezi abonamentul clinicii "${
        item.clinic_name || `Clinică #${item.clinic_id}`
      }"?`,
    );

    if (!confirmed) return;

    try {
      setSubmitBusy(true);
      setError("");
      setSuccess("");

      await updateClinicSubscription(token, item.id, {
        status: "canceled",
      });

      setSuccess("Abonamentul a fost anulat.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la anulare.");
    } finally {
      setSubmitBusy(false);
    }
  }

  async function quickUpgradeMonthly(item: ClinicSubscription) {
    try {
      setSubmitBusy(true);
      setError("");
      setSuccess("");

      const range = getPaidRange(DEFAULT_PAID_DAYS);

      await updateClinicSubscription(token, item.id, {
        status: "active",
        starts_at: range.startsAt,
        ends_at: range.endsAt,
      });

      setSuccess("Subscription-ul a fost reactivat pentru 30 de zile.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la upgrade.");
    } finally {
      setSubmitBusy(false);
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
            <div style={{ maxWidth: 820 }}>
              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <CreditCard size={16} style={{ marginRight: 8 }} />
                Subscription operations
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Abonamente clinici
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 780,
                }}
              >
                Trialul de 3 luni rămâne fluxul standard. Din această pagină
                poți reactiva rapid clinicile expirate și le poți trece pe plan
                activ. Pentru Stripe live vom conecta aici checkout-ul și
                webhook-ul.
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
                <strong>Trial implicit</strong>
                <span>{DEFAULT_TRIAL_DAYS} zile</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Expiră în 7 zile</strong>
                <span>{expiringSoonCount}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Rezultate filtrate</strong>
                <span>{filteredItems.length}</span>
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
              <p className="mc-stat-label">Abonamente totale</p>
              <p className="mc-stat-value">{items.length}</p>
            </div>
            <div className="mc-icon-badge">
              <CreditCard size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Total abonamente existente pentru clinici.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Trialing</p>
              <p className="mc-stat-value">{trialingCount}</p>
            </div>
            <div className="mc-icon-badge">
              <Gift size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Clinici aflate în trialul inițial de 3 luni.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Active</p>
              <p className="mc-stat-value">{activeCount}</p>
            </div>
            <div className="mc-icon-badge">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Clinici care rulează pe abonament activ.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Expirate</p>
              <p className="mc-stat-value">{expiredCount}</p>
            </div>
            <div className="mc-icon-badge">
              <XCircle size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Clinici care trebuie reactivate sau reînnoite.
          </p>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Acțiuni</CardTitle>
          <CardDescription>
            Creează trialul implicit, adaugă abonamente manual și pregătește
            reactivarea clinicilor.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={openCreateTrial} disabled={submitBusy}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Gift size={16} />
                  Start free trial 3 luni
                </span>
              </Button>

              <Button
                variant="secondary"
                onClick={openCreatePaid}
                disabled={submitBusy}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Plus size={16} />
                  Creează abonament manual
                </span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => void load()}
                disabled={submitBusy}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <RefreshCw size={16} />
                  Reîncarcă
                </span>
              </Button>
            </div>

            <form onSubmit={handleSearchSubmit} style={{ maxWidth: 760 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto auto",
                  gap: 12,
                  alignItems: "end",
                }}
              >
                <Input
                  id="subscription-search"
                  label="Căutare"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: clinică, plan, trial, active..."
                />

                <Button type="submit" disabled={submitBusy}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Search size={16} />
                    Caută
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={clearSearch}
                  disabled={submitBusy || (!query && !appliedQuery)}
                >
                  Resetează
                </Button>
              </div>
            </form>

            {appliedQuery ? (
              <p className="mc-empty-note" style={{ margin: 0 }}>
                Filtru activ: <strong>{appliedQuery}</strong>
              </p>
            ) : null}

            <div className="mc-chip-row">
              {(
                [
                  "all",
                  "trialing",
                  "active",
                  "expired",
                  "canceled",
                ] as FilterValue[]
              ).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    filter === value ? "mc-chip mc-chip-active" : "mc-chip"
                  }
                  onClick={() => setFilter(value)}
                  disabled={submitBusy}
                >
                  {filterLabel(value)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {createOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {status === "trialing" ? "Trial clinică" : "Abonament nou"}
            </CardTitle>
            <CardDescription>
              Pentru trial folosim implicit 90 de zile. Poți ajusta manual dacă
              este nevoie.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-form-grid-2">
              <Input
                id="clinic-id"
                label="Clinic ID"
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
              />

              <Input
                id="plan-id"
                label="Plan ID"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              />

              <div>
                <label className="mc-label" htmlFor="subscription-status">
                  Status
                </label>
                <select
                  id="subscription-status"
                  className="mc-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {statusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                id="starts-at"
                label="Începe la"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />

              <Input
                id="ends-at"
                label="Se termină la"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={handleCreate} disabled={submitBusy}>
                {submitBusy ? "Se salvează..." : "Salvează"}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setCreateOpen(false)}
                disabled={submitBusy}
              >
                Renunță
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {editingId !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>Editează abonamentul</CardTitle>
            <CardDescription>
              Actualizează planul, statusul sau intervalul de valabilitate.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-form-grid-2">
              <Input
                id="edit-plan-id"
                label="Plan ID"
                value={editPlanId}
                onChange={(e) => setEditPlanId(e.target.value)}
              />

              <div>
                <label className="mc-label" htmlFor="edit-subscription-status">
                  Status
                </label>
                <select
                  id="edit-subscription-status"
                  className="mc-input"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {statusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                id="edit-starts-at"
                label="Începe la"
                type="datetime-local"
                value={editStartsAt}
                onChange={(e) => setEditStartsAt(e.target.value)}
              />

              <Input
                id="edit-ends-at"
                label="Se termină la"
                type="datetime-local"
                value={editEndsAt}
                onChange={(e) => setEditEndsAt(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={handleSaveEdit} disabled={submitBusy}>
                {submitBusy ? "Se salvează..." : "Salvează modificările"}
              </Button>

              <Button
                variant="secondary"
                onClick={closeEdit}
                disabled={submitBusy}
              >
                Închide
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Lista abonamentelor</CardTitle>
          <CardDescription>
            Clinici, planuri, trialuri și starea lor de funcționare.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}

          {!loading && filteredItems.length === 0 ? (
            <p className="mc-empty-note">
              Nu există abonamente pentru filtrul curent.
            </p>
          ) : null}

          {!loading && filteredItems.length > 0 ? (
            <div className="mc-list">
              {filteredItems.map((item) => {
                const remaining = daysUntil(item.ends_at);

                return (
                  <Card key={item.id}>
                    <CardContent>
                      <div className="mc-list-item" style={{ gap: 14 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <strong>
                              {item.clinic_name || `Clinică #${item.clinic_id}`}
                            </strong>
                            <span>
                              {item.plan_name || `Plan #${item.plan_id}`} •{" "}
                              {item.plan_code || "fără cod plan"}
                            </span>
                          </div>

                          <span className={statusClass(item.status)}>
                            {statusLabel(item.status)}
                          </span>
                        </div>

                        <div className="mc-muted-block">
                          <div>
                            <strong>Clinic ID:</strong> {item.clinic_id}
                          </div>
                          <div>
                            <strong>Plan ID:</strong> {item.plan_id}
                          </div>
                          <div>
                            <strong>Preț:</strong>{" "}
                            {item.price_eur != null
                              ? `${item.price_eur} EUR`
                              : "-"}
                          </div>
                          <div>
                            <strong>Durată plan:</strong>{" "}
                            {item.duration_days != null
                              ? `${item.duration_days} zile`
                              : "-"}
                          </div>
                          <div>
                            <strong>Start:</strong>{" "}
                            {formatDateTime(item.starts_at)}
                          </div>
                          <div>
                            <strong>Sfârșit:</strong>{" "}
                            {formatDateTime(item.ends_at)}
                          </div>
                          <div>
                            <strong>Timp rămas:</strong>{" "}
                            {remaining == null
                              ? "-"
                              : remaining >= 0
                                ? `${remaining} zile`
                                : `depășit cu ${Math.abs(remaining)} zile`}
                          </div>
                        </div>

                        <div className="mc-chip-row">
                          <button
                            type="button"
                            className="mc-chip"
                            onClick={() => openEdit(item)}
                            disabled={submitBusy}
                          >
                            <CalendarDays
                              size={14}
                              style={{ marginRight: 8 }}
                            />
                            Editează
                          </button>

                          {item.status !== "active" ? (
                            <button
                              type="button"
                              className="mc-chip"
                              onClick={() => void activateFromTrial(item)}
                              disabled={submitBusy}
                            >
                              <CheckCircle2
                                size={14}
                                style={{ marginRight: 8 }}
                              />
                              Activează
                            </button>
                          ) : null}

                          {item.status === "expired" ||
                          item.status === "canceled" ? (
                            <button
                              type="button"
                              className="mc-chip"
                              onClick={() => void quickUpgradeMonthly(item)}
                              disabled={submitBusy}
                            >
                              <ArrowUpRight
                                size={14}
                                style={{ marginRight: 8 }}
                              />
                              Reactivează 30 zile
                            </button>
                          ) : null}

                          {item.status !== "expired" &&
                          item.status !== "canceled" ? (
                            <button
                              type="button"
                              className="mc-chip"
                              onClick={() => void markExpired(item)}
                              disabled={submitBusy}
                            >
                              <Clock3 size={14} style={{ marginRight: 8 }} />
                              Marchează expirat
                            </button>
                          ) : null}

                          {item.status !== "canceled" ? (
                            <button
                              type="button"
                              className="mc-chip"
                              onClick={() => void cancelSubscription(item)}
                              disabled={submitBusy}
                            >
                              <XCircle size={14} style={{ marginRight: 8 }} />
                              Anulează
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
