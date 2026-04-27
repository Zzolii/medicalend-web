// Path: medicalend-web/app/(app)/documents/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MedicalDocument = {
  id: number;
  episode_id?: number | null;
  appointment_id?: number | null;
  uploaded_by_user_id?: number | null;
  file_name?: string | null;
  stored_name?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  created_at?: string | null;
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

export default function DocumentViewerPage() {
  const params = useParams<{ id: string }>();
  const documentId = params?.id;
  const token = useMemo(() => getToken(), []);

  const [doc, setDoc] = useState<MedicalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!documentId) {
        if (mounted) {
          setError("ID-ul documentului lipsește.");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await apiRequest<MedicalDocument>(
          `/documents/${documentId}`,
          {
            token,
          },
        );

        if (!mounted) return;
        setDoc(data);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Nu am putut încărca documentul.",
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
  }, [documentId, token]);

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
              alignItems: "flex-start",
            }}
          >
            <div style={{ maxWidth: 780 }}>
              <div style={{ marginBottom: 14 }}>
                {doc?.episode_id ? (
                  <Link
                    href={`/episodes/${doc.episode_id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--mc-primary)",
                      fontWeight: 700,
                    }}
                  >
                    <ArrowLeft size={16} />
                    Înapoi la episod
                  </Link>
                ) : (
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
                )}
              </div>

              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <FileText size={16} style={{ marginRight: 8 }} />
                Document medical
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                {doc?.file_name || `Document #${documentId}`}
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 760,
                }}
              >
                Vizualizare document medical încărcat în sistem, cu acces
                controlat prin backend.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 18,
                  flexWrap: "wrap",
                }}
              >
                {doc?.file_url ? (
                  <a href={doc.file_url} target="_blank" rel="noreferrer">
                    <Button>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <ExternalLink size={16} />
                        Deschide în tab nou
                      </span>
                    </Button>
                  </a>
                ) : null}

                {doc?.episode_id ? (
                  <Link href={`/episodes/${doc.episode_id}`}>
                    <Button variant="secondary">Deschide episodul</Button>
                  </Link>
                ) : null}
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
                <strong>ID document</strong>
                <span>{doc?.id ?? documentId ?? "-"}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Episod</strong>
                <span>{doc?.episode_id ?? "—"}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Încărcat la</strong>
                <span>{formatDateTime(doc?.created_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="mc-empty-note">Se încarcă documentul...</p>
      ) : null}
      {error ? <p className="mc-error-banner">{error}</p> : null}

      {!loading && !error && doc ? (
        <>
          <section className="mc-stats-grid">
            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Tip fișier</p>
                  <p className="mc-stat-value" style={{ fontSize: 22 }}>
                    {doc.mime_type || "PDF"}
                  </p>
                </div>
                <div className="mc-icon-badge">
                  <FileText size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Tipul media raportat pentru documentul salvat.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Episod</p>
                  <p className="mc-stat-value">{doc.episode_id ?? "—"}</p>
                </div>
                <div className="mc-icon-badge">
                  <FileText size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Episodul clinic de care aparține documentul.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Programare</p>
                  <p className="mc-stat-value">{doc.appointment_id ?? "—"}</p>
                </div>
                <div className="mc-icon-badge">
                  <FileText size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Legătura cu o programare, dacă documentul a fost încărcat în
                acel context.
              </p>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Vizualizare document</CardTitle>
              <CardDescription>
                PDF-ul este afișat direct în pagină atunci când URL-ul
                fișierului este disponibil.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!doc.file_url ? (
                <p className="mc-empty-note">
                  URL-ul documentului nu este disponibil pentru previzualizare.
                </p>
              ) : (
                <div
                  style={{
                    width: "100%",
                    minHeight: "78vh",
                    border: "1px solid var(--mc-border)",
                    borderRadius: 18,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <iframe
                    src={doc.file_url}
                    title={doc.file_name || `Document ${doc.id}`}
                    style={{
                      width: "100%",
                      height: "78vh",
                      border: "none",
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
