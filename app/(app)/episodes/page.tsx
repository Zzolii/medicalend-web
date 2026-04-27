// Path: medicalend-web/app/(app)/episodes/page.tsx
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  FileText,
  Filter,
  Search,
  Stethoscope,
  Users,
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

type EpisodeRow = {
  id: number;
  patient_id?: number;
  owner_provider_id?: number;
  title?: string;
  status?: string;
  created_at?: string;
};

type EpisodeFilter = "all" | "open" | "active" | "in_progress";

function isActiveEpisodeStatus(status?: string | null) {
  return status === "open" || status === "active" || status === "in_progress";
}

function getStatusClass(status?: string) {
  if (status === "open" || status === "active") {
    return "mc-pill mc-pill-success";
  }
  if (status === "pending" || status === "in_progress") {
    return "mc-pill mc-pill-warning";
  }
  return "mc-pill mc-pill-neutral";
}

function getStatusLabel(status?: string) {
  if (status === "open" || status === "active") return "Activ";
  if (status === "in_progress") return "În desfășurare";
  if (status === "pending") return "În așteptare";
  return status || "Nespecificat";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Nespecificat";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function filterLabel(value: EpisodeFilter) {
  if (value === "all") return "Toate active";
  if (value === "open") return "Deschise";
  if (value === "active") return "Active";
  if (value === "in_progress") return "În desfășurare";
  return value;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function searchableEpisodeText(item: EpisodeRow) {
  return normalizeText(
    [
      item.id,
      item.title,
      item.status,
      item.patient_id,
      item.owner_provider_id,
      item.created_at,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

function getErrorStatus(err: unknown) {
  const maybe = err as {
    status?: number;
    response?: { status?: number };
  };

  return maybe?.status ?? maybe?.response?.status ?? null;
}

export default function EpisodesPage() {
  const [rows, setRows] = useState<EpisodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [filter, setFilter] = useState<EpisodeFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        setEmptyMessage("");

        const token = getToken();
        const data = await apiRequest<EpisodeRow[]>("/care-episodes/", {
          token,
        });

        setRows(data ?? []);
      } catch (err) {
        const status = getErrorStatus(err);

        if (status === 403) {
          setRows([]);
          setError("");
          setEmptyMessage(
            "Momentan nu există episoade active atribuite contului tău.",
          );
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Nu am putut încărca episoadele.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const visibleRows = useMemo(() => {
    return rows.filter((item) => isActiveEpisodeStatus(item.status));
  }, [rows]);

  const stats = useMemo(() => {
    const openCount = visibleRows.filter(
      (item) => item.status === "open" || item.status === "active",
    ).length;

    const inProgressCount = visibleRows.filter(
      (item) => item.status === "in_progress",
    ).length;

    const uniquePatients = new Set(
      visibleRows
        .map((item) => item.patient_id)
        .filter((value): value is number => typeof value === "number"),
    ).size;

    return {
      total: visibleRows.length,
      openCount,
      inProgressCount,
      uniquePatients,
    };
  }, [visibleRows]);

  const newestEpisode = useMemo(() => {
    const sorted = [...visibleRows].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return sorted[0] ?? null;
  }, [visibleRows]);

  const filteredRows = useMemo(() => {
    const normalized = normalizeText(appliedQuery);

    return visibleRows.filter((item) => {
      if (filter !== "all" && item.status !== filter) {
        return false;
      }

      if (!normalized) return true;

      return searchableEpisodeText(item).includes(normalized);
    });
  }, [visibleRows, appliedQuery, filter]);

  function handleSearchSubmit(event?: FormEvent) {
    event?.preventDefault();
    setAppliedQuery(query);
  }

  function handleClearSearch() {
    setQuery("");
    setAppliedQuery("");
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
                <Activity size={16} style={{ marginRight: 8 }} />
                Episoade active
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Episoade
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 720,
                }}
              >
                Aici apar doar episoadele active sau în desfășurare. Episoadele
                finalizate, închise sau arhivate rămân disponibile în Journey,
                ca parte din istoricul pacientului.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 18,
                  flexWrap: "wrap",
                }}
              >
                <Link href="/dashboard">
                  <Button variant="secondary">Înapoi la panou</Button>
                </Link>

                <Link href="/appointments">
                  <Button variant="ghost">Vezi programările</Button>
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
                <strong>Cel mai nou episod activ</strong>
                <span>
                  {newestEpisode?.created_at
                    ? formatDateTime(newestEpisode.created_at)
                    : "Nu există episoade active"}
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Rezultate afișate</strong>
                <span>{filteredRows.length}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Pacienți unici</strong>
                <span>{stats.uniquePatients}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="mc-stats-grid">
        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Episoade active</p>
              <p className="mc-stat-value">{stats.total}</p>
            </div>
            <div className="mc-icon-badge">
              <FileText size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Doar episoadele care încă necesită atenție.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Deschise / active</p>
              <p className="mc-stat-value">{stats.openCount}</p>
            </div>
            <div className="mc-icon-badge">
              <Stethoscope size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Episoade care continuă în fluxul de coordonare.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">În desfășurare</p>
              <p className="mc-stat-value">{stats.inProgressCount}</p>
            </div>
            <div className="mc-icon-badge">
              <Clock3 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Episoade aflate în progres operațional acum.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Pacienți unici</p>
              <p className="mc-stat-value">{stats.uniquePatients}</p>
            </div>
            <div className="mc-icon-badge">
              <Users size={20} />
            </div>
          </div>
          <p className="mc-stat-note">Pacienți cu episoade active vizibile.</p>
        </Card>
      </section>

      <section className="mc-dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>Filtrare și căutare</CardTitle>
            <CardDescription>
              Găsește rapid episoade active după titlu, ID pacient, provider sau
              status.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: "grid", gap: 14 }}>
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
                    id="episodes-search"
                    label="Căutare"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: episod, pacient, provider, status..."
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

                {appliedQuery ? (
                  <p className="mc-empty-note" style={{ margin: "12px 0 0" }}>
                    Filtru activ: <strong>{appliedQuery}</strong>
                  </p>
                ) : null}
              </form>

              <div className="mc-chip-row">
                {(
                  ["all", "open", "active", "in_progress"] as EpisodeFilter[]
                ).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      filter === value ? "mc-chip mc-chip-active" : "mc-chip"
                    }
                    onClick={() => setFilter(value)}
                  >
                    {filterLabel(value)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus rapid</CardTitle>
            <CardDescription>
              Orientare rapidă pentru următoarea acțiune utilă.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-status-row">
              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Episoade filtrate</strong>
                  <span>
                    {filteredRows.length} rezultate pentru filtrul și căutarea
                    curentă.
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Cel mai nou episod activ</strong>
                  <span>
                    {newestEpisode?.title
                      ? `${newestEpisode.title} • ${formatDateTime(
                          newestEpisode.created_at,
                        )}`
                      : "Nu există episoade active disponibile"}
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Recomandare</strong>
                  <span>
                    {emptyMessage ||
                      (stats.inProgressCount > 0
                        ? "Verifică mai întâi episoadele în desfășurare pentru a continua coordonarea."
                        : stats.openCount > 0
                          ? "Deschide episoadele active și verifică programările, documentele sau sarcinile asociate."
                          : "Momentan nu există episoade active care să necesite atenție imediată. Istoricul rămâne în Journey.")}
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Filtru activ</strong>
                  <span>{filterLabel(filter)}</span>
                </div>
                <div className="mc-page-badge">
                  <Filter size={14} style={{ marginRight: 8 }} />
                  {filteredRows.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Episoade active disponibile</CardTitle>
          <CardDescription>
            Date reale din backend prin endpoint-ul{" "}
            <strong>/care-episodes/</strong>. Lista ascunde episoadele
            finalizate, închise sau arhivate.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}
          {error ? <p className="mc-error-banner">{error}</p> : null}

          {!loading && !error && emptyMessage ? (
            <p className="mc-empty-note">{emptyMessage}</p>
          ) : null}

          {!loading && !error && !emptyMessage && filteredRows.length === 0 ? (
            <p className="mc-empty-note">
              Nu există episoade active pentru filtrul selectat.
            </p>
          ) : null}

          {!loading && !error && filteredRows.length > 0 ? (
            <div className="mc-list">
              {filteredRows.map((item) => (
                <Link
                  key={item.id}
                  href={`/episodes/${item.id}`}
                  className="mc-list-item"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>{item.title || `Episod #${item.id}`}</strong>
                      <span>
                        pacient_id: {item.patient_id ?? "—"} • provider_id:{" "}
                        {item.owner_provider_id ?? "—"}
                      </span>
                    </div>

                    <span className={getStatusClass(item.status)}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <span>{formatDateTime(item.created_at)}</span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--mc-primary)",
                      fontWeight: 700,
                    }}
                  >
                    <FileText size={16} />
                    Deschide episodul
                    <ArrowRight size={15} />
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
