// Path: medicalend-web/app/(app)/patients/page.tsx
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Mail,
  MapPin,
  Phone,
  Search,
  Users,
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

type PatientRow = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  county?: string | null;
};

function fullNameOf(item: PatientRow) {
  return [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function searchablePatientText(item: PatientRow) {
  return normalizeText(
    [
      item.id,
      item.first_name,
      item.last_name,
      item.email,
      item.phone,
      item.city,
      item.county,
      fullNameOf(item),
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

export default function PatientsPage() {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emptyMessage, setEmptyMessage] = useState("");
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        setEmptyMessage("");

        const token = getToken();
        const data = await apiRequest<PatientRow[]>("/patients/", { token });
        setRows(data ?? []);
      } catch (err) {
        const status = getErrorStatus(err);

        if (status === 403) {
          setRows([]);
          setError("");
          setEmptyMessage(
            "Momentan nu există pacienți atribuiți contului tău.",
          );
          return;
        }

        setError(
          err instanceof Error ? err.message : "Nu am putut încărca pacienții.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const normalized = normalizeText(appliedQuery);
    if (!normalized) return rows;

    return rows.filter((item) =>
      searchablePatientText(item).includes(normalized),
    );
  }, [rows, appliedQuery]);

  const uniqueCounties = useMemo(() => {
    return new Set(
      rows
        .map((item) => item.county?.trim())
        .filter((value): value is string => !!value),
    ).size;
  }, [rows]);

  const patientsWithPhone = useMemo(
    () => rows.filter((item) => !!item.phone?.trim()).length,
    [rows],
  );

  const patientsWithEmail = useMemo(
    () => rows.filter((item) => !!item.email?.trim()).length,
    [rows],
  );

  const newestVisiblePatient = useMemo(() => {
    return filteredRows[0] ?? null;
  }, [filteredRows]);

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
                <Users size={16} style={{ marginRight: 8 }} />
                Director pacienți
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Pacienți
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 720,
                }}
              >
                Filtrează rapid pacienții după nume, e-mail, telefon, oraș,
                județ sau ID și intră direct în profilul fiecărui pacient.
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
                <strong>Rezultate afișate</strong>
                <span>{filteredRows.length}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Pacient vizibil în top</strong>
                <span>
                  {newestVisiblePatient
                    ? fullNameOf(newestVisiblePatient) ||
                      `Pacient #${newestVisiblePatient.id}`
                    : "Niciun rezultat"}
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Județe distincte</strong>
                <span>{uniqueCounties}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="mc-stats-grid">
        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Total pacienți</p>
              <p className="mc-stat-value">{rows.length}</p>
            </div>
            <div className="mc-icon-badge">
              <Users size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Pacienții vizibili pentru utilizatorul curent.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Cu telefon</p>
              <p className="mc-stat-value">{patientsWithPhone}</p>
            </div>
            <div className="mc-icon-badge">
              <Phone size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Profiluri care au număr de telefon disponibil.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Cu e-mail</p>
              <p className="mc-stat-value">{patientsWithEmail}</p>
            </div>
            <div className="mc-icon-badge">
              <Mail size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Profiluri care au adresă de e-mail disponibilă.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Județe distincte</p>
              <p className="mc-stat-value">{uniqueCounties}</p>
            </div>
            <div className="mc-icon-badge">
              <MapPin size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Diversitatea geografică a pacienților vizibili.
          </p>
        </Card>
      </section>

      <section className="mc-dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>Căutare rapidă</CardTitle>
            <CardDescription>
              Poți căuta după nume, e-mail, telefon, oraș, județ sau ID pacient.
            </CardDescription>
          </CardHeader>

          <CardContent>
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
                  id="patients-search"
                  label="Căutare"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: Popescu, Cluj, 0740..., pacient 12..."
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Focus rapid</CardTitle>
            <CardDescription>
              Rezumat operațional pentru lista de pacienți.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-status-row">
              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Rezultate curente</strong>
                  <span>
                    {filteredRows.length} profiluri corespund filtrelor active.
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Recomandare</strong>
                  <span>
                    {filteredRows.length > 0
                      ? "Deschide profilul pacientului relevant pentru detalii."
                      : emptyMessage ||
                        "Schimbă termenul de căutare pentru a găsi pacientul dorit."}
                  </span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Pacient în top</strong>
                  <span>
                    {newestVisiblePatient
                      ? fullNameOf(newestVisiblePatient) ||
                        `Pacient #${newestVisiblePatient.id}`
                      : "Niciun rezultat disponibil"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Pacienți disponibili</CardTitle>
          <CardDescription>
            Pacienții disponibili pentru contul curent.
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
              Nu există pacienți disponibili pentru filtrul curent.
            </p>
          ) : null}

          {!loading && !error && filteredRows.length > 0 ? (
            <div className="mc-list">
              {filteredRows.map((item) => {
                const fullName = fullNameOf(item);

                return (
                  <Link
                    key={item.id}
                    href={`/patients/${item.id}`}
                    className="mc-list-item"
                    style={{ display: "block" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>{fullName || `Pacient #${item.id}`}</strong>
                        <span>
                          {item.email || "fără email"} •{" "}
                          {item.phone || "fără telefon"}
                        </span>
                        <span>
                          {[item.city, item.county]
                            .filter(Boolean)
                            .join(", ") || "locație indisponibilă"}
                        </span>
                      </div>

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--mc-primary)",
                          fontWeight: 700,
                        }}
                      >
                        <UserRound size={16} />
                        Deschide profilul
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
