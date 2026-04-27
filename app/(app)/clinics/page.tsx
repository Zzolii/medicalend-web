// Path: medicalend-web/app/(app)/clinics/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Search,
  ArrowRight,
  Layers3,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAppUser } from "@/components/user-context";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ClinicLikeRow = {
  id: number;
  name?: string | null;
  provider_type?: string | null;
  city?: string | null;
  county?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  clinic_id?: number | null;
};

type ClinicFilter = "all" | "clinic" | "home_care" | "approved" | "pending";

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function searchableClinicText(item: ClinicLikeRow) {
  return normalizeText(
    [
      item.id,
      item.clinic_id,
      item.name,
      item.provider_type,
      item.city,
      item.county,
      item.email,
      item.phone,
      item.status,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" "),
  );
}

function providerTypeLabel(value?: string | null) {
  if (value === "home_care") return "Home Care";
  if (value === "clinic") return "Clinică";
  return value || "Clinică";
}

function filterLabel(value: ClinicFilter) {
  if (value === "all") return "Toate";
  if (value === "clinic") return "Clinici";
  if (value === "home_care") return "Home Care";
  if (value === "approved") return "Aprobate";
  if (value === "pending") return "În așteptare";
  return value;
}

export default function ClinicsPage() {
  const { role, clinicRole } = useAppUser();

  const [rows, setRows] = useState<ClinicLikeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClinicFilter>("all");

  const isAdmin = role === "admin";
  const isProviderLike =
    role === "provider" ||
    clinicRole === "clinic_admin" ||
    clinicRole === "doctor" ||
    clinicRole === "assistant" ||
    clinicRole === "reception";

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const token = getToken();
        let data: ClinicLikeRow[] = [];

        if (isAdmin) {
          data = await apiRequest<ClinicLikeRow[]>("/admin/providers", {
            token,
          });
        } else if (isProviderLike) {
          const me = await apiRequest<ClinicLikeRow>("/providers/me", {
            token,
          });
          data = me ? [me] : [];
        } else {
          data = await apiRequest<ClinicLikeRow[]>("/providers/search-clinics");
        }

        setRows(data ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Nu am putut încărca clinicile.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [isAdmin, isProviderLike]);

  const title = isAdmin
    ? "Clinici & listings"
    : isProviderLike
      ? "Clinica mea"
      : "Clinici disponibile";

  const filteredRows = useMemo(() => {
    const normalized = normalizeText(query);

    return rows.filter((item) => {
      if (filter === "clinic" && item.provider_type !== "clinic") return false;
      if (filter === "home_care" && item.provider_type !== "home_care") {
        return false;
      }
      if (filter === "approved" && item.status !== "approved") return false;
      if (filter === "pending" && item.status !== "pending") return false;

      if (!normalized) return true;
      return searchableClinicText(item).includes(normalized);
    });
  }, [rows, query, filter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const clinics = rows.filter(
      (item) => item.provider_type !== "home_care",
    ).length;
    const homeCare = rows.filter(
      (item) => item.provider_type === "home_care",
    ).length;
    const approved = rows.filter((item) => item.status === "approved").length;
    const pending = rows.filter((item) => item.status === "pending").length;

    return { total, clinics, homeCare, approved, pending };
  }, [rows]);

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
                <Building2 size={16} style={{ marginRight: 8 }} />
                Registry clinici
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                {title}
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 760,
                }}
              >
                {isAdmin
                  ? "Aici vezi lista clinicilor și a listingurilor publice. Pentru aprobare, respingere sau ștergere folosește meniul «Aprobări furnizori», iar aici păstrezi browsing-ul și căutarea."
                  : "Aici vezi clinicile și listingurile relevante pentru contul curent și poți deschide profilul public al furnizorului."}
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
                <strong>Clinici</strong>
                <span>{stats.clinics}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Home Care</strong>
                <span>{stats.homeCare}</span>
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
            <div className="mc-icon-badge">
              <Layers3 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">
            Total entități vizibile în această listă.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Clinici</p>
              <p className="mc-stat-value">{stats.clinics}</p>
            </div>
            <div className="mc-icon-badge">
              <Building2 size={20} />
            </div>
          </div>
          <p className="mc-stat-note">Furnizori clasici de tip clinică.</p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">Home Care</p>
              <p className="mc-stat-value">{stats.homeCare}</p>
            </div>
            <div className="mc-icon-badge">
              <HomeCareIcon />
            </div>
          </div>
          <p className="mc-stat-note">
            Servicii de tip home care listate public.
          </p>
        </Card>

        <Card className="mc-stat-card">
          <div className="mc-stat-top">
            <div>
              <p className="mc-stat-label">În așteptare</p>
              <p className="mc-stat-value">{stats.pending}</p>
            </div>
            <div className="mc-icon-badge">
              <Search size={20} />
            </div>
          </div>
          <p className="mc-stat-note">Entități care încă așteaptă validare.</p>
        </Card>
      </section>

      <section className="mc-dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>Filtrare și căutare</CardTitle>
            <CardDescription>
              Caută după nume, oraș, județ, tip, e-mail, telefon sau status.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ maxWidth: 560 }}>
                <Input
                  id="clinics-search"
                  label="Căutare clinică"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: Medi Center, Cluj, approved..."
                />
              </div>

              <div className="mc-chip-row">
                {(
                  [
                    "all",
                    "clinic",
                    "home_care",
                    "approved",
                    "pending",
                  ] as ClinicFilter[]
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
            <CardTitle>Separare UX</CardTitle>
            <CardDescription>
              Rol clar pentru a evita dublarea percepută dintre meniuri.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-status-row">
              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Clinici & listings</strong>
                  <span>
                    Navigare, căutare și deschidere profil public al
                    furnizorului.
                  </span>
                </div>
              </div>

              {isAdmin ? (
                <div className="mc-status-item">
                  <div className="mc-status-text">
                    <strong>Aprobări furnizori</strong>
                    <span>
                      Flux de aprobare, respingere și ștergere administrativă.
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Recomandare</strong>
                  <span>
                    {filteredRows.length > 0
                      ? "Deschide profilul furnizorului pentru a vedea listingul public și datele relevante."
                      : "Încearcă un termen mai general pentru a găsi clinica dorită."}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Lista clinicilor și a listingurilor disponibile pentru contul
            curent.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}
          {error ? <p className="mc-error-banner">{error}</p> : null}

          {!loading && !error && filteredRows.length === 0 ? (
            <p className="mc-empty-note">
              Nu există clinici disponibile pentru filtrul curent.
            </p>
          ) : null}

          {!loading && !error && filteredRows.length > 0 ? (
            <div className="mc-list">
              {filteredRows.map((item) => {
                const providerId =
                  typeof item.id === "number" ? item.id : item.clinic_id;

                const cardBody = (
                  <>
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
                        <strong>{item.name || `Clinică #${item.id}`}</strong>
                        <span>
                          {providerTypeLabel(item.provider_type)} • status:{" "}
                          {item.status || "n/a"}
                        </span>
                      </div>

                      <span className="mc-page-badge">
                        {providerTypeLabel(item.provider_type)}
                      </span>
                    </div>

                    <span>
                      <MapPin size={14} style={{ marginRight: 6 }} />
                      {[item.city, item.county].filter(Boolean).join(", ") ||
                        "locație indisponibilă"}
                    </span>

                    <span>
                      <Mail size={14} style={{ marginRight: 6 }} />
                      {item.email || "fără email"}
                    </span>

                    <span>
                      <Phone size={14} style={{ marginRight: 6 }} />
                      {item.phone || "fără telefon"}
                    </span>

                    {providerId ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--mc-primary)",
                          fontWeight: 700,
                          marginTop: 6,
                        }}
                      >
                        Deschide profilul public
                        <ArrowRight size={16} />
                      </span>
                    ) : null}
                  </>
                );

                return providerId ? (
                  <Link
                    key={item.id}
                    href={`/providers/${providerId}`}
                    className="mc-list-item"
                    style={{ display: "block" }}
                  >
                    {cardBody}
                  </Link>
                ) : (
                  <div key={item.id} className="mc-list-item">
                    {cardBody}
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function HomeCareIcon() {
  return <Building2 size={20} />;
}
