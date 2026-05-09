// Path: medicalend-web/app/(app)/staff/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Edit3,
  ExternalLink,
  Link2,
  RefreshCcw,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ClinicStaffRole = "clinic_admin" | "doctor" | "assistant" | "reception";
type DoctorCreateMode = "existing" | "new";
type SpecialtyCreateMode = "existing" | "new";

type ClinicStaffRow = {
  user_id: number;
  email: string;
  global_role: string;
  user_is_active: boolean;
  membership_id: number;
  clinic_id: number;
  clinic_role: string;
  provider_doctor_id?: number | null;
  provider_doctor_name?: string | null;
  membership_is_active: boolean;
  created_at: string;
};

type ClinicMembership = {
  id?: number;
  clinic_id?: number;
  role?: string | null;
  is_active?: boolean;
  provider_doctor_id?: number | null;
};

type MeResponse = {
  id: number;
  email: string;
  role: string;
  clinic_memberships?: ClinicMembership[];
};

type ProviderMeResponse = {
  id: number;
  clinic_id?: number | null;
  name?: string | null;
};

type ProviderSpecialtyOut = {
  id: number;
  provider_id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
};

type ProviderDoctorOut = {
  id: number;
  provider_id: number;
  specialty_id?: number | null;
  specialty_name?: string | null;
  name: string;
  title?: string | null;
  license_number?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
  created_at?: string;
};

type ProviderStructureOut = {
  specialties: ProviderSpecialtyOut[];
  doctors: ProviderDoctorOut[];
};

type ClinicStaffCreatePayload = {
  email: string;
  password: string;
  clinic_role: ClinicStaffRole;
  provider_doctor_id?: number | null;
  is_active?: boolean;
};

type ClinicStaffUpdatePayload = {
  email?: string;
  clinic_role?: ClinicStaffRole;
  provider_doctor_id?: number | null;
  is_active?: boolean;
  password?: string;
};

type ProviderSpecialtyCreatePayload = {
  name: string;
};

type ProviderDoctorCreatePayload = {
  specialty_id: number;
  name: string;
  title?: string | null;
  license_number?: string | null;
  phone?: string | null;
  email?: string | null;
};

type GoogleCalendarMapping = {
  id: number;
  clinic_id: number;
  provider_id: number;
  doctor_id?: number | null;
  google_account_email?: string | null;
  google_calendar_id: string;
  google_calendar_name?: string | null;
  sync_direction: string;
  status: string;
  is_active: boolean;
  last_sync_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type GoogleOAuthStartResponse = {
  authorization_url: string;
};

const ROLE_OPTIONS: ClinicStaffRole[] = [
  "doctor",
  "reception",
  "assistant",
  "clinic_admin",
];

function roleLabel(role?: string | null) {
  switch (role) {
    case "clinic_admin":
      return "Administrator clinică";
    case "doctor":
      return "Medic";
    case "assistant":
      return "Asistent";
    case "reception":
      return "Recepție";
    default:
      return role || "-";
  }
}

function statusLabel(active?: boolean) {
  return active ? "Activ" : "Inactiv";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ro-RO");
  } catch {
    return value;
  }
}

function cleanText(value: string) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function activeClinicRole(memberships?: ClinicMembership[] | null) {
  const active = (memberships ?? []).find((item) => item?.is_active);
  return active?.role ?? null;
}

function normalizeRole(value: string): ClinicStaffRole {
  if (
    value === "clinic_admin" ||
    value === "doctor" ||
    value === "assistant" ||
    value === "reception"
  ) {
    return value;
  }
  return "doctor";
}

function doctorDisplayName(doctor: ProviderDoctorOut) {
  const title = doctor.title?.trim() ? `${doctor.title.trim()} ` : "";
  return `${title}${doctor.name}`.trim();
}

function normalizeErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function mappingLabel(mapping: GoogleCalendarMapping) {
  return (
    mapping.google_calendar_name ||
    mapping.google_calendar_id ||
    `Calendar #${mapping.id}`
  );
}

function mappingForDoctor(
  mappings: GoogleCalendarMapping[],
  doctorId?: number | null,
) {
  return mappings.find((item) => item.doctor_id === doctorId) ?? null;
}

async function fetchMe(token: string | null) {
  return apiRequest<MeResponse>("/users/me", { token });
}

async function fetchProviderMe(token: string | null) {
  return apiRequest<ProviderMeResponse>("/providers/me", { token });
}

async function fetchProviderStructure(token: string | null) {
  return apiRequest<ProviderStructureOut>("/providers/me/structure", {
    token,
  });
}

async function fetchClinicStaff(token: string | null) {
  return apiRequest<ClinicStaffRow[]>("/users/clinic/staff", { token });
}

async function fetchGoogleCalendarMappings(token: string | null) {
  return apiRequest<GoogleCalendarMapping[]>(
    "/integrations/google-calendar/mappings",
    { token },
  );
}

async function startGoogleCalendarOAuth(
  token: string | null,
  providerId: number,
  doctorId?: number | null,
) {
  const query = doctorId
    ? `provider_id=${providerId}&doctor_id=${doctorId}`
    : `provider_id=${providerId}`;

  return apiRequest<GoogleOAuthStartResponse>(
    `/integrations/google-calendar/oauth/start?${query}`,
    { token },
  );
}

async function createClinicStaff(
  token: string | null,
  payload: ClinicStaffCreatePayload,
) {
  return apiRequest<ClinicStaffRow>("/users/clinic/staff", {
    method: "POST",
    token,
    body: payload,
  });
}

async function updateClinicStaff(
  token: string | null,
  userId: number,
  payload: ClinicStaffUpdatePayload,
) {
  return apiRequest<ClinicStaffRow>(`/users/clinic/staff/${userId}`, {
    method: "PUT",
    token,
    body: payload,
  });
}

async function deleteClinicStaff(token: string | null, userId: number) {
  return apiRequest<void>(`/users/clinic/staff/${userId}`, {
    method: "DELETE",
    token,
  });
}

async function createProviderSpecialty(
  token: string | null,
  payload: ProviderSpecialtyCreatePayload,
) {
  return apiRequest<ProviderSpecialtyOut>(
    "/providers/me/structure/specialties",
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

async function createProviderDoctor(
  token: string | null,
  payload: ProviderDoctorCreatePayload,
) {
  return apiRequest<ProviderDoctorOut>("/providers/me/structure/doctors", {
    method: "POST",
    token,
    body: payload,
  });
}

function ActionButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  fullWidth = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const background =
    variant === "primary"
      ? "var(--mc-primary)"
      : variant === "danger"
        ? "#ef4444"
        : "var(--mc-surface-2)";

  const color = variant === "secondary" ? "var(--mc-text)" : "#ffffff";
  const border =
    variant === "secondary"
      ? "1px solid var(--mc-border)"
      : "1px solid transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 44,
        padding: "0 16px",
        borderRadius: 14,
        border,
        background,
        color,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        width: fullWidth ? "100%" : "fit-content",
        maxWidth: fullWidth ? "100%" : "100%",
        alignSelf: fullWidth ? "stretch" : "flex-start",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1.2,
      }}
    >
      {children}
    </button>
  );
}

function DoctorPicker({
  doctors,
  value,
  onChange,
}: {
  doctors: ProviderDoctorOut[];
  value: string;
  onChange: (next: string) => void;
}) {
  if (doctors.length === 0) {
    return (
      <div className="mc-muted-block" style={{ marginTop: 10 }}>
        Nu există încă medici definiți în structura clinicii.
      </div>
    );
  }

  return (
    <div className="mc-list" style={{ marginTop: 10 }}>
      {doctors.map((doctor) => {
        const active = value === String(doctor.id);

        return (
          <button
            key={doctor.id}
            type="button"
            className={active ? "mc-chip mc-chip-active" : "mc-chip"}
            onClick={() => onChange(String(doctor.id))}
            style={{
              justifyContent: "flex-start",
              textAlign: "left",
              width: "100%",
            }}
          >
            {doctorDisplayName(doctor)}
            {doctor.specialty_name ? ` • ${doctor.specialty_name}` : ""}
          </button>
        );
      })}
    </div>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
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
      onClick={onClose}
    >
      <div
        className="mc-card"
        style={{
          width: "100%",
          maxWidth: 860,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function StaffPage() {
  const token = getToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [clinicRole, setClinicRole] = useState<string | null>(null);
  const [items, setItems] = useState<ClinicStaffRow[]>([]);
  const [providerMe, setProviderMe] = useState<ProviderMeResponse | null>(null);
  const [specialties, setSpecialties] = useState<ProviderSpecialtyOut[]>([]);
  const [doctors, setDoctors] = useState<ProviderDoctorOut[]>([]);
  const [googleMappings, setGoogleMappings] = useState<GoogleCalendarMapping[]>(
    [],
  );
  const [googleBusy, setGoogleBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<ClinicStaffRole>("doctor");
  const [createDoctorId, setCreateDoctorId] = useState("");
  const [createDoctorMode, setCreateDoctorMode] =
    useState<DoctorCreateMode>("existing");
  const [createActive, setCreateActive] = useState(true);

  const [specialtyMode, setSpecialtyMode] =
    useState<SpecialtyCreateMode>("existing");
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [newSpecialtyName, setNewSpecialtyName] = useState("");

  const [doctorName, setDoctorName] = useState("");
  const [doctorTitle, setDoctorTitle] = useState("");
  const [doctorLicenseNumber, setDoctorLicenseNumber] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");

  const [editingItem, setEditingItem] = useState<ClinicStaffRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<ClinicStaffRole>("doctor");
  const [editDoctorId, setEditDoctorId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editActive, setEditActive] = useState(true);

  const [deletingItem, setDeletingItem] = useState<ClinicStaffRow | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const me = await fetchMe(token);
      const role = activeClinicRole(me.clinic_memberships ?? []);
      setClinicRole(role);

      const staffPromise = fetchClinicStaff(token);

      let provider: ProviderMeResponse | null = null;
      let specialtyRows: ProviderSpecialtyOut[] = [];
      let doctorRows: ProviderDoctorOut[] = [];
      let mappingRows: GoogleCalendarMapping[] = [];

      try {
        provider = await fetchProviderMe(token);
        const structure = await fetchProviderStructure(token);
        specialtyRows = structure?.specialties ?? [];
        doctorRows = structure?.doctors ?? [];

        if (role === "clinic_admin" || me.role === "admin") {
          try {
            mappingRows = await fetchGoogleCalendarMappings(token);
          } catch {
            mappingRows = [];
          }
        }
      } catch {
        provider = null;
        specialtyRows = [];
        doctorRows = [];
        mappingRows = [];
      }

      const rows = await staffPromise;

      setProviderMe(provider);
      setSpecialties(specialtyRows);
      setDoctors(doctorRows ?? []);
      setGoogleMappings(mappingRows ?? []);
      setItems(rows ?? []);
    } catch (err) {
      setError(normalizeErrorMessage(err, "Încărcarea personalului a eșuat."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.email.localeCompare(b.email));
  }, [items]);

  const activeCount = useMemo(
    () => items.filter((item) => item.user_is_active).length,
    [items],
  );

  const doctorCount = useMemo(
    () => items.filter((item) => item.clinic_role === "doctor").length,
    [items],
  );

  const adminCount = useMemo(
    () => items.filter((item) => item.clinic_role === "clinic_admin").length,
    [items],
  );

  const providerLevelMapping = useMemo(
    () => googleMappings.find((item) => item.doctor_id == null) ?? null,
    [googleMappings],
  );

  function resetNewDoctorForm() {
    setSpecialtyMode(specialties.length > 0 ? "existing" : "new");
    setSelectedSpecialtyId(
      specialties.length > 0 ? String(specialties[0].id) : "",
    );
    setNewSpecialtyName("");
    setDoctorName("");
    setDoctorTitle("");
    setDoctorLicenseNumber("");
    setDoctorPhone("");
    setDoctorEmail("");
  }

  function openCreate() {
    setError("");
    setSuccess("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("doctor");
    setCreateDoctorMode(doctors.length > 0 ? "existing" : "new");
    setCreateDoctorId(doctors.length > 0 ? String(doctors[0].id) : "");
    setCreateActive(true);
    resetNewDoctorForm();
    setCreateOpen(true);
  }

  function openEdit(item: ClinicStaffRow) {
    setError("");
    setSuccess("");
    setEditingItem(item);
    setEditEmail(item.email);
    setEditRole(normalizeRole(item.clinic_role));
    setEditDoctorId(
      item.provider_doctor_id ? String(item.provider_doctor_id) : "",
    );
    setEditPassword("");
    setEditActive(!!item.user_is_active);
    setEditOpen(true);
  }

  function openDelete(item: ClinicStaffRow) {
    setError("");
    setSuccess("");
    setDeletingItem(item);
    setDeleteOpen(true);
  }

  function resetCreateDoctorIfNeeded(nextRole: ClinicStaffRole) {
    setCreateRole(nextRole);
    if (nextRole !== "doctor") {
      setCreateDoctorId("");
      setCreateDoctorMode("existing");
      return;
    }

    if (doctors.length > 0) {
      setCreateDoctorMode("existing");
      setCreateDoctorId(String(doctors[0].id));
    } else {
      setCreateDoctorMode("new");
      setCreateDoctorId("");
    }
  }

  function resetEditDoctorIfNeeded(nextRole: ClinicStaffRole) {
    setEditRole(nextRole);
    if (nextRole !== "doctor") {
      setEditDoctorId("");
      return;
    }
    if (!editDoctorId && doctors.length > 0) {
      setEditDoctorId(String(doctors[0].id));
    }
  }

  async function handleConnectGoogleCalendar(doctorId?: number | null) {
    if (!providerMe?.id) {
      setError("Providerul curent nu a putut fi identificat.");
      return;
    }

    try {
      setGoogleBusy(true);
      setError("");
      setSuccess("");

      const response = await startGoogleCalendarOAuth(
        token,
        providerMe.id,
        doctorId,
      );

      if (!response.authorization_url) {
        throw new Error("Google nu a returnat URL-ul de autorizare.");
      }

      window.location.href = response.authorization_url;
    } catch (err) {
      setError(
        normalizeErrorMessage(err, "Conectarea Google Calendar a eșuat."),
      );
    } finally {
      setGoogleBusy(false);
    }
  }

  async function resolveDoctorIdForCreate(): Promise<number | null> {
    if (createRole !== "doctor") return null;

    if (createDoctorMode === "existing") {
      const existingDoctorId = Number(createDoctorId.trim());
      if (!existingDoctorId || Number.isNaN(existingDoctorId)) {
        throw new Error("Pentru rolul de medic trebuie selectat un medic.");
      }
      return existingDoctorId;
    }

    const cleanedDoctorName = cleanText(doctorName);
    if (cleanedDoctorName.length < 2) {
      throw new Error("Introdu numele medicului.");
    }

    let specialtyId: number | null = null;

    if (specialtyMode === "existing") {
      specialtyId = Number(selectedSpecialtyId.trim());
      if (!specialtyId || Number.isNaN(specialtyId)) {
        throw new Error("Selectează specialitatea medicului.");
      }
    } else {
      const cleanedSpecialty = cleanText(newSpecialtyName);
      if (cleanedSpecialty.length < 2) {
        throw new Error("Introdu specialitatea medicului.");
      }

      const createdSpecialty = await createProviderSpecialty(token, {
        name: cleanedSpecialty,
      });
      specialtyId = createdSpecialty.id;
    }

    const createdDoctor = await createProviderDoctor(token, {
      specialty_id: specialtyId,
      name: cleanedDoctorName,
      title: cleanText(doctorTitle) || null,
      license_number: cleanText(doctorLicenseNumber) || null,
      phone: cleanText(doctorPhone) || null,
      email: cleanText(doctorEmail) || null,
    });

    return createdDoctor.id;
  }

  async function handleCreate() {
    if (submitBusy) return;

    const email = cleanText(createEmail);
    const password = createPassword.trim();

    if (!email) {
      setError("Introdu adresa de e-mail.");
      return;
    }

    if (password.length < 8) {
      setError("Parola trebuie să aibă minimum 8 caractere.");
      return;
    }

    try {
      setSubmitBusy(true);
      setError("");
      setSuccess("");

      const providerDoctorId = await resolveDoctorIdForCreate();

      const payload: ClinicStaffCreatePayload = {
        email,
        password,
        clinic_role: createRole,
        is_active: createActive,
        provider_doctor_id: providerDoctorId,
      };

      await createClinicStaff(token, payload);

      setCreateOpen(false);
      setSuccess("Utilizatorul a fost creat cu succes.");
      await load();
    } catch (err) {
      setError(normalizeErrorMessage(err, "Crearea utilizatorului a eșuat."));
    } finally {
      setSubmitBusy(false);
    }
  }

  async function handleEdit() {
    if (!editingItem || submitBusy) return;

    if (!editEmail.trim()) {
      setError("Introdu adresa de e-mail.");
      return;
    }

    if (editPassword.trim().length > 0 && editPassword.trim().length < 8) {
      setError("Parola trebuie să aibă minimum 8 caractere.");
      return;
    }

    if (editRole === "doctor" && !editDoctorId.trim()) {
      setError("Pentru rolul de medic trebuie selectat un medic.");
      return;
    }

    try {
      setSubmitBusy(true);
      setError("");
      setSuccess("");

      const payload: ClinicStaffUpdatePayload = {
        email: editEmail.trim(),
        clinic_role: editRole,
        is_active: editActive,
        provider_doctor_id:
          editRole === "doctor" ? Number(editDoctorId.trim()) : null,
        password: editPassword.trim() ? editPassword.trim() : undefined,
      };

      await updateClinicStaff(token, editingItem.user_id, payload);

      setEditOpen(false);
      setEditingItem(null);
      setSuccess("Modificările au fost salvate.");
      await load();
    } catch (err) {
      setError(
        normalizeErrorMessage(err, "Actualizarea utilizatorului a eșuat."),
      );
    } finally {
      setSubmitBusy(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingItem || deleteBusy) return;

    try {
      setDeleteBusy(true);
      setError("");
      setSuccess("");

      await deleteClinicStaff(token, deletingItem.user_id);

      setDeleteOpen(false);
      setDeletingItem(null);
      setSuccess("Utilizatorul a fost șters.");
      await load();
    } catch (err) {
      setError(normalizeErrorMessage(err, "Ștergerea utilizatorului a eșuat."));
    } finally {
      setDeleteBusy(false);
    }
  }

  const blocked =
    clinicRole !== "clinic_admin" &&
    clinicRole !== null &&
    clinicRole !== undefined;

  if (loading) {
    return (
      <div className="mc-page-shell">
        <p className="mc-empty-note">Se încarcă personalul clinicii...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mc-page-shell">
        <section className="mc-page-head">
          <div>
            <h2>Personal</h2>
            <p>
              Administrează utilizatorii clinicii, rolurile operaționale și
              asocierea cu profilele de medic.
            </p>
          </div>

          <div className="mc-page-badge">
            <Users size={16} style={{ marginRight: 8 }} />
            {items.length} utilizatori
          </div>
        </section>

        {error ? <p className="mc-error-banner">{error}</p> : null}
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
            {success}
          </div>
        ) : null}

        {blocked ? (
          <Card>
            <CardHeader>
              <CardTitle>Acces restricționat</CardTitle>
              <CardDescription>
                Pagina de personal este disponibilă doar pentru administratorul
                clinicii.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mc-empty-note">
                Rolul tău clinic activ nu permite administrarea personalului.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="mc-stats-grid">
              <Card className="mc-stat-card">
                <div className="mc-stat-top">
                  <div>
                    <p className="mc-stat-label">Total utilizatori</p>
                    <p className="mc-stat-value">{items.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="mc-stat-card">
                <div className="mc-stat-top">
                  <div>
                    <p className="mc-stat-label">Utilizatori activi</p>
                    <p className="mc-stat-value">{activeCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="mc-stat-card">
                <div className="mc-stat-top">
                  <div>
                    <p className="mc-stat-label">Medici</p>
                    <p className="mc-stat-value">{doctorCount}</p>
                  </div>
                </div>
              </Card>

              <Card className="mc-stat-card">
                <div className="mc-stat-top">
                  <div>
                    <p className="mc-stat-label">Administratori</p>
                    <p className="mc-stat-value">{adminCount}</p>
                  </div>
                </div>
              </Card>
            </section>

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
                    Integrare Google Calendar
                  </span>
                </CardTitle>
                <CardDescription>
                  Conectează calendarul clinicii sau calendarele medicilor
                  pentru a evita programările suprapuse.
                </CardDescription>
              </CardHeader>

              <CardContent style={{ display: "grid", gap: 14 }}>
                <div className="mc-muted-block">
                  <strong style={{ color: "var(--mc-text)" }}>
                    Calendar general furnizor
                  </strong>

                  {providerLevelMapping ? (
                    <>
                      <span>
                        Conectat: {mappingLabel(providerLevelMapping)}
                      </span>
                      <span>
                        Cont Google:{" "}
                        {providerLevelMapping.google_account_email || "-"}
                      </span>
                      <span>Status: {providerLevelMapping.status}</span>
                    </>
                  ) : (
                    <span>
                      Nu există încă un calendar conectat la nivel de furnizor.
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <ActionButton
                    onClick={() => void handleConnectGoogleCalendar(null)}
                    disabled={googleBusy || !providerMe?.id}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Link2 size={16} />
                      {providerLevelMapping
                        ? "Reconectează calendar furnizor"
                        : "Conectează calendar furnizor"}
                    </span>
                  </ActionButton>

                  <ActionButton variant="secondary" onClick={() => void load()}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <RefreshCcw size={16} />
                      Reîncarcă integrarea
                    </span>
                  </ActionButton>
                </div>

                {doctors.length > 0 ? (
                  <div className="mc-list">
                    {doctors.map((doctor) => {
                      const mapping = mappingForDoctor(
                        googleMappings,
                        doctor.id,
                      );

                      return (
                        <div key={doctor.id} className="mc-list-item">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <strong>{doctorDisplayName(doctor)}</strong>
                              <span>
                                {doctor.specialty_name ||
                                  "Specialitate nespecificată"}
                              </span>
                            </div>

                            <span
                              className={
                                mapping
                                  ? "mc-pill mc-pill-success"
                                  : "mc-pill mc-pill-warning"
                              }
                            >
                              {mapping ? "Conectat" : "Neconectat"}
                            </span>
                          </div>

                          {mapping ? (
                            <div className="mc-muted-block">
                              <span>Calendar: {mappingLabel(mapping)}</span>
                              <span>
                                Cont Google:{" "}
                                {mapping.google_account_email || "-"}
                              </span>
                              <span>Status: {mapping.status}</span>
                            </div>
                          ) : null}

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-start",
                            }}
                          >
                            <ActionButton
                              variant={mapping ? "secondary" : "primary"}
                              onClick={() =>
                                void handleConnectGoogleCalendar(doctor.id)
                              }
                              disabled={googleBusy || !providerMe?.id}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <ExternalLink size={16} />
                                {mapping
                                  ? "Reconectează calendar medic"
                                  : "Conectează calendar medic"}
                              </span>
                            </ActionButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Administrare personal</CardTitle>
                <CardDescription>
                  Poți adăuga utilizatori noi, edita rolurile existente și
                  șterge conturile care nu mai sunt necesare.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <ActionButton onClick={openCreate}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <UserPlus size={16} />
                      Adaugă utilizator
                    </span>
                  </ActionButton>

                  <ActionButton variant="secondary" onClick={() => void load()}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <RefreshCcw size={16} />
                      Reîncarcă
                    </span>
                  </ActionButton>
                </div>
              </CardContent>
            </Card>

            {sortedItems.length === 0 ? (
              <Card>
                <CardContent>
                  <p className="mc-empty-note">
                    Nu există încă utilizatori în clinică.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="mc-list">
                {sortedItems.map((item) => (
                  <Card key={item.membership_id}>
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
                            <strong>{item.email}</strong>
                            <span>
                              Rol clinică: {roleLabel(item.clinic_role)}
                            </span>
                          </div>

                          <span
                            className={
                              item.user_is_active
                                ? "mc-pill mc-pill-success"
                                : "mc-pill mc-pill-danger"
                            }
                          >
                            {statusLabel(item.user_is_active)}
                          </span>
                        </div>

                        <div className="mc-muted-block">
                          <div>
                            <strong>Rol global:</strong> {item.global_role}
                          </div>
                          <div>
                            <strong>Status membership:</strong>{" "}
                            {statusLabel(item.membership_is_active)}
                          </div>
                          <div>
                            <strong>Medic asociat:</strong>{" "}
                            {item.provider_doctor_name || "-"}
                          </div>
                          <div>
                            <strong>ID profil medic:</strong>{" "}
                            {item.provider_doctor_id ?? "-"}
                          </div>
                          <div>
                            <strong>Creat la:</strong>{" "}
                            {formatDate(item.created_at)}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                          }}
                        >
                          <ActionButton
                            variant="secondary"
                            onClick={() => openEdit(item)}
                            fullWidth
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Edit3 size={16} />
                              Editează
                            </span>
                          </ActionButton>

                          <ActionButton
                            variant="danger"
                            onClick={() => openDelete(item)}
                            fullWidth
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
                          </ActionButton>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Context clinică</CardTitle>
                <CardDescription>
                  Structura medicilor este încărcată automat din providerul
                  curent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mc-empty-note">
                  Provider curent: {providerMe?.name || "Nespecificat"} • ID:{" "}
                  {providerMe?.id ?? "-"} • Specialități disponibile:{" "}
                  {specialties.length} • Medici disponibili: {doctors.length}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {createOpen ? (
        <Overlay onClose={() => setCreateOpen(false)}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 24 }}>Utilizator nou</h3>
              <p className="mc-empty-note" style={{ marginTop: 8 }}>
                Pentru rolul de medic, poți selecta un medic existent sau poți
                crea acum profilul medicului cu specialitate, nume, titlu, nr.
                licență, telefon și e-mail.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--mc-muted)",
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            <Input
              id="create-email"
              label="Email utilizator"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="utilizator@clinica.ro"
            />

            <Input
              id="create-password"
              label="Parolă"
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Minimum 8 caractere"
            />

            <div>
              <label className="mc-label">Rol clinică</label>
              <div className="mc-chip-row" style={{ marginTop: 10 }}>
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={
                      createRole === role ? "mc-chip mc-chip-active" : "mc-chip"
                    }
                    onClick={() => resetCreateDoctorIfNeeded(role)}
                  >
                    {roleLabel(role)}
                  </button>
                ))}
              </div>
            </div>

            {createRole === "doctor" ? (
              <div className="mc-inline-form">
                <label className="mc-label">Profil medic</label>

                <div className="mc-chip-row">
                  <button
                    type="button"
                    className={
                      createDoctorMode === "existing"
                        ? "mc-chip mc-chip-active"
                        : "mc-chip"
                    }
                    onClick={() => {
                      setCreateDoctorMode("existing");
                      if (!createDoctorId && doctors.length > 0) {
                        setCreateDoctorId(String(doctors[0].id));
                      }
                    }}
                    disabled={doctors.length === 0}
                  >
                    Medic existent
                  </button>

                  <button
                    type="button"
                    className={
                      createDoctorMode === "new"
                        ? "mc-chip mc-chip-active"
                        : "mc-chip"
                    }
                    onClick={() => {
                      setCreateDoctorMode("new");
                      setCreateDoctorId("");
                    }}
                  >
                    Creează medic nou
                  </button>
                </div>

                {createDoctorMode === "existing" ? (
                  <div>
                    <label className="mc-label">Medic asociat</label>
                    <DoctorPicker
                      doctors={doctors}
                      value={createDoctorId}
                      onChange={setCreateDoctorId}
                    />
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <label className="mc-label">Specialitate</label>
                      <div className="mc-chip-row" style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className={
                            specialtyMode === "existing"
                              ? "mc-chip mc-chip-active"
                              : "mc-chip"
                          }
                          onClick={() => setSpecialtyMode("existing")}
                          disabled={specialties.length === 0}
                        >
                          Specialitate existentă
                        </button>

                        <button
                          type="button"
                          className={
                            specialtyMode === "new"
                              ? "mc-chip mc-chip-active"
                              : "mc-chip"
                          }
                          onClick={() => setSpecialtyMode("new")}
                        >
                          Specialitate nouă
                        </button>
                      </div>
                    </div>

                    {specialtyMode === "existing" ? (
                      <div>
                        <label className="mc-label" htmlFor="specialty-id">
                          Alege specialitatea
                        </label>
                        <select
                          id="specialty-id"
                          className="mc-input"
                          value={selectedSpecialtyId}
                          onChange={(e) =>
                            setSelectedSpecialtyId(e.target.value)
                          }
                        >
                          {specialties.map((specialty) => (
                            <option key={specialty.id} value={specialty.id}>
                              {specialty.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <Input
                        id="new-specialty-name"
                        label="Specialitate nouă"
                        value={newSpecialtyName}
                        onChange={(e) => setNewSpecialtyName(e.target.value)}
                        placeholder="Ex: Cardiologie"
                      />
                    )}

                    <div className="mc-form-grid-2">
                      <Input
                        id="doctor-name"
                        label="Nume medic *"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="Ex: Popescu Andrei"
                      />

                      <Input
                        id="doctor-title"
                        label="Titlu"
                        value={doctorTitle}
                        onChange={(e) => setDoctorTitle(e.target.value)}
                        placeholder="Ex: Dr., Prof. Dr."
                      />

                      <Input
                        id="doctor-license"
                        label="Nr. licență / parafă"
                        value={doctorLicenseNumber}
                        onChange={(e) => setDoctorLicenseNumber(e.target.value)}
                        placeholder="Ex: MED12345"
                      />

                      <Input
                        id="doctor-phone"
                        label="Telefon"
                        value={doctorPhone}
                        onChange={(e) => setDoctorPhone(e.target.value)}
                        placeholder="+40..."
                      />

                      <div className="mc-grid-span-2">
                        <Input
                          id="doctor-email"
                          label="E-mail medic"
                          value={doctorEmail}
                          onChange={(e) => setDoctorEmail(e.target.value)}
                          placeholder="medic@clinica.ro"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div>
              <label className="mc-label">Status utilizator</label>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className={
                    createActive ? "mc-chip mc-chip-active" : "mc-chip"
                  }
                  onClick={() => setCreateActive(true)}
                >
                  Activ
                </button>
                <button
                  type="button"
                  className={
                    !createActive ? "mc-chip mc-chip-active" : "mc-chip"
                  }
                  onClick={() => setCreateActive(false)}
                >
                  Inactiv
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <ActionButton onClick={handleCreate} disabled={submitBusy}>
                {submitBusy ? "Se salvează..." : "Salvează"}
              </ActionButton>
              <ActionButton
                variant="secondary"
                onClick={() => setCreateOpen(false)}
                disabled={submitBusy}
              >
                Renunță
              </ActionButton>
            </div>
          </div>
        </Overlay>
      ) : null}

      {editOpen && editingItem ? (
        <Overlay
          onClose={() => {
            setEditOpen(false);
            setEditingItem(null);
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 24 }}>Editează utilizator</h3>
              <p className="mc-empty-note" style={{ marginTop: 8 }}>
                {editingItem.email}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditingItem(null);
              }}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--mc-muted)",
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            <Input
              id="edit-email"
              label="Email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="utilizator@clinica.ro"
            />

            <div>
              <label className="mc-label">Rol clinică</label>
              <div className="mc-chip-row" style={{ marginTop: 10 }}>
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={
                      editRole === role ? "mc-chip mc-chip-active" : "mc-chip"
                    }
                    onClick={() => resetEditDoctorIfNeeded(role)}
                  >
                    {roleLabel(role)}
                  </button>
                ))}
              </div>
            </div>

            {editRole === "doctor" ? (
              <div>
                <label className="mc-label">Medic asociat</label>
                <DoctorPicker
                  doctors={doctors}
                  value={editDoctorId}
                  onChange={setEditDoctorId}
                />
              </div>
            ) : null}

            <Input
              id="edit-password"
              label="Parolă nouă (opțional)"
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Lasă gol pentru a păstra parola actuală"
            />

            <div>
              <label className="mc-label">Status utilizator</label>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className={editActive ? "mc-chip mc-chip-active" : "mc-chip"}
                  onClick={() => setEditActive(true)}
                >
                  Activ
                </button>
                <button
                  type="button"
                  className={!editActive ? "mc-chip mc-chip-active" : "mc-chip"}
                  onClick={() => setEditActive(false)}
                >
                  Inactiv
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <ActionButton onClick={handleEdit} disabled={submitBusy}>
                {submitBusy ? "Se salvează..." : "Salvează modificările"}
              </ActionButton>
              <ActionButton
                variant="secondary"
                onClick={() => {
                  setEditOpen(false);
                  setEditingItem(null);
                }}
                disabled={submitBusy}
              >
                Renunță
              </ActionButton>
            </div>
          </div>
        </Overlay>
      ) : null}

      {deleteOpen && deletingItem ? (
        <Overlay
          onClose={() => {
            if (!deleteBusy) {
              setDeleteOpen(false);
              setDeletingItem(null);
            }
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 24 }}>Confirmă ștergerea</h3>
              <p className="mc-empty-note" style={{ marginTop: 8 }}>
                Sigur vrei să ștergi utilizatorul{" "}
                <strong>{deletingItem.email}</strong>?
              </p>
            </div>

            <div className="mc-danger-block">
              Această acțiune va elimina utilizatorul din clinică. Dacă nu mai
              are alte legături active, contul va fi șters complet.
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <ActionButton
                variant="danger"
                onClick={handleDeleteConfirmed}
                disabled={deleteBusy}
              >
                {deleteBusy ? "Se șterge..." : "Șterge utilizatorul"}
              </ActionButton>

              <ActionButton
                variant="secondary"
                onClick={() => {
                  if (!deleteBusy) {
                    setDeleteOpen(false);
                    setDeletingItem(null);
                  }
                }}
                disabled={deleteBusy}
              >
                Renunță
              </ActionButton>
            </div>
          </div>
        </Overlay>
      ) : null}
    </>
  );
}
