// Path: medicalend-web/app/(app)/admin/providers/page.tsx
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Trash2,
  XCircle,
  Shield,
  Search,
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

type AdminProviderRow = {
  id: number;
  user_id?: number | null;
  clinic_id?: number | null;
  status?: string | null;
  rejection_reason?: string | null;
  provider_type?: string | null;
  name?: string | null;
  specialty?: string | null;
  services_offered?: string | null;
  cui?: string | null;
  contact_person_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  county?: string | null;
  sanitary_authorization_number?: string | null;
  healthcare_compliance_confirmed?: boolean | null;
  provider_agreement_accepted?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type FilterValue = "all" | "pending" | "approved" | "rejected";

async function fetchProviders(token: string | null) {
  return apiRequest<AdminProviderRow[]>("/admin/providers", { token });
}

async function approveProvider(token: string | null, providerId: number) {
  return apiRequest(`/admin/providers/${providerId}/approve`, {
    method: "POST",
    token,
  });
}

async function rejectProvider(
  token: string | null,
  providerId: number,
  reason: string,
) {
  return apiRequest(`/admin/providers/${providerId}/reject`, {
    method: "POST",
    token,
    body: { reason },
  });
}

async function deleteProvider(token: string | null, providerId: number) {
  return apiRequest(`/admin/providers/${providerId}`, {
    method: "DELETE",
    token,
  });
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function isDeletedProvider(item: AdminProviderRow) {
  const reason = normalizeText(item.rejection_reason);
  return (
    item.is_active === false &&
    item.status === "rejected" &&
    reason.includes("deleted/deactivated by platform admin")
  );
}

function searchableProviderText(item: AdminProviderRow) {
  return normalizeText(
    [
      item.id,
      item.name,
      item.city,
      item.county,
      item.email,
      item.contact_email,
      item.contact_person_name,
      item.cui,
      item.provider_type,
      item.specialty,
      item.services_offered,
      item.status,
      item.rejection_reason,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ro-RO");
  } catch {
    return value;
  }
}

function safeText(value?: string | null) {
  return value?.trim() ? value : "-";
}

function statusLabel(status?: string | null) {
  if (status === "pending") return "În așteptare";
  if (status === "approved") return "Aprobat";
  if (status === "rejected") return "Respins";
  return safeText(status);
}

function statusClass(status?: string | null) {
  if (status === "pending") return "mc-pill mc-pill-warning";
  if (status === "approved") return "mc-pill mc-pill-success";
  if (status === "rejected") return "mc-pill mc-pill-danger";
  return "mc-pill mc-pill-neutral";
}

export default function AdminProvidersPage() {
  const token = getToken();

  const [items, setItems] = useState<AdminProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  const [filter, setFilter] = useState<FilterValue>("pending");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  const [rejectOpenId, setRejectOpenId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const rows = await fetchProviders(token);
      setItems((rows ?? []).filter((item) => !isDeletedProvider(item)));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Eroare la încărcarea furnizorilor.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(appliedQuery);

    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!normalizedQuery) return true;
      return searchableProviderText(item).includes(normalizedQuery);
    });
  }, [items, filter, appliedQuery]);

  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((x) => x.status === "pending").length,
      approved: items.filter((x) => x.status === "approved").length,
      rejected: items.filter((x) => x.status === "rejected").length,
    }),
    [items],
  );

  function handleSearchSubmit(event?: FormEvent) {
    event?.preventDefault();
    setAppliedQuery(query);
  }

  function handleClearSearch() {
    setQuery("");
    setAppliedQuery("");
  }

  async function handleApprove(item: AdminProviderRow) {
    try {
      setActionBusyId(item.id);
      setError("");
      await approveProvider(token, item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la aprobare.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleRejectConfirm(item: AdminProviderRow) {
    const reason = rejectReason.trim();

    if (reason.length < 3) {
      setError("Introdu un motiv de respingere de minimum 3 caractere.");
      return;
    }

    try {
      setActionBusyId(item.id);
      setError("");
      await rejectProvider(token, item.id, reason);
      setRejectOpenId(null);
      setRejectReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la respingere.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function handleDelete(item: AdminProviderRow) {
    const confirmed = window.confirm(
      `Sigur vrei să ștergi furnizorul "${safeText(item.name)}"? Furnizorul, clinica, abonamentele și membership-urile asociate vor fi dezactivate.`,
    );
    if (!confirmed) return;

    try {
      setActionBusyId(item.id);
      setError("");
      await deleteProvider(token, item.id);

      setItems((current) => current.filter((row) => row.id !== item.id));
      setRejectOpenId(null);
      setRejectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la ștergere.");
    } finally {
      setActionBusyId(null);
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
            <div style={{ maxWidth: 760 }}>
              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <Shield size={16} style={{ marginRight: 8 }} />
                Flux administrativ
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Aprobări furnizori
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 760,
                }}
              >
                Acesta este panoul de aprobare, respingere și ștergere. Pentru
                listarea clinicilor și browsing-ul public folosește meniul
                „Clinici & listings”.
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
                <strong>În așteptare</strong>
                <span>{stats.pending}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Aprobate</strong>
                <span>{stats.approved}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Respinse</strong>
                <span>{stats.rejected}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="mc-stats-grid">
        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Total</p>
              <p className="mc-stat-value">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">În așteptare</p>
              <p className="mc-stat-value">{stats.pending}</p>
            </div>
          </div>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Aprobate</p>
              <p className="mc-stat-value">{stats.approved}</p>
            </div>
          </div>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Respinse</p>
              <p className="mc-stat-value">{stats.rejected}</p>
            </div>
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filtrare și acțiuni</CardTitle>
          <CardDescription>
            Caută furnizorul și procesează rapid cererile administrative.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: "grid", gap: 12 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto auto",
                gap: 12,
                alignItems: "end",
                maxWidth: 760,
              }}
            >
              <Input
                id="providers-search"
                label="Căutare"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Medi Center, București, CUI..."
              />

              <Button type="submit">
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
                onClick={handleClearSearch}
                disabled={!query && !appliedQuery}
              >
                Resetează
              </Button>
            </div>

            <div className="mc-chip-row">
              {(
                ["pending", "approved", "rejected", "all"] as FilterValue[]
              ).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    filter === value ? "mc-chip mc-chip-active" : "mc-chip"
                  }
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? "Toți"
                    : value === "pending"
                      ? "În așteptare"
                      : value === "approved"
                        ? "Aprobate"
                        : "Respinse"}
                </button>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={() => void load()}
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

            {appliedQuery ? (
              <p className="mc-empty-note" style={{ margin: 0 }}>
                Filtru activ: <strong>{appliedQuery}</strong>
              </p>
            ) : null}

            {error ? (
              <p className="mc-error-banner" style={{ marginTop: 6 }}>
                {error}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}

      {!loading && filteredItems.length === 0 ? (
        <Card>
          <CardContent>
            <p className="mc-empty-note">
              Nu există furnizori pentru filtrul selectat.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && filteredItems.length > 0 ? (
        <div className="mc-list">
          {filteredItems.map((item) => {
            const isBusy = actionBusyId === item.id;

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
                        <strong>{safeText(item.name)}</strong>
                        <span>
                          {safeText(item.provider_type)} • {safeText(item.city)}{" "}
                          / {safeText(item.county)}
                        </span>
                      </div>

                      <span className={statusClass(item.status)}>
                        {statusLabel(item.status)}
                      </span>
                    </div>

                    <div className="mc-muted-block">
                      <div>
                        <strong>Contact:</strong>{" "}
                        {safeText(item.contact_person_name)}
                      </div>
                      <div>
                        <strong>Email:</strong>{" "}
                        {safeText(item.contact_email || item.email)}
                      </div>
                      <div>
                        <strong>Telefon:</strong>{" "}
                        {safeText(item.contact_phone || item.phone)}
                      </div>
                      <div>
                        <strong>CUI:</strong> {safeText(item.cui)}
                      </div>
                      <div>
                        <strong>Autorizație sanitară:</strong>{" "}
                        {safeText(item.sanitary_authorization_number)}
                      </div>
                      <div>
                        <strong>Conformitate:</strong>{" "}
                        {item.healthcare_compliance_confirmed ? "Da" : "Nu"}
                      </div>
                      <div>
                        <strong>Acord provider:</strong>{" "}
                        {item.provider_agreement_accepted ? "Da" : "Nu"}
                      </div>
                      <div>
                        <strong>Activ:</strong>{" "}
                        {item.is_active === false ? "Nu" : "Da"}
                      </div>
                      <div>
                        <strong>Creat la:</strong> {formatDate(item.created_at)}
                      </div>
                    </div>

                    {item.rejection_reason ? (
                      <div className="mc-danger-block">
                        <strong>Motiv respingere:</strong>{" "}
                        {item.rejection_reason}
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 12,
                      }}
                    >
                      <Button
                        onClick={() => handleApprove(item)}
                        disabled={isBusy || item.status === "approved"}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <CheckCircle2 size={16} />
                          Aprobă
                        </span>
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => {
                          setRejectOpenId(item.id);
                          setRejectReason("");
                        }}
                        disabled={isBusy || item.status === "rejected"}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <XCircle size={16} />
                          Respinge
                        </span>
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => handleDelete(item)}
                        disabled={isBusy}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Trash2 size={16} />
                          Șterge
                        </span>
                      </Button>
                    </div>

                    {rejectOpenId === item.id ? (
                      <div className="mc-inline-form">
                        <label
                          className="mc-label"
                          htmlFor={`reject-${item.id}`}
                        >
                          Motiv respingere
                        </label>

                        <textarea
                          id={`reject-${item.id}`}
                          className="mc-input"
                          style={{
                            minHeight: 110,
                            paddingTop: 12,
                            paddingBottom: 12,
                          }}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Scrie motivul respingerii..."
                        />

                        <div
                          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                        >
                          <Button
                            onClick={() => handleRejectConfirm(item)}
                            disabled={isBusy}
                          >
                            Confirmă respingerea
                          </Button>

                          <Button
                            variant="secondary"
                            onClick={() => {
                              setRejectOpenId(null);
                              setRejectReason("");
                            }}
                            disabled={isBusy}
                          >
                            Renunță
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
