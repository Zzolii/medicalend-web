// Path: medicalend-web/app/(app)/patients/[id]/journey/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileText,
  GitBranch,
  Mail,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Save,
  Upload,
  User,
  X,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAppUser } from "@/components/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type PatientDetails = {
  id: number;
  user_id?: number | null;
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
  fhir_id?: string | null;
};

type JourneyAppointment = {
  id: number;
  provider_id?: number | null;
  provider_name?: string | null;
  doctor_id?: number | null;
  doctor_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  notes?: string | null;
};

type JourneyReferral = {
  id: number;
  from_provider_id: number;
  from_provider_name?: string | null;
  to_provider_id: number;
  to_provider_name?: string | null;
  reason?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type JourneyEpisode = {
  id: number;
  title?: string | null;
  status?: string | null;
  owner_provider_id: number;
  owner_provider_name?: string | null;
  created_at?: string | null;
  appointments: JourneyAppointment[];
  referrals: JourneyReferral[];
};

type PatientJourneyResponse = {
  patient_id: number;
  episodes: JourneyEpisode[];
};

type TimelineDocument = {
  id: number;
  title?: string | null;
  file_name?: string | null;
  created_at?: string | null;
  file_url?: string | null;
  appointment_id?: number | null;
};

type EpisodeTimeline = {
  episode?: unknown;
  appointments?: unknown[];
  notes?: unknown[];
  tasks?: unknown[];
  referrals?: unknown[];
  documents?: TimelineDocument[];
};

type EpisodeGroup = {
  episode: JourneyEpisode;
  appointments: JourneyAppointment[];
  referrals: JourneyReferral[];
  episodeDocuments: TimelineDocument[];
  documentsByAppointment: Record<number, TimelineDocument[]>;
  documentCount: number;
};

const LAST_JOURNEY_PATIENT_KEY = "medicalend_last_journey_patient_id";

function parseDate(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDate(value?: string | null) {
  const parsed = parseDate(value);

  if (!parsed) {
    return "Nespecificat";
  }

  return parsed.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  const parsed = parseDate(value);

  if (!parsed) {
    return "Nespecificat";
  }

  return parsed.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value?: string | null) {
  const parsed = parseDate(value);

  if (!parsed) {
    return "--:--";
  }

  return parsed.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value?: string | null) {
  switch (value) {
    case "open":
      return "Deschis";
    case "active":
      return "Activ";
    case "in_progress":
      return "În desfășurare";
    case "closed":
      return "Închis";
    case "completed":
      return "Finalizat";
    case "archived":
      return "Arhivat";
    case "scheduled":
      return "Programată";
    case "pending":
      return "În așteptare";
    case "accepted":
      return "Acceptată";
    case "rejected":
      return "Respinsă";
    case "canceled":
      return "Anulată";
    case "no_show":
      return "Neprezentat";
    default:
      return value || "Necunoscut";
  }
}

function statusClass(value?: string | null) {
  if (
    value === "open" ||
    value === "active" ||
    value === "scheduled" ||
    value === "completed" ||
    value === "accepted"
  ) {
    return "mc-pill mc-pill-success";
  }

  if (value === "pending" || value === "in_progress") {
    return "mc-pill mc-pill-warning";
  }

  return "mc-pill mc-pill-neutral";
}

function sortDesc<
  T extends {
    created_at?: string | null;
    start_time?: string | null;
  },
>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aValue = a.start_time || a.created_at;
    const bValue = b.start_time || b.created_at;

    const aTime = aValue ? new Date(aValue).getTime() : 0;
    const bTime = bValue ? new Date(bValue).getTime() : 0;

    return bTime - aTime;
  });
}

function appointmentTitle(item: JourneyAppointment) {
  if (item.notes?.trim()) {
    return item.notes.trim();
  }

  return "Consultație medicală";
}

function appointmentSubtitle(item: JourneyAppointment) {
  const doctor = item.doctor_name?.trim();
  const provider = item.provider_name?.trim();

  if (doctor && provider) {
    return `${doctor} • ${provider}`;
  }

  return doctor || provider || "Clinică / specialist";
}

function referralTitle(item: JourneyReferral) {
  const fromName =
    item.from_provider_name?.trim() || `Furnizor #${item.from_provider_id}`;

  const toName =
    item.to_provider_name?.trim() || `Furnizor #${item.to_provider_id}`;

  return `${fromName} → ${toName}`;
}

function documentTitle(item: TimelineDocument) {
  return item.title?.trim() || item.file_name?.trim() || `Document #${item.id}`;
}

function episodeFallbackTitle(episode: JourneyEpisode) {
  return episode.title?.trim() || "Episod medical";
}

function episodeYear(episode: JourneyEpisode) {
  const parsed = parseDate(episode.created_at);

  return parsed ? String(parsed.getFullYear()) : "Fără dată";
}

async function uploadEpisodeDocument(
  episodeId: number,
  token: string | null,
  file: File,
  title?: string,
) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("episode_id", String(episodeId));

  if (title?.trim()) {
    formData.append("title", title.trim());
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "/api/v1";

  const response = await fetch(`${apiBase}/documents/upload`, {
    method: "POST",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    body: formData,
  });

  if (!response.ok) {
    let message = "Nu am putut încărca documentul.";

    try {
      const data = await response.json();

      if (typeof data?.detail === "string" && data.detail.trim()) {
        message = data.detail;
      }
    } catch {
      // Răspunsul nu conține JSON valid.
    }

    throw new Error(message);
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function updateEpisodeTitle(
  episodeId: number,
  token: string | null,
  title: string,
) {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "/api/v1";

  const response = await fetch(`${apiBase}/care-episodes/${episodeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body: JSON.stringify({
      title,
    }),
  });

  if (!response.ok) {
    let message = "Nu am putut actualiza titlul episodului.";

    try {
      const data = await response.json();

      if (typeof data?.detail === "string" && data.detail.trim()) {
        message = data.detail;
      }
    } catch {
      // Răspunsul nu conține JSON valid.
    }

    throw new Error(message);
  }

  return response.json();
}

export default function PatientJourneyPage() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id;
  const token = useMemo(() => getToken(), []);
  const { role, clinicRole } = useAppUser();

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [journey, setJourney] = useState<PatientJourneyResponse | null>(null);

  const [documentsByEpisode, setDocumentsByEpisode] = useState<
    Record<number, TimelineDocument[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedEpisodeIds, setExpandedEpisodeIds] = useState<
    Record<number, boolean>
  >({});

  const [openUploadEpisodeId, setOpenUploadEpisodeId] = useState<number | null>(
    null,
  );

  const [editingEpisodeId, setEditingEpisodeId] = useState<number | null>(null);

  const [episodeTitleDraftById, setEpisodeTitleDraftById] = useState<
    Record<number, string>
  >({});

  const [savingEpisodeTitleId, setSavingEpisodeTitleId] = useState<
    number | null
  >(null);

  const [uploadTitleByEpisode, setUploadTitleByEpisode] = useState<
    Record<number, string>
  >({});

  const [uploadFileByEpisode, setUploadFileByEpisode] = useState<
    Record<number, File | null>
  >({});

  const [uploadingEpisodeId, setUploadingEpisodeId] = useState<number | null>(
    null,
  );

  const canUploadDocuments =
    role === "patient" ||
    role === "provider" ||
    clinicRole === "doctor" ||
    clinicRole === "assistant" ||
    clinicRole === "clinic_admin";

  const canEditEpisodeTitle =
    role === "provider" ||
    clinicRole === "doctor" ||
    clinicRole === "assistant" ||
    clinicRole === "clinic_admin";

  async function loadData(currentPatientId: string) {
    const [patientData, journeyData] = await Promise.all([
      apiRequest<PatientDetails>(`/patients/${currentPatientId}`, {
        token,
      }),
      apiRequest<PatientJourneyResponse>(
        `/patients/${currentPatientId}/journey`,
        {
          token,
        },
      ),
    ]);

    const episodeDocumentPairs = await Promise.all(
      (journeyData.episodes ?? []).map(async (episode) => {
        try {
          const timeline = await apiRequest<EpisodeTimeline>(
            `/care-episodes/${episode.id}/timeline`,
            {
              token,
            },
          );

          return [episode.id, timeline.documents ?? []] as const;
        } catch {
          return [episode.id, [] as TimelineDocument[]] as const;
        }
      }),
    );

    const nextDocumentsByEpisode: Record<number, TimelineDocument[]> = {};

    for (const [episodeId, documents] of episodeDocumentPairs) {
      nextDocumentsByEpisode[episodeId] = documents;
    }

    return {
      patientData,
      journeyData,
      nextDocumentsByEpisode,
    };
  }

  async function refreshData() {
    if (!patientId) {
      return;
    }

    const data = await loadData(patientId);

    setPatient(data.patientData);
    setJourney(data.journeyData);
    setDocumentsByEpisode(data.nextDocumentsByEpisode);
  }

  useEffect(() => {
    if (!patientId || typeof window === "undefined") {
      return;
    }

    localStorage.setItem(LAST_JOURNEY_PATIENT_KEY, String(patientId));
  }, [patientId]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!patientId) {
        if (mounted) {
          setError("ID-ul pacientului lipsește.");
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await loadData(patientId);

        if (!mounted) {
          return;
        }

        setPatient(data.patientData);
        setJourney(data.journeyData);
        setDocumentsByEpisode(data.nextDocumentsByEpisode);

        const firstEpisodeId = data.journeyData.episodes?.[0]?.id;

        if (firstEpisodeId) {
          setExpandedEpisodeIds({
            [firstEpisodeId]: true,
          });
        }
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Nu am putut încărca parcursul pacientului.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [patientId, token]);

  const episodes = useMemo(() => journey?.episodes ?? [], [journey?.episodes]);

  const fullName = useMemo(() => {
    return [patient?.first_name, patient?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }, [patient?.first_name, patient?.last_name]);

  const address = useMemo(() => {
    return [
      patient?.address_line,
      patient?.city,
      patient?.county,
      patient?.postal_code,
      patient?.country,
    ]
      .filter(Boolean)
      .join(", ");
  }, [
    patient?.address_line,
    patient?.city,
    patient?.county,
    patient?.postal_code,
    patient?.country,
  ]);

  const groupedJourney = useMemo<EpisodeGroup[]>(() => {
    const groups = episodes.map((episode) => {
      const documents = documentsByEpisode[episode.id] ?? [];

      const documentsByAppointment: Record<number, TimelineDocument[]> = {};

      const episodeDocuments: TimelineDocument[] = [];

      for (const document of documents) {
        if (typeof document.appointment_id === "number") {
          if (!documentsByAppointment[document.appointment_id]) {
            documentsByAppointment[document.appointment_id] = [];
          }

          documentsByAppointment[document.appointment_id].push(document);
        } else {
          episodeDocuments.push(document);
        }
      }

      return {
        episode,
        appointments: sortDesc(episode.appointments ?? []),
        referrals: sortDesc(episode.referrals ?? []),
        episodeDocuments: sortDesc(episodeDocuments),
        documentsByAppointment,
        documentCount: documents.length,
      };
    });

    return groups.sort((a, b) => {
      const aTime = a.episode.created_at
        ? new Date(a.episode.created_at).getTime()
        : 0;

      const bTime = b.episode.created_at
        ? new Date(b.episode.created_at).getTime()
        : 0;

      return bTime - aTime;
    });
  }, [documentsByEpisode, episodes]);

  const groupedByYear = useMemo(() => {
    const result: Record<string, EpisodeGroup[]> = {};

    for (const group of groupedJourney) {
      const year = episodeYear(group.episode);

      if (!result[year]) {
        result[year] = [];
      }

      result[year].push(group);
    }

    return result;
  }, [groupedJourney]);

  const totalDocuments = useMemo(() => {
    return Object.values(documentsByEpisode).reduce(
      (sum, documents) => sum + documents.length,
      0,
    );
  }, [documentsByEpisode]);

  const totalAppointments = useMemo(() => {
    return episodes.reduce(
      (sum, episode) => sum + (episode.appointments?.length ?? 0),
      0,
    );
  }, [episodes]);

  const totalReferrals = useMemo(() => {
    return episodes.reduce(
      (sum, episode) => sum + (episode.referrals?.length ?? 0),
      0,
    );
  }, [episodes]);

  function toggleEpisode(episodeId: number) {
    setExpandedEpisodeIds((previous) => ({
      ...previous,
      [episodeId]: !previous[episodeId],
    }));
  }

  function startEditingEpisodeTitle(episode: JourneyEpisode) {
    setEditingEpisodeId(episode.id);

    setEpisodeTitleDraftById((previous) => ({
      ...previous,
      [episode.id]: episodeFallbackTitle(episode),
    }));
  }

  function cancelEditingEpisodeTitle() {
    setEditingEpisodeId(null);
    setSavingEpisodeTitleId(null);
  }

  async function handleSaveEpisodeTitle(episodeId: number) {
    const title = (episodeTitleDraftById[episodeId] ?? "").trim();

    if (!title) {
      setError("Titlul episodului nu poate fi gol.");
      return;
    }

    try {
      setSavingEpisodeTitleId(episodeId);
      setError("");

      await updateEpisodeTitle(episodeId, token, title);
      await refreshData();

      setEditingEpisodeId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut actualiza titlul episodului.",
      );
    } finally {
      setSavingEpisodeTitleId(null);
    }
  }

  async function handleUploadDocument(episodeId: number) {
    const file = uploadFileByEpisode[episodeId] ?? null;
    const title = uploadTitleByEpisode[episodeId] ?? "";

    if (!file) {
      setError("Selectează mai întâi un fișier PDF pentru încărcare.");
      return;
    }

    try {
      setUploadingEpisodeId(episodeId);
      setError("");

      await uploadEpisodeDocument(episodeId, token, file, title);

      setUploadFileByEpisode((previous) => ({
        ...previous,
        [episodeId]: null,
      }));

      setUploadTitleByEpisode((previous) => ({
        ...previous,
        [episodeId]: "",
      }));

      setOpenUploadEpisodeId(null);

      await refreshData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut încărca documentul în episod.",
      );
    } finally {
      setUploadingEpisodeId(null);
    }
  }

  return (
    <div className="mc-page-shell">
      <section
        style={{
          overflow: "hidden",
          border: "1px solid var(--mc-border)",
          borderRadius: 24,
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(255,255,255,0.98) 62%)",
          boxShadow: "0 18px 44px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div style={{ padding: 28 }}>
          <Link
            href={`/patients/${patientId}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "var(--mc-primary)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={17} />
            Înapoi la profil
          </Link>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 28,
              marginTop: 24,
              alignItems: "center",
            }}
          >
            <div>
              <div
                className="mc-page-badge"
                style={{
                  width: "fit-content",
                  marginBottom: 14,
                }}
              >
                <GitBranch size={16} style={{ marginRight: 8 }} />
                Parcursul pacientului
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(30px, 4vw, 44px)",
                  lineHeight: 1.04,
                  letterSpacing: "-0.035em",
                }}
              >
                {fullName || "Pacient"}
              </h1>

              <p
                style={{
                  margin: "14px 0 0",
                  maxWidth: 720,
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                }}
              >
                O vedere cronologică a episoadelor, consultațiilor, documentelor
                și trimiterilor medicale.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 20,
                }}
              >
                <Link href={`/patients/${patientId}`}>
                  <Button variant="secondary">
                    <User size={16} />
                    Profil pacient
                  </Button>
                </Link>

                <Link href="/patients">
                  <Button variant="ghost">Lista pacienților</Button>
                </Link>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
                gap: 12,
              }}
            >
              {[
                {
                  label: "Episoade",
                  value: episodes.length,
                  icon: <Activity size={19} />,
                },
                {
                  label: "Programări",
                  value: totalAppointments,
                  icon: <CalendarDays size={19} />,
                },
                {
                  label: "Documente",
                  value: totalDocuments,
                  icon: <Paperclip size={19} />,
                },
                {
                  label: "Trimiteri",
                  value: totalReferrals,
                  icon: <GitBranch size={19} />,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: 16,
                    border: "1px solid rgba(148,163,184,0.22)",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.86)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      color: "var(--mc-primary)",
                    }}
                  >
                    {item.icon}
                    <strong style={{ fontSize: 25 }}>{item.value}</strong>
                  </div>

                  <div
                    style={{
                      marginTop: 9,
                      color: "var(--mc-muted)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {patient ? (
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid rgba(148,163,184,0.22)",
              }}
            >
              <span className="mc-pill mc-pill-neutral">
                <CalendarDays size={14} />
                {formatDate(patient.birth_date)}
              </span>

              {patient.phone ? (
                <span className="mc-pill mc-pill-neutral">
                  <Phone size={14} />
                  {patient.phone}
                </span>
              ) : null}

              {patient.email ? (
                <span className="mc-pill mc-pill-neutral">
                  <Mail size={14} />
                  {patient.email}
                </span>
              ) : null}

              {address ? (
                <span className="mc-pill mc-pill-neutral">
                  <MapPin size={14} />
                  {address}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {loading ? (
        <Card>
          <CardContent style={{ padding: 24 }}>
            <p className="mc-empty-note">Se încarcă parcursul pacientului...</p>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="mc-error-banner">{error}</p> : null}

      {!loading && !error && groupedJourney.length === 0 ? (
        <Card>
          <CardContent
            style={{
              padding: 40,
              textAlign: "center",
            }}
          >
            <Activity
              size={34}
              color="var(--mc-muted)"
              style={{ marginBottom: 12 }}
            />

            <h2 style={{ margin: 0 }}>Nu există încă episoade</h2>

            <p
              className="mc-empty-note"
              style={{
                marginTop: 10,
              }}
            >
              Episoadele medicale ale pacientului vor apărea aici în ordine
              cronologică.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && !error && groupedJourney.length > 0 ? (
        <section
          style={{
            display: "grid",
            gap: 30,
          }}
        >
          {Object.entries(groupedByYear).map(([year, yearGroups]) => (
            <div key={year}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <strong
                  style={{
                    fontSize: 22,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {year}
                </strong>

                <div
                  style={{
                    height: 1,
                    flex: 1,
                    background: "var(--mc-border)",
                  }}
                />
              </div>

              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gap: 18,
                  paddingLeft: 30,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 8,
                    top: 16,
                    bottom: 16,
                    width: 2,
                    borderRadius: 999,
                    background:
                      "linear-gradient(180deg, var(--mc-primary), rgba(148,163,184,0.28))",
                  }}
                />

                {yearGroups.map((group) => {
                  const episode = group.episode;
                  const episodeId = episode.id;

                  const expanded = expandedEpisodeIds[episodeId] ?? false;

                  const uploadOpen = openUploadEpisodeId === episodeId;

                  const editing = editingEpisodeId === episodeId;

                  const saving = savingEpisodeTitleId === episodeId;

                  const uploading = uploadingEpisodeId === episodeId;

                  const title = episodeFallbackTitle(episode);

                  const titleDraft = episodeTitleDraftById[episodeId] ?? title;

                  const selectedFile = uploadFileByEpisode[episodeId] ?? null;

                  const uploadTitle = uploadTitleByEpisode[episodeId] ?? "";

                  return (
                    <article
                      key={episodeId}
                      style={{
                        position: "relative",
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          left: -29,
                          top: 26,
                          width: 16,
                          height: 16,
                          border: "4px solid white",
                          borderRadius: 999,
                          background: "var(--mc-primary)",
                          boxShadow: "0 0 0 1px rgba(37,99,235,0.22)",
                        }}
                      />

                      <Card
                        style={{
                          overflow: "hidden",
                          borderRadius: 22,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 18,
                            padding: 22,
                            cursor: "pointer",
                          }}
                          onClick={() => toggleEpisode(episodeId)}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 14,
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                placeItems: "center",
                                width: 44,
                                height: 44,
                                flexShrink: 0,
                                borderRadius: 14,
                                color: "var(--mc-primary)",
                                background: "rgba(37,99,235,0.10)",
                              }}
                            >
                              <Activity size={21} />
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              {editing ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gap: 10,
                                  }}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Input
                                    id={`episode-title-${episodeId}`}
                                    label="Titlul episodului"
                                    value={titleDraft}
                                    onChange={(event) =>
                                      setEpisodeTitleDraftById((previous) => ({
                                        ...previous,
                                        [episodeId]: event.target.value,
                                      }))
                                    }
                                    placeholder="Ex: Control cardiologic"
                                  />

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <Button
                                      onClick={() =>
                                        handleSaveEpisodeTitle(episodeId)
                                      }
                                      disabled={saving}
                                    >
                                      <Save size={16} />
                                      {saving ? "Se salvează..." : "Salvează"}
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      onClick={cancelEditingEpisodeTitle}
                                      disabled={saving}
                                    >
                                      <X size={16} />
                                      Anulează
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h2
                                    style={{
                                      margin: 0,
                                      fontSize: 21,
                                      lineHeight: 1.25,
                                      letterSpacing: "-0.02em",
                                    }}
                                  >
                                    {title}
                                  </h2>

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      flexWrap: "wrap",
                                      marginTop: 8,
                                      color: "var(--mc-muted)",
                                      fontSize: 14,
                                    }}
                                  >
                                    <span>
                                      {episode.owner_provider_name ||
                                        "Furnizor medical"}
                                    </span>

                                    <span>•</span>

                                    <span>
                                      {formatDate(episode.created_at)}
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      flexWrap: "wrap",
                                      marginTop: 13,
                                    }}
                                  >
                                    <span
                                      className={statusClass(episode.status)}
                                    >
                                      {statusLabel(episode.status)}
                                    </span>

                                    <span className="mc-pill mc-pill-neutral">
                                      {group.appointments.length} programări
                                    </span>

                                    <span className="mc-pill mc-pill-neutral">
                                      {group.documentCount} documente
                                    </span>

                                    <span className="mc-pill mc-pill-neutral">
                                      {group.referrals.length} trimiteri
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {!editing ? (
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              {canEditEpisodeTitle ? (
                                <Button
                                  variant="ghost"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startEditingEpisodeTitle(episode);
                                  }}
                                >
                                  <Pencil size={16} />
                                </Button>
                              ) : null}

                              <div
                                style={{
                                  display: "grid",
                                  placeItems: "center",
                                  width: 36,
                                  height: 36,
                                }}
                              >
                                {expanded ? (
                                  <ChevronDown size={21} />
                                ) : (
                                  <ChevronRight size={21} />
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {expanded ? (
                          <CardContent
                            style={{
                              padding: "0 22px 24px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                                paddingTop: 18,
                                borderTop: "1px solid var(--mc-border)",
                              }}
                            >
                              <Link href={`/episodes/${episodeId}`}>
                                <Button>
                                  <FileText size={16} />
                                  Deschide episodul
                                </Button>
                              </Link>

                              {canUploadDocuments ? (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    setOpenUploadEpisodeId(
                                      uploadOpen ? null : episodeId,
                                    )
                                  }
                                >
                                  <Plus size={16} />
                                  Adaugă document
                                </Button>
                              ) : null}
                            </div>

                            {uploadOpen && canUploadDocuments ? (
                              <div
                                className="mc-upload-zone"
                                style={{
                                  marginTop: 18,
                                  display: "grid",
                                  gap: 14,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    alignItems: "center",
                                  }}
                                >
                                  <div>
                                    <strong>Document nou</strong>

                                    <div
                                      style={{
                                        marginTop: 4,
                                        color: "var(--mc-muted)",
                                        fontSize: 14,
                                      }}
                                    >
                                      Atașează un fișier PDF acestui episod.
                                    </div>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    onClick={() => setOpenUploadEpisodeId(null)}
                                  >
                                    <X size={16} />
                                  </Button>
                                </div>

                                <Input
                                  id={`journey-document-title-${episodeId}`}
                                  label="Titlu document (opțional)"
                                  value={uploadTitle}
                                  onChange={(event) =>
                                    setUploadTitleByEpisode((previous) => ({
                                      ...previous,
                                      [episodeId]: event.target.value,
                                    }))
                                  }
                                  placeholder="Ex: Analize, rezultat RMN"
                                />

                                <div>
                                  <label
                                    className="mc-label"
                                    htmlFor={`journey-document-file-${episodeId}`}
                                  >
                                    Fișier PDF
                                  </label>

                                  <input
                                    id={`journey-document-file-${episodeId}`}
                                    type="file"
                                    className="mc-input"
                                    accept=".pdf,application/pdf"
                                    onChange={(event) =>
                                      setUploadFileByEpisode((previous) => ({
                                        ...previous,
                                        [episodeId]:
                                          event.target.files?.[0] || null,
                                      }))
                                    }
                                  />
                                </div>

                                {selectedFile ? (
                                  <div className="mc-muted-block">
                                    <strong>Fișier selectat:</strong>{" "}
                                    {selectedFile.name}
                                  </div>
                                ) : null}

                                <Button
                                  onClick={() =>
                                    handleUploadDocument(episodeId)
                                  }
                                  disabled={uploading || !selectedFile}
                                >
                                  <Upload size={16} />
                                  {uploading
                                    ? "Se încarcă..."
                                    : "Încarcă documentul"}
                                </Button>
                              </div>
                            ) : null}

                            <div
                              style={{
                                display: "grid",
                                gap: 24,
                                marginTop: 24,
                              }}
                            >
                              <section>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 9,
                                    marginBottom: 12,
                                  }}
                                >
                                  <CalendarDays
                                    size={18}
                                    color="var(--mc-primary)"
                                  />
                                  <h3
                                    style={{
                                      margin: 0,
                                      fontSize: 18,
                                    }}
                                  >
                                    Programări
                                  </h3>
                                </div>

                                {group.appointments.length === 0 ? (
                                  <p className="mc-empty-note">
                                    Nu există programări asociate.
                                  </p>
                                ) : (
                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 10,
                                    }}
                                  >
                                    {group.appointments.map((appointment) => {
                                      const documents =
                                        group.documentsByAppointment[
                                          appointment.id
                                        ] ?? [];

                                      return (
                                        <div
                                          key={appointment.id}
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                              "72px minmax(0, 1fr) auto",
                                            gap: 14,
                                            alignItems: "center",
                                            padding: 15,
                                            border:
                                              "1px solid var(--mc-border)",
                                            borderRadius: 16,
                                            background: "rgba(248,250,252,0.7)",
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: 18,
                                              fontWeight: 800,
                                              color: "var(--mc-primary)",
                                            }}
                                          >
                                            {formatTime(appointment.start_time)}
                                          </div>

                                          <div
                                            style={{
                                              minWidth: 0,
                                            }}
                                          >
                                            <strong
                                              style={{
                                                display: "block",
                                              }}
                                            >
                                              {appointmentTitle(appointment)}
                                            </strong>

                                            <span
                                              style={{
                                                display: "block",
                                                marginTop: 4,
                                                color: "var(--mc-muted)",
                                                fontSize: 14,
                                              }}
                                            >
                                              {appointmentSubtitle(appointment)}
                                            </span>

                                            <span
                                              style={{
                                                display: "block",
                                                marginTop: 3,
                                                color: "var(--mc-muted)",
                                                fontSize: 13,
                                              }}
                                            >
                                              {formatDate(
                                                appointment.start_time,
                                              )}
                                              {documents.length > 0
                                                ? ` • ${documents.length} documente`
                                                : ""}
                                            </span>
                                          </div>

                                          <div
                                            style={{
                                              display: "flex",
                                              gap: 8,
                                              alignItems: "center",
                                              flexWrap: "wrap",
                                              justifyContent: "flex-end",
                                            }}
                                          >
                                            <span
                                              className={statusClass(
                                                appointment.status,
                                              )}
                                            >
                                              {statusLabel(appointment.status)}
                                            </span>

                                            <Link
                                              href={`/appointments/${appointment.id}`}
                                            >
                                              <Button variant="secondary">
                                                Deschide
                                              </Button>
                                            </Link>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </section>

                              <section>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 9,
                                    marginBottom: 12,
                                  }}
                                >
                                  <Paperclip
                                    size={18}
                                    color="var(--mc-primary)"
                                  />

                                  <h3
                                    style={{
                                      margin: 0,
                                      fontSize: 18,
                                    }}
                                  >
                                    Documente
                                  </h3>
                                </div>

                                {group.episodeDocuments.length === 0 ? (
                                  <p className="mc-empty-note">
                                    Nu există documente atașate direct
                                    episodului.
                                  </p>
                                ) : (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(240px, 1fr))",
                                      gap: 10,
                                    }}
                                  >
                                    {group.episodeDocuments.map((document) => (
                                      <Link
                                        key={document.id}
                                        href={`/documents/${document.id}`}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 12,
                                          padding: 14,
                                          border: "1px solid var(--mc-border)",
                                          borderRadius: 16,
                                          color: "inherit",
                                          textDecoration: "none",
                                          background: "white",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "grid",
                                            placeItems: "center",
                                            width: 40,
                                            height: 40,
                                            flexShrink: 0,
                                            borderRadius: 12,
                                            color: "var(--mc-primary)",
                                            background: "rgba(37,99,235,0.10)",
                                          }}
                                        >
                                          <FileText size={19} />
                                        </div>

                                        <div
                                          style={{
                                            minWidth: 0,
                                            flex: 1,
                                          }}
                                        >
                                          <strong
                                            style={{
                                              display: "block",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {documentTitle(document)}
                                          </strong>

                                          <span
                                            style={{
                                              display: "block",
                                              marginTop: 4,
                                              color: "var(--mc-muted)",
                                              fontSize: 13,
                                            }}
                                          >
                                            {formatDateTime(
                                              document.created_at,
                                            )}
                                          </span>
                                        </div>

                                        <ChevronRight
                                          size={18}
                                          color="var(--mc-muted)"
                                        />
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </section>

                              <section>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 9,
                                    marginBottom: 12,
                                  }}
                                >
                                  <GitBranch
                                    size={18}
                                    color="var(--mc-primary)"
                                  />

                                  <h3
                                    style={{
                                      margin: 0,
                                      fontSize: 18,
                                    }}
                                  >
                                    Trimiteri
                                  </h3>
                                </div>

                                {group.referrals.length === 0 ? (
                                  <p className="mc-empty-note">
                                    Nu există trimiteri asociate.
                                  </p>
                                ) : (
                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 10,
                                    }}
                                  >
                                    {group.referrals.map((referral) => (
                                      <div
                                        key={referral.id}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          gap: 16,
                                          flexWrap: "wrap",
                                          padding: 15,
                                          border: "1px solid var(--mc-border)",
                                          borderRadius: 16,
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: 12,
                                          }}
                                        >
                                          <CircleDot
                                            size={18}
                                            color="var(--mc-primary)"
                                            style={{
                                              marginTop: 2,
                                            }}
                                          />

                                          <div>
                                            <strong>
                                              {referralTitle(referral)}
                                            </strong>

                                            <div
                                              style={{
                                                marginTop: 5,
                                                color: "var(--mc-muted)",
                                                fontSize: 14,
                                              }}
                                            >
                                              {referral.reason ||
                                                "Fără motiv specificat"}
                                            </div>

                                            <div
                                              style={{
                                                marginTop: 4,
                                                color: "var(--mc-muted)",
                                                fontSize: 13,
                                              }}
                                            >
                                              {formatDateTime(
                                                referral.created_at,
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <span
                                          className={statusClass(
                                            referral.status,
                                          )}
                                        >
                                          {statusLabel(referral.status)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </section>
                            </div>
                          </CardContent>
                        ) : null}
                      </Card>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
