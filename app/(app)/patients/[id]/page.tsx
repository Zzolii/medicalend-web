// Path: medicalend-web/app/(app)/patients/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  CalendarDays,
  FileText,
  Activity,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAppUser } from "@/components/user-context";
import { Button } from "@/components/ui/button";
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

function formatDate(value?: string | null) {
  if (!value) return "Nespecificat";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("ro-RO");
}

export default function PatientDetailsPage() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id;
  const { role } = useAppUser();

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isPatientUser = role === "patient";

  useEffect(() => {
    async function load() {
      if (!patientId) return;

      try {
        setLoading(true);
        setError("");

        const token = getToken();
        const data = await apiRequest<PatientDetails>(
          `/patients/${patientId}`,
          {
            token,
          },
        );

        setPatient(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Nu am putut încărca profilul pacientului.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [patientId]);

  const fullName = useMemo(() => {
    return [patient?.first_name, patient?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }, [patient?.first_name, patient?.last_name]);

  const addressParts = useMemo(() => {
    return [
      patient?.address_line,
      patient?.city,
      patient?.county,
      patient?.postal_code,
      patient?.country,
    ].filter(Boolean);
  }, [
    patient?.address_line,
    patient?.city,
    patient?.county,
    patient?.postal_code,
    patient?.country,
  ]);

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
              {!isPatientUser ? (
                <div style={{ marginBottom: 14 }}>
                  <Link
                    href="/patients"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--mc-primary)",
                      fontWeight: 700,
                    }}
                  >
                    <ArrowLeft size={16} />
                    Înapoi la pacienți
                  </Link>
                </div>
              ) : null}

              <div
                className="mc-page-badge"
                style={{ marginBottom: 14, width: "fit-content" }}
              >
                <User size={16} style={{ marginRight: 8 }} />
                Profil pacient
              </div>

              <h2 style={{ margin: 0, fontSize: 32, lineHeight: 1.08 }}>
                {fullName || `Pacient #${patientId}`}
              </h2>

              <p
                style={{
                  margin: "14px 0 0",
                  color: "var(--mc-muted)",
                  lineHeight: 1.7,
                  maxWidth: 720,
                }}
              >
                Profil clinic și administrativ al pacientului, încărcat din
                endpoint-ul real <strong>/patients/{patientId}</strong>.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 18,
                  flexWrap: "wrap",
                }}
              >
                <Link href={`/patients/${patientId}/journey`}>
                  <Button>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Activity size={16} />
                      Deschide Journey
                    </span>
                  </Button>
                </Link>

                {!isPatientUser ? (
                  <Link href="/patients">
                    <Button variant="secondary">Înapoi la listă</Button>
                  </Link>
                ) : null}

                <Link href="/appointments">
                  <Button variant="ghost">Vezi programările</Button>
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
                <strong>FHIR ID</strong>
                <span>{patient?.fhir_id || "—"}</span>
              </div>

              <div className="mc-list-item" style={{ background: "white" }}>
                <strong>Data nașterii</strong>
                <span>{formatDate(patient?.birth_date)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? <p className="mc-empty-note">Se încarcă...</p> : null}
      {error ? <p className="mc-error-banner">{error}</p> : null}

      {!loading && !error && patient ? (
        <>
          <section className="mc-stats-grid">
            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">ID pacient</p>
                  <p className="mc-stat-value">{patient.id}</p>
                </div>
                <div className="mc-icon-badge">
                  <User size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Identificatorul intern principal al pacientului.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">User ID</p>
                  <p className="mc-stat-value">{patient.user_id ?? "—"}</p>
                </div>
                <div className="mc-icon-badge">
                  <Shield size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Legătura tehnică dintre cont și profilul de pacient.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">Data nașterii</p>
                  <p className="mc-stat-value" style={{ fontSize: 22 }}>
                    {formatDate(patient.birth_date)}
                  </p>
                </div>
                <div className="mc-icon-badge">
                  <CalendarDays size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Data nașterii în format local românesc.
              </p>
            </Card>

            <Card className="mc-stat-card">
              <div className="mc-stat-top">
                <div>
                  <p className="mc-stat-label">FHIR ID</p>
                  <p className="mc-stat-value" style={{ fontSize: 22 }}>
                    {patient.fhir_id || "—"}
                  </p>
                </div>
                <div className="mc-icon-badge">
                  <FileText size={20} />
                </div>
              </div>
              <p className="mc-stat-note">
                Identificator tehnic pentru integrare și interoperabilitate.
              </p>
            </Card>
          </section>

          <section className="mc-dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Date principale</CardTitle>
                <CardDescription>
                  Informațiile de bază ale pacientului.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Nume complet</strong>
                      <span>{fullName || "Nespecificat"}</span>
                    </div>
                    <User size={16} color="var(--mc-muted)" />
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Email</strong>
                      <span>{patient.email || "Nedisponibil"}</span>
                    </div>
                    <Mail size={16} color="var(--mc-muted)" />
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Telefon</strong>
                      <span>{patient.phone || "Nedisponibil"}</span>
                    </div>
                    <Phone size={16} color="var(--mc-muted)" />
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Data nașterii</strong>
                      <span>{formatDate(patient.birth_date)}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Gen</strong>
                      <span>{patient.gender || "Nespecificat"}</span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Adresă</strong>
                      <span>
                        {addressParts.length > 0
                          ? addressParts.join(", ")
                          : "Nespecificată"}
                      </span>
                    </div>
                    <MapPin size={16} color="var(--mc-muted)" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Focus rapid</CardTitle>
                <CardDescription>
                  Elemente tehnice și administrative utile imediat.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mc-status-row">
                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Identificare</strong>
                      <span>
                        Pacient #{patient.id}
                        {patient.user_id ? ` • user #${patient.user_id}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Contact prioritar</strong>
                      <span>
                        {patient.phone ||
                          patient.email ||
                          "Nu există date de contact disponibile"}
                      </span>
                    </div>
                  </div>

                  <div className="mc-status-item">
                    <div className="mc-status-text">
                      <strong>Recomandare</strong>
                      <span>
                        Folosește Journey pentru a vedea cronologic
                        investigațiile, rezultatele și contextul medical al
                        pacientului.
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Date tehnice</CardTitle>
              <CardDescription>
                Identificatori și câmpuri utile pentru integrare și lucru
                operațional.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="mc-status-row">
                <div className="mc-status-item">
                  <div className="mc-status-text">
                    <strong>ID pacient</strong>
                    <span>{patient.id}</span>
                  </div>
                </div>

                <div className="mc-status-item">
                  <div className="mc-status-text">
                    <strong>User ID</strong>
                    <span>{patient.user_id ?? "—"}</span>
                  </div>
                </div>

                <div className="mc-status-item">
                  <div className="mc-status-text">
                    <strong>FHIR ID</strong>
                    <span>{patient.fhir_id || "—"}</span>
                  </div>
                  <Shield size={16} color="var(--mc-muted)" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
