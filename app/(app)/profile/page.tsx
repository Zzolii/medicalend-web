// Path: medicalend-web/app/(app)/profile/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  LockKeyhole,
  Mail,
  Save,
  Trash2,
  UserCog,
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

type ClinicMembership = {
  id?: number;
  clinic_id?: number;
  role?: string | null;
  is_active?: boolean;
  provider_doctor_id?: number | null;
};

type UserWithMemberships = {
  id: number;
  email?: string;
  role?: string;
  is_active?: boolean;
  clinic_memberships?: ClinicMembership[];
};

type PatientMe = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line?: string | null;
  city?: string | null;
  county?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

type ProviderMe = {
  id: number;
  clinic_id?: number | null;
  name?: string | null;
  provider_type?: string | null;
  website?: string | null;
  public_description?: string | null;
  specialty?: string | null;
  services_offered?: string | null;
  phone?: string | null;
  contact_person_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_line?: string | null;
  city?: string | null;
  county?: string | null;
  postal_code?: string | null;
  coverage_area?: string | null;
};

type ProviderDoctorOut = {
  id: number;
  specialty_id?: number | null;
  specialty_name?: string | null;
  name: string;
  title?: string | null;
  license_number?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
};

type ProviderStructureOut = {
  doctors?: ProviderDoctorOut[];
};

type SlotDurationMinutes = 5 | 10 | 15 | 20 | 30;

type ProviderWeeklyAvailabilityOut = {
  id: number;
  doctor_id?: number | null;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes?: SlotDurationMinutes | number | null;
};

type ProviderAvailabilityExceptionOut = {
  id: number;
  doctor_id?: number | null;
  date: string;
  is_closed: boolean;
  start_time?: string | null;
  end_time?: string | null;
  note?: string | null;
};

const SLOT_DURATION_OPTIONS: SlotDurationMinutes[] = [5, 10, 15, 20, 30];

const WEEKDAYS = [
  { value: 0, label: "Luni" },
  { value: 1, label: "Marți" },
  { value: 2, label: "Miercuri" },
  { value: 3, label: "Joi" },
  { value: 4, label: "Vineri" },
  { value: 5, label: "Sâmbătă" },
  { value: 6, label: "Duminică" },
] as const;

function roleLabel(role?: string | null) {
  switch (role) {
    case "admin":
      return "Administrator platformă";
    case "provider":
      return "Furnizor";
    case "patient":
      return "Pacient";
    case "clinic_admin":
      return "Administrator clinică";
    case "doctor":
      return "Medic";
    case "assistant":
      return "Asistent";
    case "reception":
      return "Recepție";
    case "receptionist":
      return "Recepție";
    default:
      return role || "-";
  }
}

function cleanText(v: string) {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

function cleanPostal(v: string) {
  return (v ?? "").replace(/\s+/g, "").trim();
}

function normalizeDateInput(value: string) {
  const raw = cleanText(value);
  if (!raw) return "";
  return raw.replace(/[.\s/]+/g, "-");
}

function getErrorStatus(err: unknown) {
  const maybe = err as {
    status?: number;
    response?: { status?: number };
  };

  return maybe?.status ?? maybe?.response?.status ?? null;
}

function isNotFoundError(err: unknown) {
  const status = getErrorStatus(err);
  if (status === 404) return true;

  const text =
    err instanceof Error
      ? err.message
      : String((err as { message?: unknown })?.message ?? "");

  return text.trim().toLowerCase() === "not found";
}

function extractApiError(e: any): string {
  if (isNotFoundError(e)) {
    return "Secțiunea cerută nu este disponibilă pentru acest cont.";
  }

  const detail = e?.response?.data?.detail;

  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const loc = Array.isArray(first?.loc) ? first.loc.join(".") : "field";
    const msg = String(first?.msg ?? "Validation error");
    return `${loc}: ${msg}`;
  }

  if (typeof detail === "string") return detail;
  return String(e?.message || "Operațiunea a eșuat.");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ro-RO");
  } catch {
    return value;
  }
}

function doctorDisplayName(doctor?: ProviderDoctorOut | null) {
  if (!doctor) return "Program clinic general";
  const title = doctor.title?.trim() ? `${doctor.title.trim()} ` : "";
  return `${title}${doctor.name}`.trim();
}

function weekdayLabel(weekday: number) {
  return WEEKDAYS.find((w) => w.value === weekday)?.label ?? `Zi ${weekday}`;
}

function normalizeTimeInput(value: string) {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  if (/^\d{2}:\d{2}$/.test(cleaned)) return cleaned;
  return cleaned.slice(0, 5);
}

async function tryApi<T>(
  requests: Array<() => Promise<T>>,
  fallbackMessage: string,
): Promise<T> {
  let lastError: unknown = null;

  for (const request of requests) {
    try {
      return await request();
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(fallbackMessage);
}

async function fetchProviderStructure(token: string | null) {
  return tryApi<ProviderStructureOut>(
    [
      () =>
        apiRequest<ProviderStructureOut>("/providers/me/structure/", {
          token,
        }),
      () =>
        apiRequest<ProviderStructureOut>("/providers/me/structure", {
          token,
        }),
    ],
    "Încărcarea structurii providerului a eșuat.",
  );
}

async function fetchMyWeeklyAvailability(
  token: string | null,
  doctorId?: number | null,
) {
  const qs = new URLSearchParams();
  if (typeof doctorId === "number") qs.set("doctor_id", String(doctorId));

  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return tryApi<ProviderWeeklyAvailabilityOut[]>(
    [
      () =>
        apiRequest<ProviderWeeklyAvailabilityOut[]>(
          `/providers/me/availability${suffix}`,
          { token },
        ),
      () =>
        apiRequest<ProviderWeeklyAvailabilityOut[]>(
          `/providers/me/availability/${suffix}`,
          { token },
        ),
    ],
    "Încărcarea programului săptămânal a eșuat.",
  );
}

async function fetchMyAvailabilityExceptions(
  token: string | null,
  doctorId?: number | null,
) {
  const qs = new URLSearchParams();
  if (typeof doctorId === "number") qs.set("doctor_id", String(doctorId));

  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return tryApi<ProviderAvailabilityExceptionOut[]>(
    [
      () =>
        apiRequest<ProviderAvailabilityExceptionOut[]>(
          `/providers/me/availability/exceptions${suffix}`,
          { token },
        ),
      () =>
        apiRequest<ProviderAvailabilityExceptionOut[]>(
          `/providers/me/availability/exceptions/${suffix}`,
          { token },
        ),
    ],
    "Încărcarea excepțiilor de program a eșuat.",
  );
}

async function upsertMyWeeklyAvailability(
  token: string | null,
  payload: {
    doctor_id?: number | null;
    weekday: number;
    start_time: string;
    end_time: string;
    slot_duration_minutes: SlotDurationMinutes;
  },
) {
  return tryApi(
    [
      () =>
        apiRequest("/providers/me/availability", {
          method: "POST",
          token,
          body: payload,
        }),
      () =>
        apiRequest("/providers/me/availability/", {
          method: "POST",
          token,
          body: payload,
        }),
    ],
    "Salvarea programului săptămânal a eșuat.",
  );
}

async function deleteMyWeeklyAvailability(token: string | null, id: number) {
  return tryApi(
    [
      () =>
        apiRequest(`/providers/me/availability/${id}`, {
          method: "DELETE",
          token,
        }),
    ],
    "Ștergerea programului săptămânal a eșuat.",
  );
}

async function upsertMyAvailabilityException(
  token: string | null,
  payload: {
    doctor_id?: number | null;
    date: string;
    is_closed: boolean;
    start_time?: string | null;
    end_time?: string | null;
    note?: string | null;
  },
) {
  return tryApi(
    [
      () =>
        apiRequest("/providers/me/availability/exceptions", {
          method: "POST",
          token,
          body: payload,
        }),
      () =>
        apiRequest("/providers/me/availability/exceptions/", {
          method: "POST",
          token,
          body: payload,
        }),
    ],
    "Salvarea zilei de excepție a eșuat.",
  );
}

async function deleteMyAvailabilityException(token: string | null, id: number) {
  return tryApi(
    [
      () =>
        apiRequest(`/providers/me/availability/exceptions/${id}`, {
          method: "DELETE",
          token,
        }),
    ],
    "Ștergerea excepției a eșuat.",
  );
}

export default function ProfilePage() {
  const token = getToken();
  const { role, clinicRole } = useAppUser();

  const [user, setUser] = useState<UserWithMemberships | null>(null);
  const [patient, setPatient] = useState<PatientMe | null>(null);
  const [provider, setProvider] = useState<ProviderMe | null>(null);

  const [doctorRows, setDoctorRows] = useState<ProviderDoctorOut[]>([]);
  const [selectedCalendarDoctorId, setSelectedCalendarDoctorId] = useState<
    number | null
  >(null);
  const [weeklyRows, setWeeklyRows] = useState<ProviderWeeklyAvailabilityOut[]>(
    [],
  );
  const [exceptionRows, setExceptionRows] = useState<
    ProviderAvailabilityExceptionOut[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [success, setSuccess] = useState("");

  const [emailValue, setEmailValue] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [patientBusy, setPatientBusy] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);

  const [patientForm, setPatientForm] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "",
    phone: "",
    address_line: "",
    city: "",
    county: "",
    postal_code: "",
    country: "RO",
  });

  const [providerForm, setProviderForm] = useState({
    name: "",
    website: "",
    public_description: "",
    specialty: "",
    services_offered: "",
    phone: "",
    contact_person_name: "",
    contact_email: "",
    contact_phone: "",
    address_line: "",
    city: "",
    county: "",
    postal_code: "",
    coverage_area: "",
  });

  const [selectedWeekday, setSelectedWeekday] = useState<number>(0);
  const [availabilityStart, setAvailabilityStart] = useState("08:00");
  const [availabilityEnd, setAvailabilityEnd] = useState("16:00");
  const [slotDurationMinutes, setSlotDurationMinutes] =
    useState<SlotDurationMinutes>(30);

  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionClosed, setExceptionClosed] = useState(true);
  const [exceptionStart, setExceptionStart] = useState("08:00");
  const [exceptionEnd, setExceptionEnd] = useState("16:00");
  const [exceptionNote, setExceptionNote] = useState("");

  const isPatient = role === "patient";

  const isProviderOwner =
    role === "provider" &&
    (clinicRole === null ||
      clinicRole === undefined ||
      clinicRole === "clinic_admin");

  const canManageClinicProfile =
    isProviderOwner || clinicRole === "clinic_admin";

  const canManageDoctorCalendar =
    isProviderOwner || clinicRole === "clinic_admin" || clinicRole === "doctor";

  const activeMemberships = useMemo(
    () => (user?.clinic_memberships || []).filter((m) => m?.is_active),
    [user?.clinic_memberships],
  );

  const selectedCalendarDoctor = useMemo(
    () =>
      doctorRows.find((doctor) => doctor.id === selectedCalendarDoctorId) ??
      null,
    [doctorRows, selectedCalendarDoctorId],
  );

  async function loadAvailabilityData(doctorId?: number | null) {
    const [weekly, exceptions] = await Promise.all([
      fetchMyWeeklyAvailability(token, doctorId),
      fetchMyAvailabilityExceptions(token, doctorId),
    ]);

    setWeeklyRows(weekly ?? []);
    setExceptionRows(exceptions ?? []);
  }

  async function load() {
    try {
      setLoading(true);
      setError("");
      setProfileNotice("");
      setSuccess("");

      const me = await apiRequest<UserWithMemberships>("/users/me", { token });
      setUser(me);
      setEmailValue(me?.email || "");

      if (isPatient) {
        const patientMe = await apiRequest<PatientMe>("/patients/me", {
          token,
        });
        setPatient(patientMe);
        setPatientForm({
          first_name: patientMe.first_name || "",
          last_name: patientMe.last_name || "",
          birth_date: patientMe.birth_date || "",
          gender: patientMe.gender || "",
          phone: patientMe.phone || "",
          address_line: patientMe.address_line || "",
          city: patientMe.city || "",
          county: patientMe.county || "",
          postal_code: patientMe.postal_code || "",
          country: patientMe.country || "RO",
        });
      } else {
        setPatient(null);
      }

      if (canManageClinicProfile) {
        try {
          const providerMe = await apiRequest<ProviderMe>("/providers/me", {
            token,
          });

          setProvider(providerMe);
          setProviderForm({
            name: providerMe.name || "",
            website: providerMe.website || "",
            public_description: providerMe.public_description || "",
            specialty: providerMe.specialty || "",
            services_offered: providerMe.services_offered || "",
            phone: providerMe.phone || "",
            contact_person_name: providerMe.contact_person_name || "",
            contact_email: providerMe.contact_email || "",
            contact_phone: providerMe.contact_phone || "",
            address_line: providerMe.address_line || "",
            city: providerMe.city || "",
            county: providerMe.county || "",
            postal_code: providerMe.postal_code || "",
            coverage_area: providerMe.coverage_area || "",
          });
        } catch (err: any) {
          setProvider(null);
          if (!isNotFoundError(err)) {
            setProfileNotice(extractApiError(err));
          }
        }
      } else {
        setProvider(null);
      }

      if (canManageDoctorCalendar) {
        try {
          const structure = await fetchProviderStructure(token);
          const doctors = structure?.doctors ?? [];
          setDoctorRows(doctors);

          if (clinicRole === "doctor") {
            const myDoctorMembership = activeMemberships.find(
              (m) =>
                m.role === "doctor" && typeof m.provider_doctor_id === "number",
            );
            const doctorId = myDoctorMembership?.provider_doctor_id ?? null;
            setSelectedCalendarDoctorId(doctorId);
            await loadAvailabilityData(doctorId);
          } else if (
            selectedCalendarDoctorId &&
            doctors.some((doctor) => doctor.id === selectedCalendarDoctorId)
          ) {
            await loadAvailabilityData(selectedCalendarDoctorId);
          } else {
            setSelectedCalendarDoctorId(null);
            await loadAvailabilityData(null);
          }
        } catch (err: any) {
          setDoctorRows([]);
          setWeeklyRows([]);
          setExceptionRows([]);

          if (!isNotFoundError(err)) {
            setProfileNotice(extractApiError(err));
          }
        }
      } else {
        setDoctorRows([]);
        setSelectedCalendarDoctorId(null);
        setWeeklyRows([]);
        setExceptionRows([]);
      }
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isPatient, clinicRole, role]);

  useEffect(() => {
    if (!canManageDoctorCalendar || loading) return;

    void (async () => {
      try {
        setAvailabilityBusy(true);
        setError("");
        setProfileNotice("");
        await loadAvailabilityData(selectedCalendarDoctorId);
      } catch (err: any) {
        if (!isNotFoundError(err)) {
          setProfileNotice(extractApiError(err));
        }
      } finally {
        setAvailabilityBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCalendarDoctorId, canManageDoctorCalendar, loading]);

  async function handleSaveEmail() {
    if (!emailValue.trim()) {
      setError("Introdu o adresă de e-mail validă.");
      return;
    }

    try {
      setEmailBusy(true);
      setError("");
      setSuccess("");

      await apiRequest("/users/me", {
        method: "PUT",
        token,
        body: { email: cleanText(emailValue) },
      });

      setSuccess("Adresa de e-mail a fost actualizată.");
      await load();
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.trim().length < 8) {
      setError("Noua parolă trebuie să aibă minimum 8 caractere.");
      return;
    }

    try {
      setPasswordBusy(true);
      setError("");
      setSuccess("");

      await apiRequest("/users/me/password", {
        method: "PUT",
        token,
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });

      setCurrentPassword("");
      setNewPassword("");
      setSuccess("Parola a fost schimbată.");
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleSavePatient() {
    try {
      setPatientBusy(true);
      setError("");
      setSuccess("");

      await apiRequest("/patients/me", {
        method: "PUT",
        token,
        body: {
          first_name: cleanText(patientForm.first_name),
          last_name: cleanText(patientForm.last_name),
          birth_date: cleanText(patientForm.birth_date),
          gender: cleanText(patientForm.gender) || null,
          phone: cleanText(patientForm.phone) || null,
          address_line: cleanText(patientForm.address_line),
          city: cleanText(patientForm.city),
          county: cleanText(patientForm.county),
          postal_code: cleanPostal(patientForm.postal_code) || null,
          country: cleanText(patientForm.country) || "RO",
        },
      });

      setSuccess("Datele pacientului au fost actualizate.");
      await load();
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setPatientBusy(false);
    }
  }

  async function handleSaveProvider() {
    try {
      setProviderBusy(true);
      setError("");
      setSuccess("");

      await apiRequest("/providers/me", {
        method: "PUT",
        token,
        body: {
          name: cleanText(providerForm.name),
          website: cleanText(providerForm.website) || null,
          public_description:
            cleanText(providerForm.public_description) || null,
          specialty: cleanText(providerForm.specialty) || null,
          services_offered: cleanText(providerForm.services_offered) || null,
          phone: cleanText(providerForm.phone) || null,
          contact_person_name:
            cleanText(providerForm.contact_person_name) || null,
          contact_email: cleanText(providerForm.contact_email) || null,
          contact_phone: cleanText(providerForm.contact_phone) || null,
          address_line: cleanText(providerForm.address_line) || null,
          city: cleanText(providerForm.city) || null,
          county: cleanText(providerForm.county) || null,
          postal_code: cleanPostal(providerForm.postal_code) || null,
          coverage_area: cleanText(providerForm.coverage_area) || null,
        },
      });

      setSuccess("Profilul furnizorului a fost actualizat.");
      await load();
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setProviderBusy(false);
    }
  }

  async function handleSaveWeeklyAvailability() {
    if (!availabilityStart || !availabilityEnd) {
      setError("Completează ora de început și ora de sfârșit.");
      return;
    }

    if (availabilityStart >= availabilityEnd) {
      setError("Ora de început trebuie să fie înaintea orei de sfârșit.");
      return;
    }

    try {
      setAvailabilityBusy(true);
      setError("");
      setSuccess("");

      await upsertMyWeeklyAvailability(token, {
        doctor_id: selectedCalendarDoctorId,
        weekday: selectedWeekday,
        start_time: `${normalizeTimeInput(availabilityStart)}:00`,
        end_time: `${normalizeTimeInput(availabilityEnd)}:00`,
        slot_duration_minutes: slotDurationMinutes,
      });

      setSuccess("Programul săptămânal a fost salvat.");
      await loadAvailabilityData(selectedCalendarDoctorId);
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setAvailabilityBusy(false);
    }
  }

  async function handleDeleteWeeklyAvailability(
    item: ProviderWeeklyAvailabilityOut,
  ) {
    const confirmed = window.confirm(
      "Ștergi acest interval de program săptămânal?",
    );
    if (!confirmed) return;

    try {
      setAvailabilityBusy(true);
      setError("");
      setSuccess("");

      await deleteMyWeeklyAvailability(token, item.id);
      setSuccess("Intervalul săptămânal a fost șters.");
      await loadAvailabilityData(selectedCalendarDoctorId);
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setAvailabilityBusy(false);
    }
  }

  async function handleSaveException() {
    const normalizedExceptionDate = normalizeDateInput(exceptionDate);

    if (!normalizedExceptionDate) {
      setError("Introdu data în formatul YYYY-MM-DD.");
      return;
    }

    if (!exceptionClosed) {
      if (!exceptionStart || !exceptionEnd) {
        setError("Pentru o zi deschisă trebuie să completezi intervalul orar.");
        return;
      }

      if (exceptionStart >= exceptionEnd) {
        setError("Ora de început trebuie să fie înaintea orei de sfârșit.");
        return;
      }
    }

    try {
      setAvailabilityBusy(true);
      setError("");
      setSuccess("");

      await upsertMyAvailabilityException(token, {
        doctor_id: selectedCalendarDoctorId,
        date: normalizedExceptionDate,
        is_closed: exceptionClosed,
        start_time: exceptionClosed
          ? null
          : `${normalizeTimeInput(exceptionStart)}:00`,
        end_time: exceptionClosed
          ? null
          : `${normalizeTimeInput(exceptionEnd)}:00`,
        note: cleanText(exceptionNote) || null,
      });

      setExceptionDate("");
      setExceptionClosed(true);
      setExceptionStart("08:00");
      setExceptionEnd("16:00");
      setExceptionNote("");

      setSuccess("Ziua de excepție a fost salvată.");
      await loadAvailabilityData(selectedCalendarDoctorId);
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setAvailabilityBusy(false);
    }
  }

  async function handleDeleteException(item: ProviderAvailabilityExceptionOut) {
    const confirmed = window.confirm("Ștergi această zi de excepție?");
    if (!confirmed) return;

    try {
      setAvailabilityBusy(true);
      setError("");
      setSuccess("");

      await deleteMyAvailabilityException(token, item.id);
      setSuccess("Excepția a fost ștearsă.");
      await loadAvailabilityData(selectedCalendarDoctorId);
    } catch (err: any) {
      setError(extractApiError(err));
    } finally {
      setAvailabilityBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mc-page-shell">
        <p className="mc-empty-note">Se încarcă profilul...</p>
      </div>
    );
  }

  return (
    <div className="mc-page-shell">
      <section className="mc-page-head">
        <div>
          <h2>Profil</h2>
          <p>
            Editează datele contului și, în funcție de rol, profilul tău
            operațional.
          </p>
        </div>
      </section>

      {error ? <p className="mc-error-banner">{error}</p> : null}

      {profileNotice ? <p className="mc-info-banner">{profileNotice}</p> : null}

      {success ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            lineHeight: 1.55,
            fontSize: 14,
          }}
        >
          {success}
        </p>
      ) : null}

      <section className="mc-dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <UserCog size={18} />
                Date utilizator
              </span>
            </CardTitle>
            <CardDescription>Setări de bază pentru cont.</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-status-row" style={{ marginBottom: 18 }}>
              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>ID utilizator</strong>
                  <span>{user?.id ?? "-"}</span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Rol global</strong>
                  <span>{roleLabel(user?.role)}</span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Rol clinic activ</strong>
                  <span>{roleLabel(clinicRole)}</span>
                </div>
              </div>

              <div className="mc-status-item">
                <div className="mc-status-text">
                  <strong>Status cont</strong>
                  <span>{user?.is_active ? "Activ" : "Inactiv"}</span>
                </div>
              </div>
            </div>

            <div className="mc-form-grid-2">
              <Input
                id="profile-email"
                label="E-mail"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="email@exemplu.ro"
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <Button onClick={handleSaveEmail} disabled={emailBusy}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Mail size={16} />
                  {emailBusy ? "Se salvează..." : "Salvează e-mailul"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                <LockKeyhole size={18} />
                Schimbare parolă
              </span>
            </CardTitle>
            <CardDescription>
              Actualizează parola fără a afecta alte setări.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-form-grid-2">
              <Input
                id="current-password"
                label="Parola curentă"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />

              <Input
                id="new-password"
                label="Parolă nouă"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 caractere"
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <Button onClick={handleChangePassword} disabled={passwordBusy}>
                {passwordBusy ? "Se actualizează..." : "Schimbă parola"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {isPatient && (
        <Card>
          <CardHeader>
            <CardTitle>Date pacient</CardTitle>
            <CardDescription>
              Actualizează datele personale care se pot schimba în timp, cum ar
              fi adresa sau telefonul.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-form-grid-2">
              <Input
                id="patient-first-name"
                label="Prenume"
                value={patientForm.first_name}
                onChange={(e) =>
                  setPatientForm((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
              />
              <Input
                id="patient-last-name"
                label="Nume"
                value={patientForm.last_name}
                onChange={(e) =>
                  setPatientForm((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
              />
              <Input
                id="patient-birth-date"
                label="Data nașterii"
                type="date"
                value={patientForm.birth_date}
                onChange={(e) =>
                  setPatientForm((prev) => ({
                    ...prev,
                    birth_date: e.target.value,
                  }))
                }
              />
              <Input
                id="patient-gender"
                label="Gen"
                value={patientForm.gender}
                onChange={(e) =>
                  setPatientForm((prev) => ({
                    ...prev,
                    gender: e.target.value,
                  }))
                }
              />
              <Input
                id="patient-phone"
                label="Telefon"
                value={patientForm.phone}
                onChange={(e) =>
                  setPatientForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
              <Input
                id="patient-postal-code"
                label="Cod poștal"
                value={patientForm.postal_code}
                onChange={(e) =>
                  setPatientForm((prev) => ({
                    ...prev,
                    postal_code: e.target.value,
                  }))
                }
              />
              <div className="mc-grid-span-2">
                <Input
                  id="patient-address"
                  label="Adresă"
                  value={patientForm.address_line}
                  onChange={(e) =>
                    setPatientForm((prev) => ({
                      ...prev,
                      address_line: e.target.value,
                    }))
                  }
                />
              </div>
              <Input
                id="patient-city"
                label="Oraș"
                value={patientForm.city}
                onChange={(e) =>
                  setPatientForm((prev) => ({ ...prev, city: e.target.value }))
                }
              />
              <Input
                id="patient-county"
                label="Județ"
                value={patientForm.county}
                onChange={(e) =>
                  setPatientForm((prev) => ({
                    ...prev,
                    county: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Button onClick={handleSavePatient} disabled={patientBusy}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Save size={16} />
                  {patientBusy
                    ? "Se salvează..."
                    : "Salvează datele pacientului"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canManageClinicProfile && provider && (
        <Card>
          <CardHeader>
            <CardTitle>Profil furnizor</CardTitle>
            <CardDescription>
              Editează informațiile publice și operaționale ale clinicii sau
              serviciului home care.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mc-form-grid-2">
              <Input
                id="provider-name"
                label="Nume furnizor"
                value={providerForm.name}
                onChange={(e) =>
                  setProviderForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <Input
                id="provider-website"
                label="Website"
                value={providerForm.website}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
              />
              <div className="mc-grid-span-2">
                <Input
                  id="provider-public-description"
                  label="Descriere publică"
                  value={providerForm.public_description}
                  onChange={(e) =>
                    setProviderForm((prev) => ({
                      ...prev,
                      public_description: e.target.value,
                    }))
                  }
                />
              </div>
              <Input
                id="provider-specialty"
                label="Specialități"
                value={providerForm.specialty}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    specialty: e.target.value,
                  }))
                }
              />
              <Input
                id="provider-services"
                label="Servicii oferite"
                value={providerForm.services_offered}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    services_offered: e.target.value,
                  }))
                }
              />
              <Input
                id="provider-phone"
                label="Telefon principal"
                value={providerForm.phone}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
              <Input
                id="provider-contact-person"
                label="Persoană de contact"
                value={providerForm.contact_person_name}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    contact_person_name: e.target.value,
                  }))
                }
              />
              <Input
                id="provider-contact-email"
                label="E-mail contact"
                value={providerForm.contact_email}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    contact_email: e.target.value,
                  }))
                }
              />
              <Input
                id="provider-contact-phone"
                label="Telefon contact"
                value={providerForm.contact_phone}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    contact_phone: e.target.value,
                  }))
                }
              />
              <div className="mc-grid-span-2">
                <Input
                  id="provider-address"
                  label="Adresă"
                  value={providerForm.address_line}
                  onChange={(e) =>
                    setProviderForm((prev) => ({
                      ...prev,
                      address_line: e.target.value,
                    }))
                  }
                />
              </div>
              <Input
                id="provider-city"
                label="Oraș"
                value={providerForm.city}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    city: e.target.value,
                  }))
                }
              />
              <Input
                id="provider-county"
                label="Județ"
                value={providerForm.county}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    county: e.target.value,
                  }))
                }
              />
              <Input
                id="provider-postal"
                label="Cod poștal"
                value={providerForm.postal_code}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    postal_code: e.target.value,
                  }))
                }
              />
              <Input
                id="provider-coverage"
                label="Zonă de acoperire"
                value={providerForm.coverage_area}
                onChange={(e) =>
                  setProviderForm((prev) => ({
                    ...prev,
                    coverage_area: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Button onClick={handleSaveProvider} disabled={providerBusy}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Save size={16} />
                  {providerBusy
                    ? "Se salvează..."
                    : "Salvează profilul furnizorului"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canManageClinicProfile && !provider ? (
        <Card>
          <CardHeader>
            <CardTitle>Profil furnizor indisponibil</CardTitle>
            <CardDescription>
              Contul curent nu are un profil de furnizor editabil în această
              vedere.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mc-empty-note">
              Dacă ești medic, profilul clinicii este gestionat de
              administratorul clinicii. Poți folosi în continuare calendarul și
              secțiunile operaționale disponibile rolului tău.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {canManageDoctorCalendar && (
        <>
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
                  Availability management
                </span>
              </CardTitle>
              <CardDescription>
                Configurează programul clinicii sau, dacă selectezi un medic,
                programul acelui medic.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="mc-form-grid-2">
                <div className="mc-grid-span-2">
                  <label className="mc-label">Calendar țintă</label>
                  <div className="mc-chip-row" style={{ marginTop: 10 }}>
                    {(clinicRole === "clinic_admin" || isProviderOwner) && (
                      <button
                        type="button"
                        className={
                          selectedCalendarDoctorId === null
                            ? "mc-chip mc-chip-active"
                            : "mc-chip"
                        }
                        onClick={() => setSelectedCalendarDoctorId(null)}
                      >
                        Program clinic general
                      </button>
                    )}

                    {doctorRows.map((doctor) => (
                      <button
                        key={doctor.id}
                        type="button"
                        className={
                          selectedCalendarDoctorId === doctor.id
                            ? "mc-chip mc-chip-active"
                            : "mc-chip"
                        }
                        onClick={() => setSelectedCalendarDoctorId(doctor.id)}
                      >
                        {doctorDisplayName(doctor)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mc-grid-span-2">
                  <div className="mc-muted-block">
                    <div>
                      <strong>Calendar activ:</strong>{" "}
                      {doctorDisplayName(selectedCalendarDoctor)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="mc-dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Program săptămânal</CardTitle>
                <CardDescription>
                  Adaugă sau actualizează intervale orare recurente.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-form-grid-2">
                  <div>
                    <label className="mc-label" htmlFor="weekday">
                      Zi din săptămână
                    </label>
                    <select
                      id="weekday"
                      className="mc-input"
                      value={selectedWeekday}
                      onChange={(e) =>
                        setSelectedWeekday(Number(e.target.value))
                      }
                    >
                      {WEEKDAYS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div />

                  <Input
                    id="availability-start"
                    label="Ora de început"
                    type="time"
                    value={availabilityStart}
                    onChange={(e) => setAvailabilityStart(e.target.value)}
                  />

                  <Input
                    id="availability-end"
                    label="Ora de sfârșit"
                    type="time"
                    value={availabilityEnd}
                    onChange={(e) => setAvailabilityEnd(e.target.value)}
                  />

                  <div className="mc-grid-span-2">
                    <label className="mc-label">Durată slot</label>
                    <div className="mc-chip-row" style={{ marginTop: 10 }}>
                      {SLOT_DURATION_OPTIONS.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          className={
                            slotDurationMinutes === minutes
                              ? "mc-chip mc-chip-active"
                              : "mc-chip"
                          }
                          onClick={() => setSlotDurationMinutes(minutes)}
                        >
                          {minutes} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Button
                    onClick={handleSaveWeeklyAvailability}
                    disabled={availabilityBusy}
                  >
                    {availabilityBusy
                      ? "Se salvează..."
                      : "Salvează programul săptămânal"}
                  </Button>
                </div>

                <div style={{ marginTop: 20 }}>
                  {availabilityBusy && weeklyRows.length === 0 ? (
                    <p className="mc-empty-note">Se încarcă programul...</p>
                  ) : weeklyRows.length === 0 ? (
                    <p className="mc-empty-note">
                      Nu există încă intervale săptămânale pentru calendarul
                      selectat.
                    </p>
                  ) : (
                    <div className="mc-list">
                      {weeklyRows.map((item) => (
                        <div key={item.id} className="mc-list-item">
                          <strong>{weekdayLabel(item.weekday)}</strong>
                          <span>
                            {item.start_time} – {item.end_time} • slot{" "}
                            {item.slot_duration_minutes ?? 30} min
                          </span>
                          <span>
                            doctor_id: {item.doctor_id ?? "clinic general"}
                          </span>

                          <div style={{ marginTop: 8 }}>
                            <Button
                              variant="secondary"
                              onClick={() =>
                                handleDeleteWeeklyAvailability(item)
                              }
                              disabled={availabilityBusy}
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Zile de excepție</CardTitle>
                <CardDescription>
                  Marchează zile închise sau override-uri punctuale de program.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-form-grid-2">
                  <Input
                    id="exception-date"
                    label="Data"
                    type="date"
                    value={exceptionDate}
                    onChange={(e) => setExceptionDate(e.target.value)}
                  />

                  <div>
                    <label className="mc-label">Tip excepție</label>
                    <div className="mc-chip-row" style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        className={
                          exceptionClosed ? "mc-chip mc-chip-active" : "mc-chip"
                        }
                        onClick={() => setExceptionClosed(true)}
                      >
                        Închis
                      </button>
                      <button
                        type="button"
                        className={
                          !exceptionClosed
                            ? "mc-chip mc-chip-active"
                            : "mc-chip"
                        }
                        onClick={() => setExceptionClosed(false)}
                      >
                        Deschis cu override
                      </button>
                    </div>
                  </div>

                  {!exceptionClosed ? (
                    <>
                      <Input
                        id="exception-start"
                        label="Ora început"
                        type="time"
                        value={exceptionStart}
                        onChange={(e) => setExceptionStart(e.target.value)}
                      />
                      <Input
                        id="exception-end"
                        label="Ora sfârșit"
                        type="time"
                        value={exceptionEnd}
                        onChange={(e) => setExceptionEnd(e.target.value)}
                      />
                    </>
                  ) : null}

                  <div className="mc-grid-span-2">
                    <Input
                      id="exception-note"
                      label="Notă (opțional)"
                      value={exceptionNote}
                      onChange={(e) => setExceptionNote(e.target.value)}
                      placeholder="Ex: concediu, sărbătoare legală, intervenție externă"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Button
                    onClick={handleSaveException}
                    disabled={availabilityBusy}
                  >
                    {availabilityBusy ? "Se salvează..." : "Salvează excepția"}
                  </Button>
                </div>

                <div style={{ marginTop: 20 }}>
                  {availabilityBusy && exceptionRows.length === 0 ? (
                    <p className="mc-empty-note">Se încarcă excepțiile...</p>
                  ) : exceptionRows.length === 0 ? (
                    <p className="mc-empty-note">
                      Nu există excepții pentru calendarul selectat.
                    </p>
                  ) : (
                    <div className="mc-list">
                      {exceptionRows.map((item) => (
                        <div key={item.id} className="mc-list-item">
                          <strong>{item.date}</strong>
                          <span>
                            {item.is_closed
                              ? "Închis"
                              : `${item.start_time || "?"} – ${
                                  item.end_time || "?"
                                }`}
                          </span>
                          <span>{item.note || "Fără notă"}</span>
                          <span>
                            doctor_id: {item.doctor_id ?? "clinic general"}
                          </span>

                          <div style={{ marginTop: 8 }}>
                            <Button
                              variant="secondary"
                              onClick={() => handleDeleteException(item)}
                              disabled={availabilityBusy}
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Clinic memberships</CardTitle>
          <CardDescription>
            Rolurile tale active sau istorice în clinicile din platformă.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {activeMemberships.length === 0 ? (
            <p className="mc-empty-note">
              Nu există apartenențe active la clinică pentru acest cont.
            </p>
          ) : (
            <div className="mc-list">
              {activeMemberships.map((membership, index) => (
                <div key={membership.id ?? index} className="mc-list-item">
                  <strong>{roleLabel(membership.role)}</strong>
                  <span>Clinic ID: {membership.clinic_id ?? "-"}</span>
                  <span>
                    Provider doctor ID: {membership.provider_doctor_id ?? "-"}
                  </span>
                  <span>
                    Status: {membership.is_active ? "Activ" : "Inactiv"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
