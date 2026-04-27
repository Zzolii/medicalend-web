// Path: medicalend-web/app/(app)/providers/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProviderDetails = {
  id: number;
  name?: string | null;
  city?: string | null;
  county?: string | null;
  address_line?: string | null;
  provider_type?: string | null;
  specialty?: string | null;
  services_offered?: string | null;
  public_description?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  image_url?: string | null;
  coverage_area?: string | null;
  status?: string | null;
};

type DoctorRow = {
  id: number;
  provider_id?: number | null;
  specialty_id?: number | null;
  specialty_name?: string | null;
  name?: string | null;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
};

type ProviderAvailabilitySlot = {
  start_time: string;
  end_time: string;
  available: boolean;
};

type PatientMe = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
};

type AppointmentCreateResponse = {
  id: number;
};

function toYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function formatWallClockTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toBackendNaiveIso(value?: string | null) {
  if (!value) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mi = String(parsed.getMinutes()).padStart(2, "0");
  const ss = String(parsed.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function providerTypeLabel(value?: string | null) {
  if (value === "home_care") return "Home Care";
  if (value === "clinic") return "Clinică";
  return "Furnizor medical";
}

function providerDisplayName(
  data?: ProviderDetails | null,
  providerId?: number,
) {
  if (data?.name?.trim()) return data.name.trim();
  if (providerId && Number.isFinite(providerId))
    return `Furnizor #${providerId}`;
  return "Furnizor medical";
}

function doctorDisplayName(d: DoctorRow) {
  return (
    `${d.title ? `${d.title} ` : ""}${d.name || ""}`.trim() || `Medic #${d.id}`
  );
}

function doctorSubtitle(d: DoctorRow) {
  return d.specialty_name || "Specialitate indisponibilă";
}

function normalizeError(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

async function tryApi<T>(
  requests: Array<() => Promise<T>>,
  fallbackMessage: string,
) {
  let lastError: unknown = null;

  for (const request of requests) {
    try {
      return await request();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error(fallbackMessage);
}

function buildMonthMatrix(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startWeekday = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells: Array<{ date: Date | null }> = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ date: null });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ date: new Date(year, month, day) });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null });
  }

  const weeks: Array<Array<{ date: Date | null }>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
  });
}

const WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

export default function ProviderDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const providerId = Number(
    Array.isArray(params?.id) ? params.id[0] : params?.id,
  );
  const doctorIdFromQuery = searchParams.get("doctorId");

  const token = getToken();
  const currentUser = getUser();

  const [provider, setProvider] = useState<ProviderDetails | null>(null);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [patientMe, setPatientMe] = useState<PatientMe | null>(null);

  const todayYmd = useMemo(() => toYmd(new Date()), []);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const [slots, setSlots] = useState<ProviderAvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] =
    useState<ProviderAvailabilitySlot | null>(null);

  const [loading, setLoading] = useState(true);
  const [doctorsBusy, setDoctorsBusy] = useState(false);
  const [slotsBusy, setSlotsBusy] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);

  const [error, setError] = useState("");
  const [doctorsError, setDoctorsError] = useState("");
  const [slotsError, setSlotsError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [success, setSuccess] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingNotes, setBookingNotes] = useState("");

  const isPatient = currentUser?.role === "patient";

  const selectedDoctor = useMemo(
    () => doctors.find((item) => item.id === selectedDoctorId) ?? null,
    [doctors, selectedDoctorId],
  );

  const availableSlots = useMemo(
    () => slots.filter((item) => item.available),
    [slots],
  );

  const calendarWeeks = useMemo(
    () => buildMonthMatrix(calendarMonth),
    [calendarMonth],
  );

  useEffect(() => {
    if (!Number.isFinite(providerId) || providerId <= 0) {
      setError("ID de furnizor invalid.");
      setLoading(false);
      return;
    }

    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  useEffect(() => {
    if (!Number.isFinite(providerId) || providerId <= 0) return;
    void loadSlots(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, selectedDate, selectedDoctorId]);

  async function loadProvider() {
    return tryApi<ProviderDetails>(
      [() => apiRequest<ProviderDetails>(`/providers/${providerId}`)],
      "Încărcarea profilului furnizorului a eșuat.",
    );
  }

  async function loadDoctors() {
    return tryApi<DoctorRow[]>(
      [
        () => apiRequest<DoctorRow[]>(`/providers/${providerId}/doctors`),
        () =>
          apiRequest<DoctorRow[]>(
            `/provider-structure/providers/${providerId}/doctors`,
          ),
      ],
      "Încărcarea medicilor a eșuat.",
    );
  }

  async function loadPatientMe() {
    return tryApi<PatientMe>(
      [() => apiRequest<PatientMe>("/patients/me", { token })],
      "Încărcarea profilului pacientului a eșuat.",
    );
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      setDoctorsError("");
      setBookingError("");
      setSuccess("");

      const providerPromise = loadProvider();
      const doctorsPromise = (async () => {
        try {
          setDoctorsBusy(true);
          const rows = await loadDoctors();
          setDoctors(rows ?? []);
          return rows ?? [];
        } catch (err) {
          setDoctors([]);
          setDoctorsError(normalizeError(err, "Încărcarea medicilor a eșuat."));
          return [];
        } finally {
          setDoctorsBusy(false);
        }
      })();

      const patientPromise =
        token && isPatient
          ? loadPatientMe().catch(() => null)
          : Promise.resolve(null);

      const [providerData, doctorRows, patientData] = await Promise.all([
        providerPromise,
        doctorsPromise,
        patientPromise,
      ]);

      setProvider(providerData);
      setPatientMe(patientData);

      if (doctorIdFromQuery) {
        const parsed = Number(doctorIdFromQuery);
        if (
          !Number.isNaN(parsed) &&
          doctorRows.some((item) => item.id === parsed)
        ) {
          setSelectedDoctorId(parsed);
        } else if (doctorRows.length > 0) {
          setSelectedDoctorId(doctorRows[0].id);
        } else {
          setSelectedDoctorId(null);
        }
      } else if (doctorRows.length > 0) {
        setSelectedDoctorId(doctorRows[0].id);
      } else {
        setSelectedDoctorId(null);
      }
    } catch (err) {
      setError(normalizeError(err, "Nu am putut încărca furnizorul."));
    } finally {
      setLoading(false);
    }
  }

  async function loadSlots(dateYmd: string) {
    try {
      setSlotsBusy(true);
      setSlotsError("");
      setSelectedSlot(null);

      const rows = await tryApi<ProviderAvailabilitySlot[]>(
        [
          () =>
            apiRequest<ProviderAvailabilitySlot[]>(
              `/providers/${providerId}/free-slots?date=${encodeURIComponent(dateYmd)}${selectedDoctorId ? `&doctor_id=${selectedDoctorId}` : ""}`,
              { token },
            ),
          () =>
            apiRequest<ProviderAvailabilitySlot[]>(
              `/providers/${providerId}/availability?date=${encodeURIComponent(dateYmd)}${selectedDoctorId ? `&doctor_id=${selectedDoctorId}` : ""}`,
              { token },
            ),
        ],
        "Încărcarea intervalelor disponibile a eșuat.",
      );

      setSlots(rows ?? []);
    } catch (err) {
      setSlots([]);
      setSlotsError(
        normalizeError(err, "Încărcarea intervalelor disponibile a eșuat."),
      );
    } finally {
      setSlotsBusy(false);
    }
  }

  function onPickSlot(slot: ProviderAvailabilitySlot) {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setBookingNotes("");
    setBookingError("");
    setSuccess("");
    setConfirmOpen(true);
  }

  async function confirmBooking() {
    if (!selectedSlot) return;

    if (!token) {
      setBookingError(
        "Trebuie să fii autentificat pentru a face o programare.",
      );
      return;
    }

    if (!isPatient) {
      setBookingError(
        "Programarea directă este disponibilă pentru conturile de pacient.",
      );
      return;
    }

    if (!patientMe?.id) {
      setBookingError("Profilul pacientului nu a putut fi încărcat.");
      return;
    }

    try {
      setBookingBusy(true);
      setBookingError("");
      setSuccess("");

      const payload = {
        patient_id: patientMe.id,
        provider_id: providerId,
        doctor_id: selectedDoctorId,
        start_time: toBackendNaiveIso(selectedSlot.start_time),
        end_time: selectedSlot.end_time
          ? toBackendNaiveIso(selectedSlot.end_time)
          : null,
        status: "scheduled",
        notes: bookingNotes.trim() ? bookingNotes.trim() : null,
      };

      const created = await tryApi<AppointmentCreateResponse>(
        [
          () =>
            apiRequest<AppointmentCreateResponse>("/appointments/", {
              method: "POST",
              token,
              body: payload,
            }),
          () =>
            apiRequest<AppointmentCreateResponse>("/appointments", {
              method: "POST",
              token,
              body: payload,
            }),
        ],
        "Programarea a eșuat.",
      );

      setConfirmOpen(false);
      setSelectedSlot(null);
      setBookingNotes("");
      setSuccess(
        `Programarea #${created.id} a fost creată cu succes pentru ${selectedDate}.`,
      );

      await loadSlots(selectedDate);
    } catch (err) {
      setBookingError(normalizeError(err, "Programarea a eșuat."));
    } finally {
      setBookingBusy(false);
    }
  }

  async function openWebsite(url?: string | null) {
    if (!url?.trim()) return;
    let normalized = url.trim();
    if (
      !normalized.startsWith("http://") &&
      !normalized.startsWith("https://")
    ) {
      normalized = `https://${normalized}`;
    }
    window.open(normalized, "_blank", "noopener,noreferrer");
  }

  function pickCalendarDate(date: Date | null) {
    if (!date) return;
    const ymd = toYmd(date);
    if (ymd < todayYmd) return;
    setSelectedDate(ymd);
  }

  function prevMonth() {
    setCalendarMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      const thisMonth = new Date();
      const currentMonthFloor = new Date(
        thisMonth.getFullYear(),
        thisMonth.getMonth(),
        1,
      );
      if (next < currentMonthFloor) return current;
      return next;
    });
  }

  function nextMonth() {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  }

  if (loading) {
    return (
      <div className="mc-page-shell">
        <Card>
          <CardContent style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--mc-muted)",
              }}
            >
              <Loader2 className="mc-spinner" />
              <span>Se încarcă profilul furnizorului...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="mc-page-shell">
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "var(--mc-primary)",
              fontWeight: 700,
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
            Înapoi
          </button>
        </div>

        <p className="mc-error-banner">
          {error || "Furnizorul nu a putut fi încărcat."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mc-page-shell">
        <section
          className="mc-card"
          style={{
            padding: 24,
            background:
              "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(255,255,255,0.97) 62%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--mc-primary)",
                  fontWeight: 700,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  marginBottom: 14,
                }}
              >
                <ArrowLeft size={16} />
                Înapoi la căutare
              </button>

              <div
                className="mc-page-badge"
                style={{ marginBottom: 12, width: "fit-content" }}
              >
                {providerTypeLabel(provider.provider_type)}
              </div>

              <h2 style={{ margin: 0 }}>
                {providerDisplayName(provider, providerId)}
              </h2>

              <p style={{ marginTop: 12 }}>
                Profil public al furnizorului, medici disponibili, calendar și
                intervale pentru programare.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 16,
                }}
              >
                {provider.city || provider.county ? (
                  <span className="mc-pill mc-pill-neutral">
                    {[provider.city, provider.county]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                ) : null}
                {provider.specialty ? (
                  <span className="mc-pill mc-pill-info">
                    {provider.specialty}
                  </span>
                ) : null}
              </div>
            </div>

            <div style={{ minWidth: 260, maxWidth: 320, flex: 1 }}>
              <div className="mc-list-item" style={{ background: "#fff" }}>
                <strong>Programare online</strong>
                <span>
                  {isPatient
                    ? "Poți selecta medicul, ziua și intervalul direct din această pagină."
                    : "Pentru rezervare directă este necesar un cont de pacient."}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.02fr) minmax(360px, 0.98fr)",
            gap: 18,
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Building2 size={18} />
                    Informații furnizor
                  </span>
                </CardTitle>
                <CardDescription>
                  Datele publice vizibile pentru pacienți.
                </CardDescription>
              </CardHeader>

              <CardContent style={{ display: "grid", gap: 16 }}>
                <div
                  style={{
                    borderRadius: 22,
                    overflow: "hidden",
                    border: "1px solid var(--mc-border)",
                    background:
                      "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(255,255,255,0.98) 62%)",
                  }}
                >
                  {provider.image_url?.trim() ? (
                    <img
                      src={provider.image_url}
                      alt={providerDisplayName(provider, providerId)}
                      style={{
                        width: "100%",
                        height: 220,
                        objectFit: "cover",
                        display: "block",
                        background: "#E2E8F0",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 180,
                        background:
                          "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #4fb3e8 100%)",
                      }}
                    />
                  )}

                  <div style={{ padding: 18 }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: 22,
                        lineHeight: 1.2,
                        color: "var(--mc-text)",
                      }}
                    >
                      {providerDisplayName(provider, providerId)}
                    </strong>

                    {provider.public_description ? (
                      <p
                        style={{
                          margin: "10px 0 0",
                          color: "var(--mc-muted)",
                          lineHeight: 1.65,
                        }}
                      >
                        {provider.public_description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mc-list-item">
                  <strong>
                    <MapPin size={15} style={{ marginRight: 6 }} />
                    Locație
                  </strong>
                  <span>
                    {[provider.address_line, provider.city, provider.county]
                      .filter(Boolean)
                      .join(", ") || "Locație indisponibilă"}
                  </span>
                </div>

                {provider.services_offered ? (
                  <div className="mc-muted-block">
                    <strong style={{ color: "var(--mc-text)" }}>
                      Servicii
                    </strong>
                    <span>{provider.services_offered}</span>
                  </div>
                ) : null}

                <div className="mc-form-grid-2">
                  <div className="mc-list-item">
                    <strong>
                      <Phone size={15} style={{ marginRight: 6 }} />
                      Telefon
                    </strong>
                    <span>{provider.phone || "Nespecificat"}</span>
                  </div>

                  <div className="mc-list-item">
                    <strong>
                      <Mail size={15} style={{ marginRight: 6 }} />
                      Email
                    </strong>
                    <span>{provider.email || "Nespecificat"}</span>
                  </div>
                </div>

                {provider.website ? (
                  <Button onClick={() => openWebsite(provider.website)}>
                    <Globe size={16} />
                    <span style={{ marginLeft: 8 }}>Deschide website-ul</span>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Stethoscope size={18} />
                    Alege medicul
                  </span>
                </CardTitle>
                <CardDescription>
                  Dacă nu alegi altul, este selectat primul medic disponibil.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {doctorsBusy ? (
                  <div className="mc-muted-block">
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 className="mc-spinner" />
                      Se încarcă medicii...
                    </span>
                  </div>
                ) : doctorsError ? (
                  <p className="mc-error-banner">{doctorsError}</p>
                ) : doctors.length === 0 ? (
                  <div className="mc-muted-block">
                    <span>
                      Nu există listă publică de medici. Programarea se poate
                      face la nivel de furnizor.
                    </span>
                  </div>
                ) : (
                  <div className="mc-list">
                    {doctors.map((doctor) => {
                      const active = selectedDoctorId === doctor.id;

                      return (
                        <button
                          key={doctor.id}
                          type="button"
                          className="mc-list-item"
                          onClick={() => setSelectedDoctorId(doctor.id)}
                          style={{
                            textAlign: "left",
                            border: active
                              ? "1px solid var(--mc-primary)"
                              : "1px solid var(--mc-border)",
                            background: active
                              ? "var(--mc-primary-soft)"
                              : "var(--mc-surface-2)",
                            cursor: "pointer",
                          }}
                        >
                          <strong>
                            <UserRound size={14} style={{ marginRight: 6 }} />
                            {doctorDisplayName(doctor)}
                          </strong>
                          <span>{doctorSubtitle(doctor)}</span>
                          {active ? (
                            <span
                              style={{
                                color: "var(--mc-primary)",
                                fontWeight: 700,
                                marginTop: 4,
                              }}
                            >
                              Selectat
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CalendarDays size={18} />
                    Alege ziua
                  </span>
                </CardTitle>
                <CardDescription>
                  Selectează ziua pentru care vrei să vezi sloturile
                  disponibile.
                </CardDescription>
              </CardHeader>

              <CardContent style={{ display: "grid", gap: 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Button onClick={prevMonth}>Luna anterioară</Button>
                  <strong style={{ fontSize: 16, textTransform: "capitalize" }}>
                    {monthLabel(calendarMonth)}
                  </strong>
                  <Button onClick={nextMonth}>Luna următoare</Button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {WEEKDAY_LABELS.map((label) => (
                    <div
                      key={label}
                      style={{
                        textAlign: "center",
                        fontWeight: 800,
                        color: "var(--mc-muted)",
                        padding: "6px 0",
                      }}
                    >
                      {label}
                    </div>
                  ))}

                  {calendarWeeks.flat().map((cell, idx) => {
                    const ymd = cell.date ? toYmd(cell.date) : null;
                    const isPast = ymd ? ymd < todayYmd : false;
                    const isSelected = ymd === selectedDate;

                    return (
                      <button
                        key={`${ymd ?? "empty"}-${idx}`}
                        type="button"
                        disabled={!cell.date || isPast}
                        onClick={() => pickCalendarDate(cell.date)}
                        style={{
                          height: 46,
                          borderRadius: 12,
                          border: isSelected
                            ? "1px solid var(--mc-primary)"
                            : "1px solid var(--mc-border)",
                          background: !cell.date
                            ? "transparent"
                            : isSelected
                              ? "var(--mc-primary-soft)"
                              : "#fff",
                          color: !cell.date
                            ? "transparent"
                            : isPast
                              ? "#94A3B8"
                              : "var(--mc-text)",
                          fontWeight: isSelected ? 900 : 700,
                          cursor:
                            !cell.date || isPast ? "not-allowed" : "pointer",
                          opacity: !cell.date ? 0 : isPast ? 0.45 : 1,
                        }}
                      >
                        {cell.date ? cell.date.getDate() : ""}
                      </button>
                    );
                  })}
                </div>

                <div className="mc-info-banner">
                  <CalendarDays size={16} />
                  Data selectată: <strong>{selectedDate}</strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Clock3 size={18} />
                    Intervale disponibile
                  </span>
                </CardTitle>
                <CardDescription>
                  Alege intervalul dorit pentru a continua programarea.
                </CardDescription>
              </CardHeader>

              <CardContent style={{ display: "grid", gap: 14 }}>
                {selectedDoctor ? (
                  <div className="mc-muted-block">
                    <strong style={{ color: "var(--mc-text)" }}>
                      Medic selectat
                    </strong>
                    <span>{doctorDisplayName(selectedDoctor)}</span>
                  </div>
                ) : null}

                {slotsBusy ? (
                  <div className="mc-muted-block">
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Loader2 className="mc-spinner" />
                      Se încarcă intervalele...
                    </span>
                  </div>
                ) : slotsError ? (
                  <p className="mc-error-banner">{slotsError}</p>
                ) : availableSlots.length === 0 ? (
                  <div className="mc-warning-banner">
                    <Clock3 size={16} />
                    Nu există intervale disponibile pentru ziua selectată.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div className="mc-chip-row">
                      {availableSlots.map((slot, idx) => {
                        const active =
                          selectedSlot?.start_time === slot.start_time &&
                          selectedSlot?.end_time === slot.end_time;

                        return (
                          <button
                            key={`${slot.start_time}-${idx}`}
                            type="button"
                            className={
                              active ? "mc-chip mc-chip-active" : "mc-chip"
                            }
                            onClick={() => {
                              setSelectedSlot(slot);
                              setBookingError("");
                              setSuccess("");
                            }}
                          >
                            {formatWallClockTime(slot.start_time)}–
                            {formatWallClockTime(slot.end_time)}
                          </button>
                        );
                      })}
                    </div>

                    {selectedSlot ? (
                      <div
                        style={{
                          padding: 14,
                          borderRadius: 16,
                          border: "1px solid #BFDBFE",
                          background: "#EFF6FF",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <strong style={{ color: "#1D4ED8" }}>
                          Interval selectat
                        </strong>
                        <span style={{ color: "#1E3A8A" }}>
                          {formatDateTime(selectedSlot.start_time)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}

                {bookingError ? (
                  <p className="mc-error-banner">{bookingError}</p>
                ) : null}
                {success ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid #BBF7D0",
                      background: "#F0FDF4",
                      color: "#166534",
                      lineHeight: 1.55,
                      fontSize: 14,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <CheckCircle2 size={16} />
                      {success}
                    </span>
                  </div>
                ) : null}

                {!isPatient ? (
                  <div className="mc-warning-banner">
                    Pentru a rezerva online, autentifică-te cu un cont de
                    pacient.
                  </div>
                ) : null}

                <Button
                  onClick={() => {
                    if (!selectedSlot) {
                      setBookingError("Selectează un interval disponibil.");
                      return;
                    }
                    setConfirmOpen(true);
                  }}
                  disabled={
                    !selectedSlot || !isPatient || !patientMe?.id || bookingBusy
                  }
                >
                  Confirmă programarea
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {confirmOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: "#fff",
              borderRadius: 24,
              border: "1px solid var(--mc-border)",
              boxShadow: "var(--mc-shadow)",
              padding: 20,
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  lineHeight: 1.2,
                  color: "var(--mc-text)",
                }}
              >
                Confirmă programarea
              </h3>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.6,
                }}
              >
                Verifică detaliile înainte de confirmare.
              </p>
            </div>

            <div className="mc-muted-block">
              <strong style={{ color: "var(--mc-text)" }}>
                {providerDisplayName(provider, providerId)}
              </strong>
              <span>Data: {selectedDate}</span>
              <span>
                Medic:{" "}
                {selectedDoctor
                  ? doctorDisplayName(selectedDoctor)
                  : "Nespecificat"}
              </span>
              <span>
                Interval:{" "}
                {selectedSlot
                  ? `${formatWallClockTime(selectedSlot.start_time)}–${formatWallClockTime(selectedSlot.end_time)}`
                  : "-"}
              </span>
            </div>

            <div className="mc-field">
              <label className="mc-label" htmlFor="booking-notes">
                Motiv / detalii (opțional)
              </label>
              <textarea
                id="booking-notes"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Ex.: control, simptome, consult..."
                disabled={bookingBusy}
                style={{
                  width: "100%",
                  minHeight: 110,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid var(--mc-border)",
                  outline: "none",
                  resize: "vertical",
                  font: "inherit",
                  color: "var(--mc-text)",
                  background: "#fff",
                }}
              />
            </div>

            {bookingError ? (
              <p className="mc-error-banner">{bookingError}</p>
            ) : null}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Button
                onClick={() => {
                  if (!bookingBusy) setConfirmOpen(false);
                }}
                disabled={bookingBusy}
              >
                Anulează
              </Button>

              <Button onClick={confirmBooking} disabled={bookingBusy}>
                {bookingBusy ? "Se rezervă..." : "Rezervă acum"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
