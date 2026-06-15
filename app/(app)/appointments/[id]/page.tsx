// Path: medicalend-web/app/(app)/appointments/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileText,
  Paperclip,
  Upload,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { AppFeedback } from "@/components/app-feedback";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AppointmentDetails = {
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
  created_at?: string | null;
  patient_name?: string | null;
  provider_name?: string | null;
  doctor_name?: string | null;
};

type TaskRow = {
  id: number;
  title?: string;
  due_at?: string | null;
  assigned_to_role?: string | null;
  status?: string;
};

type MedicalDocument = {
  id: number;
  episode_id: number;
  appointment_id?: number | null;
  file_name: string;
  file_url?: string | null;
  mime_type?: string | null;
  created_at: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Nespecificat";

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);

  if (!match) return raw;

  const [, year, month, day, hour, minute] = match;

  return `${day}.${month}.${year}, ${hour}:${minute}`;
}

function getStatusClass(status?: string) {
  if (status === "scheduled" || status === "completed" || status === "done") {
    return "mc-pill mc-pill-success";
  }
  if (status === "pending" || status === "in_progress" || status === "todo") {
    return "mc-pill mc-pill-warning";
  }
  return "mc-pill mc-pill-neutral";
}

function nextAppointmentStatus(current?: string) {
  if (current === "scheduled") return "in_progress";
  if (current === "in_progress") return "completed";
  return current || "scheduled";
}

function normalizeFriendlyError(err: unknown) {
  const text =
    err instanceof Error ? err.message : "Nu am putut încărca programarea.";
  const lower = text.toLowerCase();

  if (
    lower.includes("forbidden") ||
    lower.includes("permission") ||
    lower.includes("not enough permissions") ||
    lower.includes("403")
  ) {
    return {
      type: "permission" as const,
      title: "Acces restricționat",
      message:
        "Rolul tău nu permite modificarea sau vizualizarea completă a acestei programări.",
    };
  }

  return {
    type: "error" as const,
    title: "Nu am putut încărca programarea",
    message: text,
  };
}

async function uploadAppointmentDocument(params: {
  appointmentId: string;
  episodeId: number;
  token: string | null;
  file: File;
}) {
  const form = new FormData();
  form.append("file", params.file);
  form.append("episode_id", String(params.episodeId));
  form.append("appointment_id", params.appointmentId);

  return apiRequest<MedicalDocument>("/documents/upload", {
    method: "POST",
    token: params.token,
    body: form,
  });
}

export default function AppointmentDetailsPage() {
  const params = useParams<{ id: string }>();
  const appointmentId = params?.id;
  const token = useMemo(() => getToken(), []);

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(
    null,
  );
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusSaving, setStatusSaving] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function loadDocuments(nextAppointment: AppointmentDetails | null) {
    if (!nextAppointment?.episode_id) {
      setDocuments([]);
      return;
    }

    const rows = await apiRequest<MedicalDocument[]>(
      `/documents/episodes/${nextAppointment.episode_id}`,
      { token },
    );

    const filtered = (rows ?? []).filter(
      (doc) => String(doc.appointment_id ?? "") === String(nextAppointment.id),
    );

    setDocuments(filtered);
  }

  async function loadData() {
    if (!appointmentId) return;

    try {
      setLoading(true);
      setError("");

      const [appointmentData, taskData] = await Promise.all([
        apiRequest<AppointmentDetails>(`/appointments/${appointmentId}`, {
          token,
        }),
        apiRequest<TaskRow[]>(`/appointments/${appointmentId}/tasks`, {
          token,
        }),
      ]);

      setAppointment(appointmentData);
      setTasks(taskData ?? []);
      setNoteText(appointmentData.notes || "");
      await loadDocuments(appointmentData);
    } catch (err) {
      const friendly = normalizeFriendlyError(err);
      setError(friendly.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  async function handleAdvanceStatus() {
    if (!appointmentId || !appointment) return;

    try {
      setStatusSaving(true);

      await apiRequest(`/appointments/${appointmentId}`, {
        method: "PUT",
        token,
        body: {
          status: nextAppointmentStatus(appointment.status),
        },
      });

      await loadData();
    } catch (err) {
      const friendly = normalizeFriendlyError(err);
      setError(friendly.message);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleSaveNotes() {
    if (!appointmentId) return;

    try {
      setNoteSaving(true);

      await apiRequest(`/appointments/${appointmentId}`, {
        method: "PUT",
        token,
        body: {
          notes: noteText,
        },
      });

      await loadData();
    } catch (err) {
      const friendly = normalizeFriendlyError(err);
      setError(friendly.message);
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleUploadDocument() {
    if (!appointmentId || !appointment?.episode_id || !selectedFile) return;

    try {
      setUploadingDocument(true);
      setError("");

      await uploadAppointmentDocument({
        appointmentId,
        episodeId: appointment.episode_id,
        token,
        file: selectedFile,
      });

      setSelectedFile(null);
      await loadData();
    } catch (err) {
      const friendly = normalizeFriendlyError(err);
      setError(friendly.message);
    } finally {
      setUploadingDocument(false);
    }
  }

  const friendlyError = error ? normalizeFriendlyError(error) : null;

  return (
    <div className="mc-page-shell">
      <section className="mc-page-head">
        <div>
          <div style={{ marginBottom: 12 }}>
            <Link
              href="/appointments"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--mc-primary)",
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={16} />
              Înapoi la programări
            </Link>
          </div>

          <h2>{appointment?.notes || `Programare #${appointmentId}`}</h2>
          <p>Status, note, taskuri, documente PDF și acces rapid la episod.</p>
        </div>

        <div className="mc-page-badge">
          {appointment?.status || "programare"}
        </div>
      </section>

      {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}

      {!loading && friendlyError ? (
        <AppFeedback
          title={friendlyError.title}
          message={friendlyError.message}
          variant={friendlyError.type}
        />
      ) : null}

      {!loading && !error && appointment ? (
        <>
          <section className="mc-stats-grid">
            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Status</p>
                  <p className="mc-stat-value" style={{ fontSize: 22 }}>
                    {appointment.status || "necunoscut"}
                  </p>
                </div>
                <div className="mc-icon-badge">
                  <CalendarDays size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Taskuri</p>
                  <p className="mc-stat-value">{tasks.length}</p>
                </div>
                <div className="mc-icon-badge">
                  <ClipboardList size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Documente</p>
                  <p className="mc-stat-value">{documents.length}</p>
                </div>
                <div className="mc-icon-badge">
                  <Paperclip size={20} />
                </div>
              </div>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Episod</p>
                  <p className="mc-stat-value">
                    {appointment.episode_id ?? "—"}
                  </p>
                </div>
                <div className="mc-icon-badge">
                  <FileText size={20} />
                </div>
              </div>
            </Card>
          </section>

          <section className="mc-dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Detalii programare</CardTitle>
                <CardDescription>
                  Informațiile principale ale vizitei selectate.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Pacient</strong>
                      <span>
                        {appointment.patient_name ||
                          `Pacient #${appointment.patient_id ?? "—"}`}
                      </span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Provider</strong>
                      <span>{appointment.provider_name || "Nespecificat"}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Doctor</strong>
                      <span>{appointment.doctor_name || "Nespecificat"}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Început</strong>
                      <span>{formatDateTime(appointment.start_time)}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Final</strong>
                      <span>{formatDateTime(appointment.end_time)}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Status</strong>
                      <span>{appointment.status || "necunoscut"}</span>
                    </div>
                    <span className={getStatusClass(appointment.status)}>
                      {appointment.status || "necunoscut"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Button onClick={handleAdvanceStatus} disabled={statusSaving}>
                    {statusSaving ? "Se actualizează..." : "Schimbă status"}
                  </Button>

                  {appointment.episode_id ? (
                    <Link href={`/episodes/${appointment.episode_id}`}>
                      <Button variant="secondary">Deschide episodul</Button>
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Note programare</CardTitle>
                <CardDescription>
                  Editează observațiile asociate acestei vizite.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <label className="mc-label" htmlFor="appointment-notes">
                  Notițe
                </label>

                <textarea
                  id="appointment-notes"
                  className="mc-input"
                  style={{ minHeight: 150, paddingTop: 12, paddingBottom: 12 }}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Adaugă observații pentru această programare..."
                />

                <div style={{ marginTop: 14 }}>
                  <Button onClick={handleSaveNotes} disabled={noteSaving}>
                    {noteSaving ? "Se salvează..." : "Salvează notițele"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Documente PDF</CardTitle>
              <CardDescription>
                Documente atașate acestei programări. Fișierele rămân PDF-uri,
                fără interpretare medicală automată.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!appointment.episode_id ? (
                <p className="mc-empty-note">
                  Această programare nu are episod asociat, deci nu poate avea
                  documente atașate.
                </p>
              ) : (
                <>
                  <div className="mc-upload-zone" style={{ marginBottom: 18 }}>
                    <label className="mc-label" htmlFor="appointment-document">
                      Încarcă PDF
                    </label>

                    <input
                      id="appointment-document"
                      className="mc-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(event) =>
                        setSelectedFile(event.target.files?.[0] || null)
                      }
                    />

                    <div className="mc-muted-block">
                      <strong>Fișier selectat:</strong>{" "}
                      {selectedFile?.name || "Niciun fișier"}
                    </div>

                    <Button
                      onClick={handleUploadDocument}
                      disabled={uploadingDocument || !selectedFile}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Upload size={16} />
                        {uploadingDocument
                          ? "Se încarcă..."
                          : "Încarcă documentul"}
                      </span>
                    </Button>
                  </div>

                  {documents.length === 0 ? (
                    <p className="mc-empty-note">
                      Nu există documente PDF pentru această programare.
                    </p>
                  ) : (
                    <div className="mc-list">
                      {documents.map((doc) => (
                        <div key={doc.id} className="mc-list-item">
                          <strong>
                            {doc.file_name || `Document #${doc.id}`}
                          </strong>
                          <span>
                            Încărcat: {formatDateTime(doc.created_at)}
                          </span>
                          <span>
                            Programare #{doc.appointment_id ?? "—"} • Episod #
                            {doc.episode_id}
                          </span>

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
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
