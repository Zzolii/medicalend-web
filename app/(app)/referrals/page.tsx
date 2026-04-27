// Path: medicalend-web/app/(app)/referrals/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  ArrowRight,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ReferralStatus = "pending" | "accepted" | "rejected" | "completed";

type ReferralRow = {
  id: number;
  episode_id: number;
  from_provider_id?: number | null;
  to_provider_id?: number | null;
  reason?: string | null;
  rejection_reason?: string | null;
  status: ReferralStatus;
  created_at?: string | null;
};

type FilterValue = ReferralStatus | "all";

function formatDateTime(value?: string | null) {
  if (!value) return "Nespecificat";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function searchableReferralText(item: ReferralRow) {
  return normalizeText(
    [
      item.id,
      item.episode_id,
      item.from_provider_id,
      item.to_provider_id,
      item.reason,
      item.rejection_reason,
      item.status,
      item.created_at,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

function statusMeta(status: ReferralStatus) {
  switch (status) {
    case "pending":
      return {
        label: "În așteptare",
        cls: "mc-pill mc-pill-warning",
      };
    case "accepted":
      return {
        label: "Acceptată",
        cls: "mc-pill mc-pill-info",
      };
    case "rejected":
      return {
        label: "Respinsă",
        cls: "mc-pill mc-pill-danger",
      };
    case "completed":
      return {
        label: "Finalizată",
        cls: "mc-pill mc-pill-success",
      };
    default:
      return {
        label: String(status),
        cls: "mc-pill mc-pill-neutral",
      };
  }
}

function filterLabel(value: FilterValue) {
  switch (value) {
    case "pending":
      return "În așteptare";
    case "accepted":
      return "Acceptate";
    case "rejected":
      return "Respinse";
    case "completed":
      return "Finalizate";
    case "all":
      return "Toate";
    default:
      return String(value);
  }
}

async function fetchReferralInbox(token: string | null) {
  return apiRequest<ReferralRow[]>("/referrals/inbox", { token });
}

async function acceptReferralAction(id: number, token: string | null) {
  return apiRequest<ReferralRow>(`/referrals/${id}/accept`, {
    method: "POST",
    token,
  });
}

async function completeReferralAction(id: number, token: string | null) {
  return apiRequest<ReferralRow>(`/referrals/${id}/complete`, {
    method: "POST",
    token,
  });
}

async function rejectReferralAction(
  id: number,
  rejectionReason: string,
  token: string | null,
) {
  return apiRequest<ReferralRow>(`/referrals/${id}/reject`, {
    method: "POST",
    token,
    body: { rejection_reason: rejectionReason },
  });
}

export default function ReferralsPage() {
  const token = getToken();

  const [items, setItems] = useState<ReferralRow[]>([]);
  const [filter, setFilter] = useState<FilterValue>("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [rejectOpenId, setRejectOpenId] = useState<number | null>(null);
  const [rejectText, setRejectText] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const list = await fetchReferralInbox(token);
      setItems(list ?? []);

      const hasPending = (list ?? []).some((r) => r.status === "pending");
      const hasAccepted = (list ?? []).some((r) => r.status === "accepted");
      const hasCompleted = (list ?? []).some((r) => r.status === "completed");
      const hasRejected = (list ?? []).some((r) => r.status === "rejected");

      const currentEmpty =
        filter !== "all" && !(list ?? []).some((r) => r.status === filter);

      if (currentEmpty) {
        if (hasPending) setFilter("pending");
        else if (hasAccepted) setFilter("accepted");
        else if (hasCompleted) setFilter("completed");
        else if (hasRejected) setFilter("rejected");
        else setFilter("all");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Încărcarea referralurilor a eșuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const out = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      completed: 0,
    };

    for (const item of items) {
      out[item.status] += 1;
    }

    return out;
  }, [items]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!normalizedQuery) return true;
      return searchableReferralText(item).includes(normalizedQuery);
    });
  }, [items, filter, query]);

  const summaryText = useMemo(() => {
    if (filter === "all") {
      if (items.length === 0) return "Nu există trimiteri în inbox.";
      if (items.length === 1) return "Ai 1 trimitere în inbox.";
      return `Ai ${items.length} trimiteri în inbox.`;
    }

    const count = filtered.length;
    const label = filterLabel(filter).toLowerCase();

    if (count === 0) return `Nu există trimiteri ${label}.`;
    if (count === 1) return `Ai 1 trimitere ${label}.`;
    return `Ai ${count} trimiteri ${label}.`;
  }, [filter, filtered.length, items.length]);

  const latestPending = useMemo(() => {
    const pending = items.filter((item) => item.status === "pending");
    const sorted = [...pending].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return sorted[0] ?? null;
  }, [items]);

  async function onAccept(id: number) {
    try {
      setActionBusyId(id);
      setError("");
      await acceptReferralAction(id, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acceptarea a eșuat.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function onComplete(id: number) {
    try {
      setActionBusyId(id);
      setError("");
      await completeReferralAction(id, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finalizarea a eșuat.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectOpenId) return;

    const reason = rejectText.trim();
    if (reason.length < 3) {
      setError(
        "Te rog introdu cel puțin 3 caractere pentru motivul respingerii.",
      );
      return;
    }

    try {
      setActionBusyId(rejectOpenId);
      setError("");
      await rejectReferralAction(rejectOpenId, reason, token);
      setRejectOpenId(null);
      setRejectText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Respingerea a eșuat.");
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
                <FileText size={16} style={{ marginRight: 8 }} />
                Inbox referraluri
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Trimiteri medicale
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 720,
                }}
              >
                Gestionează rapid cererile primite, caută după episod, status,
                provider sau motiv și continuă fluxul clinic fără blocaje.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 18,
                  flexWrap: "wrap",
                }}
              >
                <Button variant="secondary" onClick={() => void load()}>
                  Reîncarcă inboxul
                </Button>

                <Link href="/episodes">
                  <Button variant="ghost">Deschide episoadele</Button>
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
                <strong>Total trimiteri</strong>
                <span>{items.length}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Filtru activ</strong>
                <span>{filterLabel(filter)}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Ultima trimitere pending</strong>
                <span>
                  {latestPending?.created_at
                    ? formatDateTime(latestPending.created_at)
                    : "Nu există trimiteri pending"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="mc-error-banner">{error}</p> : null}

      <section className="mc-stats-grid">
        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">În așteptare</p>
              <p className="mc-stat-value">{counts.pending}</p>
            </div>
            <div className="mc-icon-badge">
              <Clock3 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Referral-uri care așteaptă o decizie operațională.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Acceptate</p>
              <p className="mc-stat-value">{counts.accepted}</p>
            </div>
            <div className="mc-icon-badge">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Cazuri preluate și pregătite pentru continuarea îngrijirii.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Finalizate</p>
              <p className="mc-stat-value">{counts.completed}</p>
            </div>
            <div className="mc-icon-badge">
              <FileText size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Referral-uri închise după procesarea completă.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Respinse</p>
              <p className="mc-stat-value">{counts.rejected}</p>
            </div>
            <div className="mc-icon-badge">
              <XCircle size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Cereri care nu au putut fi acceptate în fluxul clinic.
          </p>
        </Card>
      </section>

      <section className="mc-dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>Filtrare și căutare</CardTitle>
            <CardDescription>{summaryText}</CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ maxWidth: 560 }}>
                <input
                  id="referrals-search"
                  className="mc-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: episod 12, pending, provider 5, motiv..."
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div className="mc-chip-row">
                  {(
                    [
                      "pending",
                      "accepted",
                      "completed",
                      "rejected",
                      "all",
                    ] as FilterValue[]
                  ).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        value === filter ? "mc-chip mc-chip-active" : "mc-chip"
                      }
                      onClick={() => setFilter(value)}
                    >
                      {filterLabel(value)}
                    </button>
                  ))}
                </div>

                <div className="mc-page-badge">
                  <Filter size={14} style={{ marginRight: 8 }} />
                  {filtered.length} afișate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus rapid</CardTitle>
            <CardDescription>
              Prioritizează următoarea acțiune importantă.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-status-row">
              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Inbox curent</strong>
                  <span>{summaryText}</span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Prioritate recomandată</strong>
                  <span>
                    {counts.pending > 0
                      ? "Procesează mai întâi referral-urile în așteptare pentru a evita blocajele de flux."
                      : counts.accepted > 0
                        ? "Verifică referral-urile acceptate și continuă prin episodul asociat."
                        : "Momentan nu există acțiuni urgente în inbox."}
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Ultima trimitere pending</strong>
                  <span>
                    {latestPending
                      ? `Referral #${latestPending.id} • episod #${latestPending.episode_id}`
                      : "Nu există trimiteri pending"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <Card>
          <CardContent>
            <p className="mc-empty-note">{summaryText}</p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="mc-list">
          {filtered.map((item) => {
            const meta = statusMeta(item.status);
            const isBusy = actionBusyId === item.id;
            const canAct = item.status === "pending";
            const canOpen =
              item.status === "accepted" || item.status === "completed";
            const canComplete = item.status === "accepted";

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
                        <strong>Trimitere #{item.id}</strong>
                        <span>
                          Episod #{item.episode_id} • către provider{" "}
                          {item.to_provider_id ?? "—"}
                        </span>
                      </div>

                      <span className={meta.cls}>{meta.label}</span>
                    </div>

                    <div className="mc-muted-block">
                      <div>
                        <strong>Motiv:</strong> {item.reason || "—"}
                      </div>
                      <div>Creată la: {formatDateTime(item.created_at)}</div>
                      <div>
                        De la provider: {item.from_provider_id ?? "—"} • către
                        provider: {item.to_provider_id ?? "—"}
                      </div>
                    </div>

                    {item.status === "rejected" && item.rejection_reason ? (
                      <div className="mc-danger-block">
                        <strong>Motiv respingere:</strong>{" "}
                        {item.rejection_reason}
                      </div>
                    ) : null}

                    {canOpen ? (
                      <Link href={`/episodes/${item.episode_id}`}>
                        <Button>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            Deschide episodul
                            <ArrowRight size={16} />
                          </span>
                        </Button>
                      </Link>
                    ) : null}

                    {canComplete ? (
                      <Button
                        onClick={() => onComplete(item.id)}
                        disabled={isBusy}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <CheckCircle2 size={16} />
                          {isBusy
                            ? "Se procesează..."
                            : "Marchează ca finalizată"}
                        </span>
                      </Button>
                    ) : null}

                    {canAct ? (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                          }}
                        >
                          <Button
                            onClick={() => onAccept(item.id)}
                            disabled={isBusy}
                          >
                            Acceptă
                          </Button>

                          <Button
                            variant="secondary"
                            onClick={() => {
                              setRejectOpenId(item.id);
                              setRejectText("");
                            }}
                            disabled={isBusy}
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
                        </div>

                        {rejectOpenId === item.id ? (
                          <div className="mc-inline-form">
                            <label
                              className="mc-label"
                              htmlFor={`reject-${item.id}`}
                            >
                              Motivul respingerii
                            </label>

                            <textarea
                              id={`reject-${item.id}`}
                              className="mc-input"
                              style={{
                                minHeight: 110,
                                paddingTop: 12,
                                paddingBottom: 12,
                              }}
                              value={rejectText}
                              onChange={(e) => setRejectText(e.target.value)}
                              placeholder="Scrie motivul respingerii..."
                            />

                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                              }}
                            >
                              <Button onClick={confirmReject} disabled={isBusy}>
                                Confirmă respingerea
                              </Button>

                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setRejectOpenId(null);
                                  setRejectText("");
                                }}
                                disabled={isBusy}
                              >
                                Renunță
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </>
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
