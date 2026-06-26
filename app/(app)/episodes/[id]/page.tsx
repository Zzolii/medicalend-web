// Path: medicalend-web/app/(app)/episodes/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  GitBranch,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Send,
  Stethoscope,
  Upload,
  X,
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

type EpisodeDetails = {
  id: number;
  patient_id: number;
  owner_provider_id: number;
  title: string;
  status: string;
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

type TimelineNote = {
  id: number;
  text?: string;
  author_user_id?: number | null;
  created_at?: string;
};

type TimelineTask = {
  id: number;
  title?: string;
  due_at?: string | null;
  assigned_to_role?: string | null;
  status?: string;
  appointment_id?: number | null;
};

type TimelineReferral = {
  id: number;
  status?: string;
  reason?: string | null;
  to_provider_id?: number | null;
  from_provider_id?: number | null;
  created_at?: string | null;
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
  episode: EpisodeDetails;
  appointments: TimelineAppointment[];
  notes: TimelineNote[];
  tasks: TimelineTask[];
  referrals: TimelineReferral[];
  documents: TimelineDocument[];
};

type TimelineFeedItemBase = {
  id: string;
  rawId: number;
  sortAt: string | null | undefined;
  title: string;
  subtitle: string;
  status?: string;
  eventDateLabel: string;
  eventTimeLabel: string;
  isFuture: boolean;
  isCompleted: boolean;
};

type TimelineFeedItem =
  | (TimelineFeedItemBase & {
      kind: "appointment";
      href?: string;
    })
  | (TimelineFeedItemBase & {
      kind: "note";
    })
  | (TimelineFeedItemBase & {
      kind: "task";
    })
  | (TimelineFeedItemBase & {
      kind: "referral";
    })
  | (TimelineFeedItemBase & {
      kind: "document";
      documentId: number;
    });

type TimelineGroup = {
  key: string;
  label: string;
  items: TimelineFeedItem[];
};

function formatDateTime(value?: string | null) {
  if (!value) return "Nespecificat";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ro-RO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateOnly(value?: string | null) {
  if (!value) return "Fără dată";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeOnly(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateGroupKey(value?: string | null) {
  if (!value) return "unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function getStatusLabel(status?: string) {
  if (status === "open" || status === "active") return "Activ";
  if (status === "scheduled") return "Programată";
  if (status === "in_progress") return "În desfășurare";
  if (status === "completed" || status === "done") return "Finalizat";
  if (status === "closed") return "Închis";
  if (status === "archived") return "Arhivat";
  if (status === "canceled") return "Anulat";
  if (status === "pending") return "În așteptare";
  if (status === "rejected") return "Respins";
  if (status === "todo") return "De făcut";
  return status || "Nespecificat";
}

function getStatusClass(status?: string) {
  if (
    status === "open" ||
    status === "active" ||
    status === "scheduled" ||
    status === "completed" ||
    status === "done"
  ) {
    return "mc-pill mc-pill-success";
  }
  if (status === "pending" || status === "in_progress" || status === "todo") {
    return "mc-pill mc-pill-warning";
  }
  if (status === "canceled" || status === "rejected") {
    return "mc-pill mc-pill-danger";
  }
  return "mc-pill mc-pill-neutral";
}

function nextTaskStatus(current?: string) {
  if (current === "todo") return "in_progress";
  if (current === "in_progress") return "done";
  return "todo";
}

function sortDescByDate<T extends { sortAt?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = a.sortAt ? new Date(a.sortAt).getTime() : 0;
    const bTime = b.sortAt ? new Date(b.sortAt).getTime() : 0;
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

function isFutureDate(value?: string | null) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() > Date.now();
}

function isCompletedStatus(status?: string) {
  return status === "completed" || status === "done" || status === "closed";
}

function eventIcon(kind: TimelineFeedItem["kind"]) {
  if (kind === "appointment") return <CalendarDays size={18} />;
  if (kind === "document") return <FileText size={18} />;
  if (kind === "note") return <MessageSquare size={18} />;
  if (kind === "task") return <ClipboardList size={18} />;
  return <Send size={18} />;
}

function eventLabel(kind: TimelineFeedItem["kind"]) {
  if (kind === "appointment") return "Programare";
  if (kind === "document") return "Document";
  if (kind === "note") return "Notă";
  if (kind === "task") return "Sarcină";
  return "Trimitere";
}

function eventAccent(kind: TimelineFeedItem["kind"]) {
  if (kind === "appointment") return "#2563EB";
  if (kind === "document") return "#7C3AED";
  if (kind === "note") return "#F97316";
  if (kind === "task") return "#16A34A";
  return "#0891B2";
}

function eventSoftBg(kind: TimelineFeedItem["kind"]) {
  if (kind === "appointment") return "rgba(37,99,235,0.10)";
  if (kind === "document") return "rgba(124,58,237,0.10)";
  if (kind === "note") return "rgba(249,115,22,0.10)";
  if (kind === "task") return "rgba(22,163,74,0.10)";
  return "rgba(8,145,178,0.10)";
}

function buildTimelineFeed(timeline: EpisodeTimeline): TimelineFeedItem[] {
  const appointments: TimelineFeedItem[] = timeline.appointments.map((item) => {
    const start = item.start_time;

    return {
      kind: "appointment",
      rawId: item.id,
      id: `appointment-${item.id}`,
      sortAt: start,
      title: appointmentTitle(item),
      subtitle: appointmentSubtitle(item),
      status: item.status,
      href: `/appointments/${item.id}`,
      eventDateLabel: formatDateOnly(start),
      eventTimeLabel: formatTimeOnly(start),
      isFuture: isFutureDate(start),
      isCompleted: isCompletedStatus(item.status),
    };
  });

  const notes: TimelineFeedItem[] = timeline.notes.map((item) => ({
    kind: "note",
    rawId: item.id,
    id: `note-${item.id}`,
    sortAt: item.created_at,
    title: "Notă de coordonare",
    subtitle: item.text || "Fără conținut",
    status: undefined,
    eventDateLabel: formatDateOnly(item.created_at),
    eventTimeLabel: formatTimeOnly(item.created_at),
    isFuture: false,
    isCompleted: true,
  }));

  const tasks: TimelineFeedItem[] = timeline.tasks.map((item) => ({
    kind: "task",
    rawId: item.id,
    id: `task-${item.id}`,
    sortAt: item.due_at,
    title: item.title || `Sarcină #${item.id}`,
    subtitle: item.assigned_to_role
      ? `Rol: ${item.assigned_to_role}`
      : "Fără rol atribuit",
    status: item.status,
    eventDateLabel: formatDateOnly(item.due_at),
    eventTimeLabel: formatTimeOnly(item.due_at),
    isFuture: isFutureDate(item.due_at),
    isCompleted: isCompletedStatus(item.status),
  }));

  const documents: TimelineFeedItem[] = timeline.documents.map((item) => ({
    kind: "document",
    rawId: item.id,
    id: `document-${item.id}`,
    sortAt: item.created_at,
    title: item.title || item.file_name || `Document #${item.id}`,
    subtitle: item.appointment_id
      ? `PDF atașat programării #${item.appointment_id}`
      : "PDF atașat episodului",
    status: undefined,
    documentId: item.id,
    eventDateLabel: formatDateOnly(item.created_at),
    eventTimeLabel: formatTimeOnly(item.created_at),
    isFuture: false,
    isCompleted: true,
  }));

  const referrals: TimelineFeedItem[] = timeline.referrals.map((item) => ({
    kind: "referral",
    rawId: item.id,
    id: `referral-${item.id}`,
    sortAt: item.created_at,
    title: "Trimitere către alt furnizor",
    subtitle: item.reason || "Element de coordonare între furnizori",
    status: item.status,
    eventDateLabel: formatDateOnly(item.created_at),
    eventTimeLabel: formatTimeOnly(item.created_at),
    isFuture: false,
    isCompleted: isCompletedStatus(item.status),
  }));

  return sortDescByDate<TimelineFeedItem>([
    ...appointments,
    ...documents,
    ...notes,
    ...tasks,
    ...referrals,
  ]);
}

function groupTimelineByDate(items: TimelineFeedItem[]): TimelineGroup[] {
  const map = new Map<string, TimelineGroup>();

  for (const item of items) {
    const key = getDateGroupKey(item.sortAt);
    const label = item.eventDateLabel || "Fără dată";

    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        items: [],
      });
    }

    map.get(key)?.items.push(item);
  }

  return Array.from(map.values());
}

function getLatestEvent(timelineFeed: TimelineFeedItem[]) {
  return timelineFeed[0] ?? null;
}

function getJourneyProgress(timelineFeed: TimelineFeedItem[]) {
  const total = timelineFeed.length;

  if (total === 0) {
    return {
      total,
      completed: 0,
      percent: 0,
      upcoming: 0,
    };
  }

  const completed = timelineFeed.filter((item) => item.isCompleted).length;
  const upcoming = timelineFeed.filter((item) => item.isFuture).length;
  const percent = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percent,
    upcoming,
  };
}

async function uploadEpisodeDocument(
  episodeId: string,
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
      if (typeof data?.detail === "string") {
        message = data.detail;
      }
    } catch {}

    throw new Error(message);
  }

  return response.json().catch(() => null);
}

export default function EpisodeDetailsPage() {
  const params = useParams<{ id: string }>();
  const episodeId = params?.id;

  const [timeline, setTimeline] = useState<EpisodeTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskRole, setTaskRole] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [episodeTitleDraft, setEpisodeTitleDraft] = useState("");
  const [editingEpisodeTitle, setEditingEpisodeTitle] = useState(false);
  const [savingEpisodeTitle, setSavingEpisodeTitle] = useState(false);

  const [submittingNote, setSubmittingNote] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittingDocument, setSubmittingDocument] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  const token = useMemo(() => getToken(), []);

  async function loadEpisode() {
    if (!episodeId) return;

    try {
      setLoading(true);
      setError("");

      const [episode, timelineData] = await Promise.all([
        apiRequest<EpisodeDetails>(`/care-episodes/${episodeId}`, { token }),
        apiRequest<EpisodeTimeline>(`/care-episodes/${episodeId}/timeline`, {
          token,
        }),
      ]);

      setTimeline({
        episode,
        appointments: timelineData.appointments ?? [],
        notes: timelineData.notes ?? [],
        tasks: timelineData.tasks ?? [],
        referrals: timelineData.referrals ?? [],
        documents: timelineData.documents ?? [],
      });

      setEpisodeTitleDraft(episode.title || "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu am putut încărca episodul.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEpisode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeId]);

  async function handleSaveEpisodeTitle() {
    if (!episodeId || !episodeTitleDraft.trim()) {
      setError("Titlul episodului nu poate fi gol.");
      return;
    }

    try {
      setSavingEpisodeTitle(true);
      setError("");

      await apiRequest(`/care-episodes/${episodeId}`, {
        method: "PUT",
        token,
        body: {
          title: episodeTitleDraft.trim(),
        },
      });

      setEditingEpisodeTitle(false);
      await loadEpisode();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nu am putut actualiza titlul episodului.",
      );
    } finally {
      setSavingEpisodeTitle(false);
    }
  }

  async function handleAddNote() {
    if (!episodeId || !noteText.trim()) return;

    try {
      setSubmittingNote(true);

      await apiRequest(`/care-episodes/${episodeId}/notes`, {
        method: "POST",
        token,
        body: {
          text: noteText.trim(),
        },
      });

      setNoteText("");
      await loadEpisode();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut adăuga nota.");
    } finally {
      setSubmittingNote(false);
    }
  }

  async function handleAddTask() {
    if (!episodeId || !taskTitle.trim()) return;

    try {
      setSubmittingTask(true);

      const body: Record<string, unknown> = {
        title: taskTitle.trim(),
      };

      if (taskRole.trim()) {
        body.assigned_to_role = taskRole.trim();
      }

      await apiRequest(`/care-episodes/${episodeId}/tasks`, {
        method: "POST",
        token,
        body,
      });

      setTaskTitle("");
      setTaskRole("");
      await loadEpisode();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu am putut adăuga sarcina.",
      );
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleAdvanceTask(taskId: number, currentStatus?: string) {
    try {
      setUpdatingTaskId(taskId);

      await apiRequest(`/care-episodes/tasks/${taskId}`, {
        method: "PUT",
        token,
        body: {
          status: nextTaskStatus(currentStatus),
        },
      });

      await loadEpisode();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu am putut actualiza sarcina.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleUploadDocument() {
    if (!episodeId || !documentFile) {
      setError("Selectează mai întâi un fișier PDF.");
      return;
    }

    try {
      setSubmittingDocument(true);
      setError("");

      await uploadEpisodeDocument(
        episodeId,
        token,
        documentFile,
        documentTitle,
      );

      setDocumentTitle("");
      setDocumentFile(null);
      await loadEpisode();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu am putut încărca documentul.",
      );
    } finally {
      setSubmittingDocument(false);
    }
  }

  const timelineFeed = useMemo(() => {
    if (!timeline) return [] as TimelineFeedItem[];
    return buildTimelineFeed(timeline);
  }, [timeline]);

  const timelineGroups = useMemo(
    () => groupTimelineByDate(timelineFeed),
    [timelineFeed],
  );

  const latestEvent = useMemo(
    () => getLatestEvent(timelineFeed),
    [timelineFeed],
  );

  const journeyProgress = useMemo(
    () => getJourneyProgress(timelineFeed),
    [timelineFeed],
  );

  return (
    <div className="mc-page-shell">
      <section className="mc-page-head">
        <div>
          <div style={{ marginBottom: 12 }}>
            <Link
              href="/episodes"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--mc-primary)",
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={16} />
              Înapoi la episoade
            </Link>
          </div>

          {editingEpisodeTitle ? (
            <div style={{ display: "grid", gap: 10, maxWidth: 640 }}>
              <Input
                id="episode-title"
                label="Titlu episod"
                value={episodeTitleDraft}
                onChange={(e) => setEpisodeTitleDraft(e.target.value)}
                placeholder="Ex: Colecistectomie, Control cardiologic"
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  onClick={handleSaveEpisodeTitle}
                  disabled={savingEpisodeTitle}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Save size={16} />
                    {savingEpisodeTitle ? "Se salvează..." : "Salvează titlul"}
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingEpisodeTitle(false);
                    setEpisodeTitleDraft(timeline?.episode.title || "");
                  }}
                  disabled={savingEpisodeTitle}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <X size={16} />
                    Anulează
                  </span>
                </Button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0 }}>
                {timeline?.episode.title || `Episod #${episodeId}`}
              </h2>

              {timeline ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEpisodeTitleDraft(timeline.episode.title || "");
                    setEditingEpisodeTitle(true);
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Pencil size={16} />
                    Editează titlul
                  </span>
                </Button>
              ) : null}
            </div>
          )}

          <p>
            Journey 2.0 afișează obiectiv istoricul episodului: programări,
            documente, note, sarcini și trimiteri. MediCalend nu interpretează
            automat documentele și nu prezice pașii medicali următori.
          </p>
        </div>

        <div className="mc-page-badge">
          {getStatusLabel(timeline?.episode.status)}
        </div>
      </section>

      {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}
      {error ? <p className="mc-error-banner">{error}</p> : null}

      {!loading && !error && timeline ? (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(280px, 380px) minmax(0, 1fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <Card
                className="mc-stat-card"
                style={{
                  overflow: "hidden",
                  background:
                    "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(255,255,255,0.98) 64%)",
                }}
              >
                <CardContent style={{ padding: 20 }}>
                  <div
                    className="mc-page-badge"
                    style={{ width: "fit-content" }}
                  >
                    <GitBranch size={16} style={{ marginRight: 8 }} />
                    Patient Journey
                  </div>

                  <h3 style={{ margin: "16px 0 4px", fontSize: 24 }}>
                    {timeline.episode.title}
                  </h3>

                  <span className={getStatusClass(timeline.episode.status)}>
                    {getStatusLabel(timeline.episode.status)}
                  </span>

                  <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                    <div
                      className="mc-list-item"
                      style={{ background: "#fff" }}
                    >
                      <strong>ID pacient</strong>
                      <span>{timeline.episode.patient_id}</span>
                    </div>

                    <div
                      className="mc-list-item"
                      style={{ background: "#fff" }}
                    >
                      <strong>Început episod</strong>
                      <span>{formatDateTime(timeline.episode.created_at)}</span>
                    </div>

                    <div
                      className="mc-list-item"
                      style={{ background: "#fff" }}
                    >
                      <strong>Ultimul eveniment</strong>
                      <span>
                        {latestEvent
                          ? `${eventLabel(latestEvent.kind)} • ${latestEvent.title}`
                          : "Nu există evenimente încă"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Progress Journey</CardTitle>
                  <CardDescription>
                    Progres obiectiv calculat doar din evenimente existente.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 28 }}>
                        {journeyProgress.percent}%
                      </strong>
                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "var(--mc-muted)",
                          fontSize: 13,
                        }}
                      >
                        {journeyProgress.completed} finalizate din{" "}
                        {journeyProgress.total} evenimente
                      </p>
                    </div>

                    <div className="mc-icon-badge">
                      <Stethoscope size={20} />
                    </div>
                  </div>

                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(148,163,184,0.22)",
                      overflow: "hidden",
                      marginTop: 16,
                    }}
                  >
                    <div
                      style={{
                        width: `${journeyProgress.percent}%`,
                        height: "100%",
                        borderRadius: 999,
                        background:
                          "linear-gradient(90deg, #2563EB 0%, #22C55E 100%)",
                      }}
                    />
                  </div>

                  <div
                    className="mc-status-row"
                    style={{ marginTop: 16, gridTemplateColumns: "1fr" }}
                  >
                    <div className="mc-status-item">
                      <div className="mc-status-text">
                        <strong>Evenimente viitoare înregistrate</strong>
                        <span>{journeyProgress.upcoming}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistici episod</CardTitle>
                  <CardDescription>
                    Date rapide pentru coordonare.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mc-status-row">
                    <div className="mc-status-item">
                      <div className="mc-status-text">
                        <strong>Programări</strong>
                        <span>{timeline.appointments.length}</span>
                      </div>
                      <CalendarDays size={18} />
                    </div>

                    <div className="mc-status-item">
                      <div className="mc-status-text">
                        <strong>PDF-uri</strong>
                        <span>{timeline.documents.length}</span>
                      </div>
                      <Paperclip size={18} />
                    </div>

                    <div className="mc-status-item">
                      <div className="mc-status-text">
                        <strong>Note</strong>
                        <span>{timeline.notes.length}</span>
                      </div>
                      <MessageSquare size={18} />
                    </div>

                    <div className="mc-status-item">
                      <div className="mc-status-text">
                        <strong>Sarcini</strong>
                        <span>{timeline.tasks.length}</span>
                      </div>
                      <ClipboardList size={18} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Timeline vizual</CardTitle>
                <CardDescription>
                  Evenimente grupate pe date, cu iconițe, status și acțiuni
                  rapide.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {timelineGroups.length === 0 ? (
                  <p className="mc-empty-note">
                    Nu există încă elemente în timeline.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 22 }}>
                    {timelineGroups.map((group) => (
                      <div key={group.key}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              background: "var(--mc-primary)",
                              boxShadow: "0 0 0 6px rgba(37,99,235,0.10)",
                            }}
                          />
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 18,
                              color: "var(--mc-text)",
                            }}
                          >
                            {group.label}
                          </h3>
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
                            display: "grid",
                            gap: 12,
                            paddingLeft: 5,
                            borderLeft: "2px solid var(--mc-border)",
                          }}
                        >
                          {group.items.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                position: "relative",
                                marginLeft: 16,
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  left: -24,
                                  top: 22,
                                  width: 14,
                                  height: 14,
                                  borderRadius: 999,
                                  background: eventAccent(item.kind),
                                  border: "3px solid white",
                                  boxShadow: `0 0 0 4px ${eventSoftBg(
                                    item.kind,
                                  )}`,
                                }}
                              />

                              <div
                                className="mc-list-item"
                                style={{
                                  background:
                                    item.isFuture && item.kind === "appointment"
                                      ? "linear-gradient(135deg, rgba(37,99,235,0.08), #fff)"
                                      : "#fff",
                                  borderLeft: `4px solid ${eventAccent(
                                    item.kind,
                                  )}`,
                                  transition:
                                    "transform 160ms ease, box-shadow 160ms ease",
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
                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "6px 10px",
                                        borderRadius: 999,
                                        background: eventSoftBg(item.kind),
                                        color: eventAccent(item.kind),
                                        fontWeight: 900,
                                        fontSize: 12,
                                        marginBottom: 10,
                                      }}
                                    >
                                      {eventIcon(item.kind)}
                                      {eventLabel(item.kind)}
                                    </div>

                                    <strong
                                      style={{
                                        display: "block",
                                        fontSize: 17,
                                      }}
                                    >
                                      {item.title}
                                    </strong>

                                    <span
                                      style={{
                                        display: "block",
                                        marginTop: 5,
                                        color: "var(--mc-muted)",
                                        lineHeight: 1.55,
                                      }}
                                    >
                                      {item.subtitle}
                                    </span>

                                    <span
                                      style={{
                                        display: "block",
                                        marginTop: 8,
                                        fontWeight: 800,
                                        color: "var(--mc-text)",
                                      }}
                                    >
                                      {item.eventTimeLabel ||
                                        "Oră nespecificată"}
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      alignItems: "flex-start",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {item.isFuture ? (
                                      <span className="mc-pill mc-pill-warning">
                                        Viitor
                                      </span>
                                    ) : null}

                                    {item.status ? (
                                      <span
                                        className={getStatusClass(item.status)}
                                      >
                                        {getStatusLabel(item.status)}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {item.kind === "appointment" && item.href ? (
                                  <div style={{ marginTop: 12 }}>
                                    <Link href={item.href}>
                                      <Button variant="secondary">
                                        Deschide programarea
                                      </Button>
                                    </Link>
                                  </div>
                                ) : null}

                                {item.kind === "document" ? (
                                  <div style={{ marginTop: 12 }}>
                                    <Link
                                      href={`/documents/${item.documentId}`}
                                    >
                                      <Button variant="secondary">
                                        Vezi documentul
                                      </Button>
                                    </Link>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="mc-dashboard-grid" style={{ marginTop: 18 }}>
            <Card>
              <CardHeader>
                <CardTitle>Detalii episod</CardTitle>
                <CardDescription>
                  Informații generale pentru coordonarea episodului.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Denumire episod</strong>
                      <span>{timeline.episode.title}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>ID episod</strong>
                      <span>{timeline.episode.id}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>ID pacient</strong>
                      <span>{timeline.episode.patient_id}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Status</strong>
                      <span>{getStatusLabel(timeline.episode.status)}</span>
                    </div>
                    <span className={getStatusClass(timeline.episode.status)}>
                      {getStatusLabel(timeline.episode.status)}
                    </span>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Creat la</strong>
                      <span>{formatDateTime(timeline.episode.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Încarcă document PDF</CardTitle>
                <CardDescription>
                  Atașează fișiere PDF direct la acest episod. Conținutul nu
                  este interpretat automat de platformă.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-upload-zone">
                  <Input
                    id="document-title"
                    label="Titlu document (opțional)"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Ex: rezultat analiză, bilet, recomandare"
                  />

                  <div>
                    <label className="mc-label" htmlFor="document-file">
                      Fișier PDF
                    </label>
                    <input
                      id="document-file"
                      type="file"
                      className="mc-input"
                      accept=".pdf"
                      onChange={(e) =>
                        setDocumentFile(e.target.files?.[0] || null)
                      }
                    />
                  </div>

                  <div className="mc-muted-block">
                    <div>
                      <strong>Fișier selectat:</strong>{" "}
                      {documentFile?.name || "Niciun fișier"}
                    </div>
                  </div>

                  <Button
                    onClick={handleUploadDocument}
                    disabled={submittingDocument || !documentFile}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Upload size={16} />
                      {submittingDocument
                        ? "Se încarcă..."
                        : "Încarcă documentul"}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mc-dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Programări</CardTitle>
                <CardDescription>
                  Programările legate de acest episod, cu scopul afișat din
                  notițele programării.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {timeline.appointments.length === 0 ? (
                  <p className="mc-empty-note">
                    Nu există programări pentru acest episod.
                  </p>
                ) : (
                  <div className="mc-list">
                    {timeline.appointments.map((item) => (
                      <div key={item.id} className="mc-list-item">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <strong>{appointmentTitle(item)}</strong>
                            <span>{appointmentSubtitle(item)}</span>
                            <span>{formatDateTime(item.start_time)}</span>
                          </div>

                          <span className={getStatusClass(item.status)}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <Link href={`/appointments/${item.id}`}>
                            <Button variant="secondary">
                              Deschide programarea
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documente PDF</CardTitle>
                <CardDescription>
                  Fișiere atașate episodului sau unei programări din episod.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {timeline.documents.length === 0 ? (
                  <p className="mc-empty-note">
                    Nu există documente pentru acest episod.
                  </p>
                ) : (
                  <div className="mc-list">
                    {sortDescByDate(
                      timeline.documents.map((item) => ({
                        ...item,
                        sortAt: item.created_at,
                      })),
                    ).map((item) => (
                      <div key={item.id} className="mc-list-item">
                        <strong>
                          {item.title ||
                            item.file_name ||
                            `Document #${item.id}`}
                        </strong>
                        <span>
                          {item.appointment_id
                            ? `Atașat programării #${item.appointment_id}`
                            : "Atașat direct episodului"}
                        </span>
                        <span>{formatDateTime(item.created_at)}</span>

                        <div style={{ marginTop: 8 }}>
                          <Link href={`/documents/${item.id}`}>
                            <Button variant="secondary">Vezi documentul</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="mc-dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Note de coordonare</CardTitle>
                <CardDescription>
                  Note scurte pentru organizarea episodului. Evită introducerea
                  de diagnostic structurat în acest câmp.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                  <label className="mc-label" htmlFor="new-note">
                    Notă nouă
                  </label>
                  <textarea
                    id="new-note"
                    className="mc-input"
                    style={{
                      minHeight: 110,
                      paddingTop: 12,
                      paddingBottom: 12,
                    }}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Scrie o notă de coordonare..."
                  />

                  <Button onClick={handleAddNote} disabled={submittingNote}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Plus size={16} />
                      {submittingNote ? "Se salvează..." : "Adaugă notă"}
                    </span>
                  </Button>
                </div>

                {timeline.notes.length === 0 ? (
                  <p className="mc-empty-note">
                    Nu există note pentru acest episod.
                  </p>
                ) : (
                  <div className="mc-list">
                    {timeline.notes.map((item) => (
                      <div key={item.id} className="mc-list-item">
                        <strong>Notă de coordonare</strong>
                        <span>{item.text || "Fără conținut"}</span>
                        <span>
                          autor_user_id: {item.author_user_id ?? "—"} •{" "}
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sarcini</CardTitle>
                <CardDescription>
                  Sarcini operaționale pentru urmărirea episodului.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
                  <Input
                    id="task-title"
                    label="Titlu sarcină"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ex: verificare documente"
                  />

                  <Input
                    id="task-role"
                    label="Rol atribuit (opțional)"
                    value={taskRole}
                    onChange={(e) => setTaskRole(e.target.value)}
                    placeholder="Ex: doctor / assistant / reception"
                  />

                  <Button onClick={handleAddTask} disabled={submittingTask}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Plus size={16} />
                      {submittingTask ? "Se adaugă..." : "Adaugă sarcină"}
                    </span>
                  </Button>
                </div>

                {timeline.tasks.length === 0 ? (
                  <p className="mc-empty-note">
                    Nu există sarcini pentru acest episod.
                  </p>
                ) : (
                  <div className="mc-list">
                    {timeline.tasks.map((item) => (
                      <div key={item.id} className="mc-list-item">
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
                              {item.title || `Sarcină #${item.id}`}
                            </strong>
                            <span>
                              rol: {item.assigned_to_role || "—"} • termen:{" "}
                              {formatDateTime(item.due_at)}
                            </span>
                          </div>

                          <span className={getStatusClass(item.status)}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              handleAdvanceTask(item.id, item.status)
                            }
                            disabled={updatingTaskId === item.id}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <CheckCircle2 size={16} />
                              {updatingTaskId === item.id
                                ? "Se actualizează..."
                                : "Avansează statusul"}
                            </span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {timeline.referrals.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Coordonare între furnizori</CardTitle>
                <CardDescription>
                  Elemente avansate de trimitere asociate episodului. Pentru MVP
                  acestea rămân secundare.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-list">
                  {timeline.referrals.map((item) => (
                    <div key={item.id} className="mc-list-item">
                      <strong>Trimitere #{item.id}</strong>
                      <span>
                        from_provider: {item.from_provider_id ?? "—"} •
                        to_provider: {item.to_provider_id ?? "—"}
                      </span>
                      <span className={getStatusClass(item.status)}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
