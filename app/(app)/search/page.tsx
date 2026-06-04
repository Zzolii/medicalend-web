// Path: medicalend-web/app/(app)/search/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  MapPin,
  Search,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAppUser } from "@/components/user-context";
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
  city?: string | null;
  county?: string | null;
};

type ClinicRow = {
  id: number;
  name?: string | null;
  city?: string | null;
  county?: string | null;
  provider_type?: string | null;
};

type DoctorRow = {
  doctor_id: number;
  doctor_name?: string | null;
  doctor_title?: string | null;
  specialty_name?: string | null;
  provider_name?: string | null;
  provider_id?: number | null;
  city?: string | null;
  county?: string | null;
};

type SearchFilter = "all" | "clinic" | "home_care" | "doctor" | "patient";

const SPECIALTY_OPTIONS = [
  "Alergologie",
  "Anestezie și terapie intensivă",
  "Cardiologie",
  "Chirurgie generală",
  "Chirurgie pediatrică",
  "Chirurgie plastică",
  "Dermatologie",
  "Diabet și boli de nutriție",
  "Endocrinologie",
  "Gastroenterologie",
  "Geriatrie",
  "Ginecologie",
  "Hematologie",
  "Kinetoterapie",
  "Medicină de familie",
  "Medicină generală",
  "Medicină internă",
  "Medicina muncii",
  "Nefrologie",
  "Neurologie",
  "Neurologie pediatrică",
  "Obstetrică-ginecologie",
  "Oftalmologie",
  "Oncologie",
  "ORL",
  "Ortopedie",
  "Ortopedie pediatrică",
  "Pediatrie",
  "Pneumologie",
  "Psihiatrie",
  "Psihiatrie pediatrică",
  "Psihologie",
  "Psihologie pediatrică",
  "Recuperare medicală",
  "Reumatologie",
  "Stomatologie",
  "Urologie",
] as const;

function fullPatientName(item: PatientRow) {
  return [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
}

function filterLabel(value: SearchFilter) {
  if (value === "all") return "Toate";
  if (value === "clinic") return "Clinici";
  if (value === "home_care") return "Home Care";
  if (value === "doctor") return "Medici";
  if (value === "patient") return "Pacienți";
  return value;
}

function filterDescription(value: SearchFilter) {
  if (value === "clinic") {
    return "Caută doar clinici și centre medicale.";
  }

  if (value === "home_care") {
    return "Caută furnizori de îngrijire la domiciliu.";
  }

  if (value === "doctor") {
    return "Caută direct medici după nume, specialitate, oraș sau județ.";
  }

  if (value === "patient") {
    return "Caută pacienți vizibili conform permisiunilor contului curent.";
  }

  return "Caută simultan clinici, Home Care și medici.";
}

function searchLabel(value: SearchFilter) {
  if (value === "doctor") return "Nume medic";
  if (value === "clinic") return "Nume clinică";
  if (value === "home_care") return "Nume furnizor Home Care";
  if (value === "patient") return "Nume pacient";
  return "Nume clinică / medic / home care";
}

function searchPlaceholder(value: SearchFilter) {
  if (value === "doctor") return "Ex: Fejer Botond";
  if (value === "clinic") return "Ex: Medi Center";
  if (value === "home_care") return "Ex: Home Care";
  if (value === "patient") return "Ex: Popescu Maria";
  return "Ex: Medi Center, Fejer Botond";
}

function normalizeText(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const cleaned = value.trim();
    if (cleaned) {
      query.set(key, cleaned);
    }
  });

  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function specialtyMatchesExactly(
  specialtyName: string | null | undefined,
  wantedSpecialty: string,
) {
  const wanted = normalizeText(wantedSpecialty);
  if (!wanted) return true;

  const normalizedSpecialty = normalizeText(specialtyName);
  if (!normalizedSpecialty) return false;

  return normalizedSpecialty === wanted;
}

function SpecialtyAutocomplete({
  value,
  onChange,
  placeholder = "Ex: Urologie",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const filteredOptions = useMemo(() => {
    const q = normalizeText(value);
    if (!q) return [...SPECIALTY_OPTIONS];

    const startsWith = SPECIALTY_OPTIONS.filter((item) =>
      normalizeText(item).startsWith(q),
    );

    const contains = SPECIALTY_OPTIONS.filter((item) => {
      const normalized = normalizeText(item);
      return normalized.includes(q) && !normalized.startsWith(q);
    });

    return [...startsWith, ...contains];
  }, [value]);

  function scheduleClose() {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 120);
  }

  function cancelClose() {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <label
        htmlFor="search-specialty"
        className="mc-label"
        style={{ display: "block", marginBottom: 8 }}
      >
        Specialitate
      </label>

      <div style={{ position: "relative" }}>
        <input
          id="search-specialty"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={scheduleClose}
          placeholder={placeholder}
          className="mc-input"
          autoComplete="off"
          style={{ paddingRight: value ? 74 : 42 }}
        />

        {value ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            aria-label="Șterge specialitatea"
            style={{
              position: "absolute",
              right: 38,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              color: "var(--mc-muted)",
              display: "grid",
              placeItems: "center",
              padding: 0,
              width: 20,
              height: 20,
            }}
          >
            <X size={16} />
          </button>
        ) : null}

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Deschide lista de specialități"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: "var(--mc-muted)",
            display: "grid",
            placeItems: "center",
            padding: 0,
            width: 20,
            height: 20,
          }}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {open ? (
        <div
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          style={{
            position: "absolute",
            zIndex: 30,
            left: 0,
            right: 0,
            top: "calc(100% + 8px)",
            background: "#fff",
            border: "1px solid var(--mc-border)",
            borderRadius: 16,
            boxShadow: "var(--mc-shadow)",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {filteredOptions.length === 0 ? (
            <div
              style={{
                padding: 12,
                color: "var(--mc-muted)",
                fontSize: 14,
              }}
            >
              Nu există potriviri.
            </div>
          ) : (
            filteredOptions.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  border: "none",
                  background: "transparent",
                  borderBottom:
                    index === filteredOptions.length - 1
                      ? "none"
                      : "1px solid var(--mc-border)",
                  color: "var(--mc-text)",
                  fontWeight: 700,
                }}
              >
                {item}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  const { role } = useAppUser();
  const userRole = String(role || "");

  const [query, setQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [countyFilter, setCountyFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [hasSearched, setHasSearched] = useState(false);

  const canSearchPatients = useMemo(
    () =>
      [
        "provider",
        "admin",
        "clinic_admin",
        "doctor",
        "assistant",
        "reception",
        "receptionist",
      ].includes(userRole),
    [userRole],
  );

  const availableFilters = useMemo(() => {
    if (canSearchPatients) {
      return [
        "all",
        "clinic",
        "home_care",
        "doctor",
        "patient",
      ] as SearchFilter[];
    }

    return ["all", "clinic", "home_care", "doctor"] as SearchFilter[];
  }, [canSearchPatients]);

  const clinicOnlyRows = useMemo(
    () => clinics.filter((item) => item.provider_type !== "home_care"),
    [clinics],
  );

  const homeCareRows = useMemo(
    () => clinics.filter((item) => item.provider_type === "home_care"),
    [clinics],
  );

  const normalizedCity = normalizeText(cityFilter);
  const normalizedCounty = normalizeText(countyFilter);
  const normalizedSpecialty = normalizeText(specialtyFilter);

  function clinicMatchesLocation(item: ClinicRow) {
    const cityOk = !normalizedCity
      ? true
      : normalizeText(item.city).includes(normalizedCity);

    const countyOk = !normalizedCounty
      ? true
      : normalizeText(item.county).includes(normalizedCounty);

    return cityOk && countyOk;
  }

  function doctorMatchesExtra(item: DoctorRow) {
    const cityOk = !normalizedCity
      ? true
      : normalizeText(item.city).includes(normalizedCity);

    const countyOk = !normalizedCounty
      ? true
      : normalizeText(item.county).includes(normalizedCounty);

    const specialtyOk = !normalizedSpecialty
      ? true
      : specialtyMatchesExactly(item.specialty_name, specialtyFilter);

    return cityOk && countyOk && specialtyOk;
  }

  const visibleClinics = useMemo(() => {
    const source =
      filter === "clinic"
        ? clinicOnlyRows
        : filter === "home_care"
          ? homeCareRows
          : filter === "all"
            ? clinics
            : [];

    return source.filter(clinicMatchesLocation);
  }, [
    filter,
    clinicOnlyRows,
    homeCareRows,
    clinics,
    normalizedCity,
    normalizedCounty,
  ]);

  const visibleDoctors = useMemo(() => {
    const source = filter === "all" || filter === "doctor" ? doctors : [];
    return source.filter(doctorMatchesExtra);
  }, [filter, doctors, normalizedCity, normalizedCounty, normalizedSpecialty]);

  const visiblePatients = useMemo(() => {
    if (!canSearchPatients) return [];
    const source = filter === "all" || filter === "patient" ? patients : [];

    return source.filter((item) => {
      const cityOk = !normalizedCity
        ? true
        : normalizeText(item.city).includes(normalizedCity);

      const countyOk = !normalizedCounty
        ? true
        : normalizeText(item.county).includes(normalizedCounty);

      return cityOk && countyOk;
    });
  }, [canSearchPatients, filter, patients, normalizedCity, normalizedCounty]);

  const totalVisibleResults =
    visibleClinics.length + visibleDoctors.length + visiblePatients.length;

  function handleFilterChange(nextFilter: SearchFilter) {
    setFilter(nextFilter);
    setError("");
  }

  async function handleSearch() {
    try {
      setLoading(true);
      setError("");
      setHasSearched(true);

      const trimmed = query.trim();
      const token = getToken();

      const shouldSearchClinics =
        filter === "all" || filter === "clinic" || filter === "home_care";
      const shouldSearchDoctors = filter === "all" || filter === "doctor";
      const shouldSearchPatients =
        canSearchPatients && (filter === "all" || filter === "patient");

      if (!shouldSearchClinics) {
        setClinics([]);
      }

      if (!shouldSearchDoctors) {
        setDoctors([]);
      }

      if (!shouldSearchPatients) {
        setPatients([]);
      }

      const tasks: Promise<unknown>[] = [];

      if (shouldSearchClinics) {
        if (filter === "home_care") {
          tasks.push(
            apiRequest<ClinicRow[]>(
              `/providers/search-homecare${buildQuery({
                name: trimmed,
                city: cityFilter,
                county: countyFilter,
                service: specialtyFilter,
                coverage_area: cityFilter || countyFilter,
              })}`,
            ).then((rows) => setClinics(rows ?? [])),
          );
        } else if (filter === "clinic") {
          tasks.push(
            apiRequest<ClinicRow[]>(
              `/providers/search-clinics${buildQuery({
                name: trimmed,
                city: cityFilter,
                county: countyFilter,
                specialty: specialtyFilter,
              })}`,
            ).then((rows) => setClinics(rows ?? [])),
          );
        } else {
          tasks.push(
            apiRequest<ClinicRow[]>(
              `/providers/search${buildQuery({
                name: trimmed,
                city: cityFilter,
                county: countyFilter,
              })}`,
            ).then((rows) => setClinics(rows ?? [])),
          );
        }
      }

      if (shouldSearchDoctors) {
        tasks.push(
          apiRequest<DoctorRow[]>(
            `/providers/search-doctors${buildQuery({
              doctor_name: trimmed,
              city: cityFilter,
              county: countyFilter,
              specialty: specialtyFilter,
            })}`,
          ).then((rows) => setDoctors(rows ?? [])),
        );
      }

      if (shouldSearchPatients) {
        tasks.push(
          apiRequest<PatientRow[]>(
            `/patients/search${buildQuery({
              name: trimmed,
              city: cityFilter,
              county: countyFilter,
            })}`,
            { token },
          ).then((rows) => setPatients(rows ?? [])),
        );
      }

      await Promise.all(tasks);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu am putut efectua căutarea.",
      );
    } finally {
      setLoading(false);
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
            <div style={{ maxWidth: 860, width: "100%" }}>
              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <Search size={16} style={{ marginRight: 8 }} />
                Căutare globală
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                Clinici, Home Care și Medici
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 760,
                }}
              >
                {filterDescription(filter)}
              </p>

              <div className="mc-chip-row" style={{ marginTop: 14 }}>
                {availableFilters.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      filter === value ? "mc-chip mc-chip-active" : "mc-chip"
                    }
                    onClick={() => handleFilterChange(value)}
                  >
                    {filterLabel(value)}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0, 1.45fr) minmax(180px, 0.75fr) minmax(180px, 0.75fr) minmax(220px, 0.9fr) auto",
                  gap: 12,
                  marginTop: 18,
                  alignItems: "end",
                }}
              >
                <Input
                  id="search"
                  label={searchLabel(filter)}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder(filter)}
                />

                <Input
                  id="search-city"
                  label="Oraș"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Ex: Cluj"
                />

                <Input
                  id="search-county"
                  label="Județ"
                  value={countyFilter}
                  onChange={(e) => setCountyFilter(e.target.value)}
                  placeholder="Ex: Cluj"
                />

                <SpecialtyAutocomplete
                  value={specialtyFilter}
                  onChange={setSpecialtyFilter}
                  placeholder={
                    filter === "doctor"
                      ? "Ex: Urologie"
                      : filter === "home_care"
                        ? "Ex: îngrijire la domiciliu"
                        : "Opțional pentru medici"
                  }
                />

                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? "Se caută..." : "Caută"}
                </Button>
              </div>

              {error ? (
                <p className="mc-error-banner" style={{ marginTop: 14 }}>
                  {error}
                </p>
              ) : null}
            </div>

            <div
              style={{
                minWidth: 260,
                maxWidth: 320,
                flex: 1,
                display: "grid",
                gap: 12,
              }}
            >
              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Rezultate vizibile</strong>
                <span>{totalVisibleResults}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Clinici</strong>
                <span>
                  {
                    visibleClinics.filter(
                      (x) => x.provider_type !== "home_care",
                    ).length
                  }
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Home Care</strong>
                <span>
                  {
                    visibleClinics.filter(
                      (x) => x.provider_type === "home_care",
                    ).length
                  }
                </span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Medici</strong>
                <span>{visibleDoctors.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasSearched ? (
        <Card>
          <CardContent>
            <p className="mc-empty-note">
              Alege tipul de căutare și apasă Caută pentru a vedea rezultatele.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {(filter === "all" || filter === "clinic") && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Building2 size={18} />
                Clinici
              </span>
            </CardTitle>
            <CardDescription>
              Rezultate de tip clinică, cu acces direct spre profil și
              programare.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {visibleClinics.filter((item) => item.provider_type !== "home_care")
              .length === 0 ? (
              <p className="mc-empty-note">Niciun rezultat.</p>
            ) : (
              <div className="mc-list">
                {visibleClinics
                  .filter((item) => item.provider_type !== "home_care")
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={`/providers/${item.id}`}
                      className="mc-list-item"
                      style={{ display: "block" }}
                    >
                      <strong>{item.name || `Clinică #${item.id}`}</strong>
                      <span>
                        <MapPin size={14} style={{ marginRight: 6 }} />
                        {[item.city, item.county].filter(Boolean).join(", ") ||
                          "locație indisponibilă"}
                      </span>
                      <span>clinic</span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--mc-primary)",
                          fontWeight: 700,
                          marginTop: 4,
                        }}
                      >
                        Vezi profilul și sloturile
                        <ArrowRight size={15} />
                      </span>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(filter === "all" || filter === "home_care") && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Building2 size={18} />
                Home Care
              </span>
            </CardTitle>
            <CardDescription>
              Servicii home care disponibile pentru programare și contact.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {visibleClinics.filter((item) => item.provider_type === "home_care")
              .length === 0 ? (
              <p className="mc-empty-note">Niciun rezultat.</p>
            ) : (
              <div className="mc-list">
                {visibleClinics
                  .filter((item) => item.provider_type === "home_care")
                  .map((item) => (
                    <Link
                      key={item.id}
                      href={`/providers/${item.id}`}
                      className="mc-list-item"
                      style={{ display: "block" }}
                    >
                      <strong>{item.name || `Home Care #${item.id}`}</strong>
                      <span>
                        <MapPin size={14} style={{ marginRight: 6 }} />
                        {[item.city, item.county].filter(Boolean).join(", ") ||
                          "locație indisponibilă"}
                      </span>
                      <span>home care</span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--mc-primary)",
                          fontWeight: 700,
                          marginTop: 4,
                        }}
                      >
                        Vezi profilul și sloturile
                        <ArrowRight size={15} />
                      </span>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(filter === "all" || filter === "doctor") && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Stethoscope size={18} />
                Medici
              </span>
            </CardTitle>
            <CardDescription>
              Deschide profilul furnizorului direct pe medicul selectat.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {visibleDoctors.length === 0 ? (
              <p className="mc-empty-note">Niciun rezultat.</p>
            ) : (
              <div className="mc-list">
                {visibleDoctors.map((item) => {
                  const targetProviderId =
                    typeof item.provider_id === "number" &&
                    Number.isFinite(item.provider_id)
                      ? item.provider_id
                      : null;

                  return targetProviderId ? (
                    <Link
                      key={`${item.doctor_id}-${targetProviderId}`}
                      href={`/providers/${targetProviderId}?doctorId=${item.doctor_id}`}
                      className="mc-list-item"
                      style={{ display: "block" }}
                    >
                      <strong>
                        {[item.doctor_title, item.doctor_name]
                          .filter(Boolean)
                          .join(" ") || `Doctor #${item.doctor_id}`}
                      </strong>
                      <span>
                        {item.specialty_name || "specialitate indisponibilă"}
                      </span>
                      <span>
                        <MapPin size={14} style={{ marginRight: 6 }} />
                        {item.provider_name || "fără clinică"} •{" "}
                        {[item.city, item.county].filter(Boolean).join(", ") ||
                          "locație indisponibilă"}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--mc-primary)",
                          fontWeight: 700,
                          marginTop: 4,
                        }}
                      >
                        Deschide profilul furnizorului
                        <ArrowRight size={15} />
                      </span>
                    </Link>
                  ) : (
                    <div
                      key={`doctor-${item.doctor_id}`}
                      className="mc-list-item"
                    >
                      <strong>
                        {[item.doctor_title, item.doctor_name]
                          .filter(Boolean)
                          .join(" ") || `Doctor #${item.doctor_id}`}
                      </strong>
                      <span>
                        {item.specialty_name || "specialitate indisponibilă"}
                      </span>
                      <span>
                        {item.provider_name || "fără clinică"} •{" "}
                        {[item.city, item.county].filter(Boolean).join(", ") ||
                          "locație indisponibilă"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canSearchPatients && (filter === "all" || filter === "patient") && (
        <Card>
          <CardHeader>
            <CardTitle>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <Users size={18} />
                Pacienți
              </span>
            </CardTitle>
            <CardDescription>
              Vizibili conform permisiunilor contului curent.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {visiblePatients.length === 0 ? (
              <p className="mc-empty-note">Niciun rezultat.</p>
            ) : (
              <div className="mc-list">
                {visiblePatients.map((item) => {
                  const name = fullPatientName(item);

                  return (
                    <Link
                      key={item.id}
                      href={`/patients/${item.id}`}
                      className="mc-list-item"
                      style={{ display: "block" }}
                    >
                      <strong>{name || `Pacient #${item.id}`}</strong>
                      <span>{item.email || "fără email"}</span>
                      <span>
                        {[item.city, item.county].filter(Boolean).join(", ") ||
                          "locație indisponibilă"}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: "var(--mc-primary)",
                          fontWeight: 700,
                          marginTop: 4,
                        }}
                      >
                        Deschide profilul
                        <ArrowRight size={15} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
