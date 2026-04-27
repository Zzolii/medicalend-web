// Path: medicalend-web/app/(app)/patients/[id]/journey/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  FileText,
  MapPin,
  Paperclip,
  Upload,
  User,
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

type EpisodeRow = {
  id: number;
  patient_id?: number;
  owner_provider_id?: number;
  title?: string;
  status?: string;
  created_at?: string;
};

type TimelineAppointment = {
  id: number;
  start_time?: string;
  end_time?: string | null;
  status?: string;
  patient_id?: number | null;
  provider_id?: number | null;
  doctor_id?: number | null;
  notes?: string | null;
  patient_name?: string | null;
  provider_name?: string | null;
  doctor_name?: string | null;
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
  episode: EpisodeRow;
  appointments: TimelineAppointment[];
  notes: unknown[];
  tasks: unknown[];
  referrals: unknown[];
  documents: TimelineDocument[];
};

type EpisodeGroup = {
  episode: EpisodeRow;
  appointments: TimelineAppointment[];
  episodeDocuments: TimelineDocument[];
  documentsByAppointment: Record<number, TimelineDocument[]>;
};

const LAST_JOURNEY_PATIENT_KEY = "medicalend_last_journey_patient_id";

function formatDate(value?: string | null) {
  if (!value) return "Nespecificat";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ro-RO");
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

function statusLabel(value?: string | null) {
  if (!value) return "Necunoscut";
  if (value === "open") return "Deschis";
  if (value === "active") return "Activ";
  if (value === "in_progress") return "În desfășurare";
  if (value === "closed") return "Închis";
  if (value === "completed") return "Finalizat";
  if (value === "archived") return "Arhivat";
  if (value === "scheduled") return "Programată";
  if (value === "pending") return "În așteptare";
  if (value === "accepted") return "Acceptată";
  if (value === "rejected") return "Respinsă";
  if (value === "canceled") return "Anulată";
  return value;
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

  if (
    value === "closed" ||
    value === "archived" ||
    value === "rejected" ||
    value === "canceled"
  ) {
    return "mc-pill mc-pill-neutral";
  }

  return "mc-pill mc-pill-neutral";
}

function sortDesc<
  T extends { created_at?: string | null; start_time?: string | null },
>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aValue = a.start_time || a.created_at;
    const bValue = b.start_time || b.created_at;
    const aTime = aValue ? new Date(aValue).getTime() : 0;
    const bTime = bValue ? new Date(bValue).getTime() : 0;
    return bTime - aTime;
  });
}

function appointmentTitle(item: TimelineAppointment) {
  if (item.notes?.trim()) return item.notes.trim();
  return "Consultație medicală";
}

function appointmentSubtitle(item: TimelineAppointment) {
  if (item.doctor_name?.trim() && item.provider_name?.trim()) {
    return `${item.doctor_name.trim()} • ${item.provider_name.trim()}`;
  }

  if (item.doctor_name?.trim()) return item.doctor_name.trim();
  if (item.provider_name?.trim()) return item.provider_name.trim();

  return "Clinică / specialist";
}

function documentTitle(item: TimelineDocument) {
  return (
    item.title?.trim() || item.file_name?.trim() || `Document PDF #${item.id}`
  );
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
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    let message = "Nu am putut încărca documentul.";

    try {
      const data = await response.json();
      if (typeof data?.detail === "string" && data.detail.trim()) {
        message = data.detail;
      }
    } catch {}

    throw new Error(message);
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function PatientJourneyPage() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id;
  const token = useMemo(() => getToken(), []);
  const { role, clinicRole } = useAppUser();

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeRow[]>([]);
  const [timelines, setTimelines] = useState<EpisodeTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    role === "admin" ||
    role === "provider" ||
    clinicRole === "doctor" ||
    clinicRole === "assistant" ||
    clinicRole === "clinic_admin";

  const loadData = async (currentPatientId: string) => {
    const [patientData, allEpisodes] = await Promise.all([
      apiRequest<PatientDetails>(`/patients/${currentPatientId}`, { token }),
      apiRequest<EpisodeRow[]>("/care-episodes/", { token }),
    ]);

    const patientEpisodes = (allEpisodes ?? []).filter(
      (item) => String(item.patient_id ?? "") === String(currentPatientId),
    );

    const episodeTimelines = await Promise.all(
      patientEpisodes.map(async (episode) => {
        try {
          const timeline = await apiRequest<EpisodeTimeline>(
            `/care-episodes/${episode.id}/timeline`,
            { token },
          );

          return {
            episode,
            appointments: timeline.appointments ?? [],
            notes: timeline.notes ?? [],
            tasks: timeline.tasks ?? [],
            referrals: timeline.referrals ?? [],
            documents: timeline.documents ?? [],
          } satisfies EpisodeTimeline;
        } catch {
          return {
            episode,
            appointments: [],
            notes: [],
            tasks: [],
            referrals: [],
            documents: [],
          } satisfies EpisodeTimeline;
        }
      }),
    );

    return {
      patientData,
      patientEpisodes,
      episodeTimelines,
    };
  };

  useEffect(() => {
    if (!patientId || typeof window === "undefined") return;
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

        if (!mounted) return;

        setPatient(data.patientData);
        setEpisodes(data.patientEpisodes);
        setTimelines(data.episodeTimelines);
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Nu am putut încărca Journey-ul pacientului.",
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
    const groups = timelines.map((entry) => {
      const documentsByAppointment: Record<number, TimelineDocument[]> = {};
      const episodeDocuments: TimelineDocument[] = [];

      for (const document of entry.documents) {
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
        episode: entry.episode,
        appointments: sortDesc(entry.appointments),
        episodeDocuments: sortDesc(episodeDocuments),
        documentsByAppointment,
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
  }, [timelines]);

  const totalDocuments = useMemo(
    () =>
      timelines.reduce((sum, group) => sum + (group.documents?.length ?? 0), 0),
    [timelines],
  );

  const totalAppointments = useMemo(
    () =>
      timelines.reduce(
        (sum, group) => sum + (group.appointments?.length ?? 0),
        0,
      ),
    [timelines],
  );

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

      setUploadFileByEpisode((prev) => ({
        ...prev,
        [episodeId]: null,
      }));
      setUploadTitleByEpisode((prev) => ({
        ...prev,
        [episodeId]: "",
      }));

      if (!patientId) return;

      const data = await loadData(patientId);
      setPatient(data.patientData);
      setEpisodes(data.patientEpisodes);
      setTimelines(data.episodeTimelines);
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
            <div style={{ maxWidth: 780 }}>
              <div style={{ marginBottom: 14 }}>
                <Link
                  href={`/patients/${patientId}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--mc-primary)",
                    fontWeight: 700,
                  }}
                >
                  <ArrowLeft size={16} />
                  Înapoi la profilul pacientului
                </Link>
              </div>

              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <Activity size={16} style={{ marginRight: 8 }} />
                Journey
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                {fullName || `Pacient #${patientId}`}
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 760,
                }}
              >
                Episoadele, programările și fișierele PDF sunt afișate într-o
                structură vizuală ușor de urmărit. Documentele sunt păstrate ca
                fișiere atașate, fără interpretare automată.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 18,
                  flexWrap: "wrap",
                }}
              >
                <Link href={`/patients/${patientId}`}>
                  <Button variant="secondary">Profil pacient</Button>
                </Link>

                <Link href="/patients">
                  <Button variant="ghost">Înapoi la pacienți</Button>
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
                <strong>ID pacient</strong>
                <span>{patient?.id ?? patientId ?? "-"}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Episoade</strong>
                <span>{episodes.length}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Programări</strong>
                <span>{totalAppointments}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="mc-empty-note">Se încarcă Journey-ul...</p>
      ) : null}
      {error ? <p className="mc-error-banner">{error}</p> : null}

      {!loading && !error && patient ? (
        <>
          <section className="mc-stats-grid">
            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Episoade</p>
                  <p className="mc-stat-value">{episodes.length}</p>
                </div>
                <div className="mc-icon-badge">
                  <Activity size={20} />
                </div>
              </div>
              <p className="mc-stat-note">Grupurile principale din Journey.</p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">PDF-uri</p>
                  <p className="mc-stat-value">{totalDocuments}</p>
                </div>
                <div className="mc-icon-badge">
                  <Paperclip size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Fișiere atașate episoadelor sau programărilor.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Programări</p>
                  <p className="mc-stat-value">{totalAppointments}</p>
                </div>
                <div className="mc-icon-badge">
                  <CalendarDays size={20} />
                </div>
              </div>
              <p className="mc-stat-note">Programări legate de episoade.</p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Pacient</p>
                  <p className="mc-stat-value">1</p>
                </div>
                <div className="mc-icon-badge">
                  <User size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Journey-ul este deschis pentru pacientul selectat.
              </p>
            </Card>
          </section>

          <section className="mc-dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Rezumat pacient</CardTitle>
                <CardDescription>
                  Date de identificare și contact pentru orientare rapidă.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Nume</strong>
                      <span>{fullName || "Nespecificat"}</span>
                    </div>
                    <User size={16} color="var(--mc-muted)" />
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Data nașterii</strong>
                      <span>{formatDate(patient.birth_date)}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Email</strong>
                      <span>{patient.email || "Nedisponibil"}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Telefon</strong>
                      <span>{patient.phone || "Nedisponibil"}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Adresă</strong>
                      <span>{address || "Nespecificată"}</span>
                    </div>
                    <MapPin size={16} color="var(--mc-muted)" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Structură Journey</CardTitle>
                <CardDescription>
                  Organizare vizuală pe episoade, programări și PDF-uri.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Episoade</strong>
                      <span>Fiecare card reprezintă un episod separat.</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Programări</strong>
                      <span>
                        Scopul programării este afișat din câmpul notes.
                      </span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Documente PDF</strong>
                      <span>
                        Fișierele sunt afișate ca atașamente, fără structurare
                        sau interpretare automată.
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {groupedJourney.length === 0 ? (
            <Card>
              <CardContent>
                <p className="mc-empty-note">
                  Nu există încă episoade pentru acest pacient.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: "grid", gap: 18 }}>
              {groupedJourney.map((group) => {
                const episode = group.episode;
                const episodeTitle = episode.title || `Episod #${episode.id}`;
                const selectedFile = uploadFileByEpisode[episode.id] ?? null;
                const uploadTitle = uploadTitleByEpisode[episode.id] ?? "";
                const isUploading = uploadingEpisodeId === episode.id;

                return (
                  <Card key={episode.id}>
                    <CardHeader>
                      <CardTitle
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span>{episodeTitle}</span>
                        <span className={statusClass(episode.status)}>
                          {statusLabel(episode.status)}
                        </span>
                      </CardTitle>

                      <CardDescription>
                        Creat la {formatDateTime(episode.created_at)} •
                        provider: {episode.owner_provider_id ?? "—"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 16,
                        }}
                      >
                        <Link href={`/episodes/${episode.id}`}>
                          <Button>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <FileText size={16} />
                              Deschide episodul
                            </span>
                          </Button>
                        </Link>
                      </div>

                      {canUploadDocuments ? (
                        <div
                          className="mc-upload-zone"
                          style={{ marginBottom: 18 }}
                        >
                          <Input
                            id={`journey-document-title-${episode.id}`}
                            label="Titlu document (opțional)"
                            value={uploadTitle}
                            onChange={(e) =>
                              setUploadTitleByEpisode((prev) => ({
                                ...prev,
                                [episode.id]: e.target.value,
                              }))
                            }
                            placeholder="Ex: rezultat PDF, bilet, recomandare"
                          />

                          <div>
                            <label
                              className="mc-label"
                              htmlFor={`journey-document-file-${episode.id}`}
                            >
                              Fișier PDF
                            </label>
                            <input
                              id={`journey-document-file-${episode.id}`}
                              type="file"
                              className="mc-input"
                              accept=".pdf"
                              onChange={(e) =>
                                setUploadFileByEpisode((prev) => ({
                                  ...prev,
                                  [episode.id]: e.target.files?.[0] || null,
                                }))
                              }
                            />
                          </div>

                          <div className="mc-muted-block">
                            <div>
                              <strong>Fișier selectat:</strong>{" "}
                              {selectedFile?.name || "Niciun fișier"}
                            </div>
                            <div>
                              Documentul va fi atașat acestui episod ca fișier
                              PDF.
                            </div>
                          </div>

                          <Button
                            onClick={() => handleUploadDocument(episode.id)}
                            disabled={isUploading || !selectedFile}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Upload size={16} />
                              {isUploading
                                ? "Se încarcă..."
                                : "Încarcă documentul"}
                            </span>
                          </Button>
                        </div>
                      ) : null}

                      <div style={{ display: "grid", gap: 14 }}>
                        <div>
                          <h3
                            style={{
                              margin: "0 0 10px",
                              fontSize: 18,
                              lineHeight: 1.2,
                            }}
                          >
                            Programări
                          </h3>

                          {group.appointments.length === 0 ? (
                            <p className="mc-empty-note">
                              Nu există programări legate de acest episod.
                            </p>
                          ) : (
                            <div className="mc-list">
                              {group.appointments.map((appointment) => {
                                const docs =
                                  group.documentsByAppointment[
                                    appointment.id
                                  ] ?? [];

                                return (
                                  <div
                                    key={appointment.id}
                                    className="mc-list-item"
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
                                          {appointmentTitle(appointment)}
                                        </strong>
                                        <span>
                                          {appointmentSubtitle(appointment)}
                                        </span>
                                        <span>
                                          {formatDateTime(
                                            appointment.start_time,
                                          )}
                                        </span>
                                      </div>

                                      <span
                                        className={statusClass(
                                          appointment.status,
                                        )}
                                      >
                                        {statusLabel(appointment.status)}
                                      </span>
                                    </div>

                                    <div style={{ marginTop: 10 }}>
                                      <Link
                                        href={`/appointments/${appointment.id}`}
                                      >
                                        <Button variant="secondary">
                                          Deschide programarea
                                        </Button>
                                      </Link>
                                    </div>

                                    {docs.length > 0 ? (
                                      <div
                                        style={{
                                          marginTop: 12,
                                          display: "grid",
                                          gap: 8,
                                        }}
                                      >
                                        <strong>Documente atașate</strong>

                                        {sortDesc(docs).map((doc) => (
                                          <div
                                            key={doc.id}
                                            className="mc-muted-block"
                                          >
                                            <div>
                                              <strong>
                                                {documentTitle(doc)}
                                              </strong>
                                            </div>
                                            <div>
                                              {formatDateTime(doc.created_at)}
                                            </div>
                                            <div>
                                              <Link
                                                href={`/documents/${doc.id}`}
                                              >
                                                <Button variant="secondary">
                                                  Vezi documentul
                                                </Button>
                                              </Link>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div>
                          <h3
                            style={{
                              margin: "8px 0 10px",
                              fontSize: 18,
                              lineHeight: 1.2,
                            }}
                          >
                            PDF-uri atașate episodului
                          </h3>

                          {group.episodeDocuments.length === 0 ? (
                            <p className="mc-empty-note">
                              Nu există PDF-uri atașate direct acestui episod.
                            </p>
                          ) : (
                            <div className="mc-list">
                              {group.episodeDocuments.map((doc) => (
                                <div key={doc.id} className="mc-list-item">
                                  <strong>{documentTitle(doc)}</strong>
                                  <span>{formatDateTime(doc.created_at)}</span>

                                  <div style={{ marginTop: 8 }}>
                                    <Link href={`/documents/${doc.id}`}>
                                      <Button variant="secondary">
                                        Vezi documentul
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
