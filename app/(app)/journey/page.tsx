// Path: medicalend-web/app/(app)/journey/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch, Users } from "lucide-react";
import { getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LAST_JOURNEY_PATIENT_KEY = "medicalend_last_journey_patient_id";

export default function JourneyLandingPage() {
  const router = useRouter();

  useEffect(() => {
    const sessionUser = getUser();
    const role = sessionUser?.role;

    if (role === "patient") {
      router.replace("/patients/me/journey");
      return;
    }

    const lastPatientId =
      typeof window !== "undefined"
        ? localStorage.getItem(LAST_JOURNEY_PATIENT_KEY)
        : null;

    if (lastPatientId && lastPatientId.trim()) {
      router.replace(`/patients/${lastPatientId}/journey`);
    }
  }, [router]);

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
          <div className="mc-page-badge" style={{ width: "fit-content" }}>
            <GitBranch size={16} style={{ marginRight: 8 }} />
            Journey
          </div>

          <h2 style={{ marginTop: 16, marginBottom: 0 }}>Journey pacient</h2>

          <p
            style={{
              marginTop: 14,
              color: "var(--mc-muted)",
              lineHeight: 1.7,
              maxWidth: 760,
            }}
          >
            Journey-ul este asociat unui pacient concret și organizează
            episoadele, programările și fișierele PDF atașate într-o ordine ușor
            de urmărit. Platforma nu interpretează automat conținutul
            documentelor.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <Link href="/patients">
              <Button>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Users size={16} />
                  Alege pacientul
                </span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ce este Journey</CardTitle>
          <CardDescription>
            O vedere cronologică pentru coordonarea îngrijirii.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mc-status-row">
            <div className="mc-status-item">
              <div className="mc-status-text">
                <strong>Scop</strong>
                <span>
                  Ajută pacientul și echipa medicală să urmărească episoadele,
                  programările și documentele atașate.
                </span>
              </div>
            </div>

            <div className="mc-status-item">
              <div className="mc-status-text">
                <strong>Conținut</strong>
                <span>
                  Episoade, programări, fișiere PDF, note operaționale și
                  sarcini de coordonare.
                </span>
              </div>
            </div>

            <div className="mc-status-item">
              <div className="mc-status-text">
                <strong>Important</strong>
                <span>
                  MediCalend păstrează documentele ca fișiere atașate și nu
                  oferă interpretare, diagnostic sau recomandări medicale.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
