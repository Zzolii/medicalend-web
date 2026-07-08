// Path: medicalend-web/app/(app)/appointments/page.tsx
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FileText,
  Search,
  Trash2,
  UserRound,
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

type AppointmentRow = {
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

type StatusFilter =
  | "all"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "pending"
  | "canceled";

function formatDateTime(value?: string | null) {
  if (!value) return "Nespecificat";

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);

  if (!match) return raw;

  const [, year, month, day, hour, minute] = match;
  return `${day}.${month}.${year}, ${hour}:${minute}`;
}

function getStatusClass(status?: string) {
  if (status === "scheduled" || status === "completed") {
    return "mc-pill mc-pill-success";
  }
  if (status === "pending" || status === "in_progress") {
    return "mc-pill mc-pill-warning";
  }
  if (status === "canceled") {
    return "mc-pill mc-pill-danger";
  }
  return "mc-pill mc-pill-neutral";
}

function appointmentStatusLabel(status?: string) {
  if (status === "scheduled") return "Programată";
  if (status === "in_progress") return "În desfășurare";
  if (status === "completed") return "Finalizată";
  if (status === "pending") return "În așteptare";
  if (status === "canceled") return "Anulată";
  return status || "Necunoscut";
}

function statusLabel(value: StatusFilter) {
  if (value === "all") return "Toate";
  if (value === "scheduled") return "Programate";
  if (value === "in_progress") return "În desfășurare";
  if (value === "completed") return "Finalizate";
  if (value === "pending") return "Pending";
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

function searchableAppointmentText(item: AppointmentRow) {
  return normalizeText(
    [
      item.id,
      item.patient_id,
      item.provider_id,
      item.doctor_id,
      item.episode_id,
      item.clinic_id,
      item.patient_name,
      item.provider_name,
      item.doctor_name,
      item.notes,
      item.status,
      item.start_time,
      item.end_time,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

export default function AppointmentsPage() {
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadAppointments() {
    try {
      setLoading(true);
      setError("");

      const token = getToken();
      const data = await apiRequest<AppointmentRow[]>("/appointments/", {
        token,
      });
      setRows(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut încărca programările.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAppointments();
  }, []);

  async function handleDeleteAppointment(id: number) {
    const confirmed = window.confirm(
      "Ștergi definitiv această programare anulată?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      const token = getToken();

      await apiRequest(`/appointments/${id}`, {
        method: "DELETE",
        token,
      });

      setRows((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Programarea nu a putut fi ștearsă.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => {
    const now = Date.now();

    const upcoming = rows.filter((item) => {
      if (!item.start_time) return false;
      const value = new Date(item.start_time).getTime();
      return !Number.isNaN(value) && value >= now;
    }).length;

    const inProgress = rows.filter(
      (item) => item.status === "in_progress",
    ).length;
    const completed = rows.filter((item) => item.status === "completed").length;

    const uniquePatients = new Set(
      rows
        .map((item) => item.patient_id)
        .filter((value): value is number => typeof value === "number"),
    ).size;

    return {
      total: rows.length,
      upcoming,
      inProgress,
      completed,
      uniquePatients,
    };
  }, [rows]);

  const nextAppointment = useMemo(() => {
    const now = Date.now();

    return [...rows]
      .filter((item) => {
        if (!item.start_time) return false;
        const value = new Date(item.start_time).getTime();
        return !Number.isNaN(value) && value >= now;
      })
      .sort((a, b) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
        return aTime - bTime;
      })[0];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalized = normalizeText(appliedQuery);

    return rows.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!normalized) return true;

      return searchableAppointmentText(item).includes(normalized);
    });
  }, [rows, appliedQuery, statusFilter]);

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
                <CalendarDays size={16} style={{ marginRight: 8 }} />
                Workflow programări
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Programări
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 720,
                }}
              >
                Vizualizează programările reale din backend, filtrează-le după
                status, caută rapid pacientul potrivit și intră direct în
                detaliile operaționale ale fiecărei vizite.
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
                <strong>Următoarea programare</strong>
                <span>
                  {nextAppointment?.start_time
                    ? formatDateTime(nextAppointment.start_time)
                    : "Nu există programări viitoare"}
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
              <p className="mc-stat-label">Total programări</p>
              <p className="mc-stat-value">{stats.total}</p>
            </div>
            <div className="mc-icon-badge">
              <CalendarDays size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Toate programările vizibile pentru contul curent.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Viitoare</p>
              <p className="mc-stat-value">{stats.upcoming}</p>
            </div>
            <div className="mc-icon-badge">
              <Clock3 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Vizite care urmează să înceapă din acest moment înainte.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">În desfășurare</p>
              <p className="mc-stat-value">{stats.inProgress}</p>
            </div>
            <div className="mc-icon-badge">
              <UserRound size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Programări active, utile pentru monitorizarea fluxului curent.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Finalizate</p>
              <p className="mc-stat-value">{stats.completed}</p>
            </div>
            <div className="mc-icon-badge">
              <FileText size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Vizite deja închise și marcate ca finalizate.
          </p>
        </Card>
      </section>

      <section className="mc-dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>Filtrare și căutare</CardTitle>
            <CardDescription>
              Găsește rapid programările relevante după nume, status, episod sau
              note.
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
                    id="appointments-search"
                    label="Căutare"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: pacient, doctor, episod, status..."
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
                  [
                    "all",
                    "scheduled",
                    "in_progress",
                    "completed",
                    "pending",
                    "canceled",
                  ] as StatusFilter[]
                ).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      statusFilter === value
                        ? "mc-chip mc-chip-active"
                        : "mc-chip"
                    }
                    onClick={() => setStatusFilter(value)}
                  >
                    {statusLabel(value)}
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
              Elemente importante pentru fluxul operațional de azi.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-status-row">
              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Programări filtrate</strong>
                  <span>
                    {filteredRows.length} rezultate pentru filtrul și căutarea
                    curentă.
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Următoarea vizită</strong>
                  <span>
                    {nextAppointment?.patient_name
                      ? `${nextAppointment.patient_name} • ${formatDateTime(
                          nextAppointment.start_time,
                        )}`
                      : "Nu există vizite programate în continuare"}
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Recomandare</strong>
                  <span>
                    {stats.inProgress > 0
                      ? "Verifică mai întâi programările în desfășurare pentru a continua fluxul activ."
                      : stats.upcoming > 0
                        ? "Pregătește următoarele programări și deschide rapid episoadele asociate."
                        : "Momentan nu există elemente urgente în această listă."}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lista programărilor</CardTitle>
          <CardDescription>
            Date reale din endpoint-ul <strong>/appointments/</strong>, fără
            placeholder.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}
          {error ? <p className="mc-error-banner">{error}</p> : null}

          {!loading && !error && filteredRows.length === 0 ? (
            <p className="mc-empty-note">
              Nu există programări pentru filtrul selectat.
            </p>
          ) : null}

          {!loading && !error && filteredRows.length > 0 ? (
            <div className="mc-list">
              {filteredRows.map((item) => (
                <div key={item.id} className="mc-list-item">
                  <Link
                    href={`/appointments/${item.id}`}
                    style={{
                      display: "block",
                      color: "inherit",
                      textDecoration: "none",
                    }}
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
                        <strong>
                          {item.patient_name ||
                            `Pacient #${item.patient_id ?? item.id}`}
                        </strong>
                        <span>
                          {item.doctor_name ||
                            item.provider_name ||
                            "Furnizor medical"}
                        </span>
                      </div>

                      <span className={getStatusClass(item.status)}>
                        {appointmentStatusLabel(item.status)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        flexWrap: "wrap",
                        color: "var(--mc-muted)",
                        fontSize: 14,
                        marginTop: 8,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <CalendarDays size={15} />
                        {formatDateTime(item.start_time)}
                      </span>

                      {item.end_time ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Clock3 size={15} />
                          până la {formatDateTime(item.end_time)}
                        </span>
                      ) : null}

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <UserRound size={15} />
                        episod: {item.episode_id ?? "—"}
                      </span>
                    </div>

                    {item.notes ? (
                      <span style={{ marginTop: 8 }}>{item.notes}</span>
                    ) : null}
                  </Link>

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link href={`/appointments/${item.id}`}>
                      <Button variant="secondary">
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          Deschide programarea
                          <ArrowRight size={16} />
                        </span>
                      </Button>
                    </Link>

                    {item.status === "canceled" ? (
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteAppointment(item.id)}
                        disabled={deletingId === item.id}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Trash2 size={16} />
                          {deletingId === item.id ? "Se șterge..." : "Șterge"}
                        </span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
