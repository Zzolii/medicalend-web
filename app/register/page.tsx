// Path: medicalend-web/app/register/page.tsx

"use client";

import Link from "next/link";
import { BriefcaseMedical, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterChoicePage() {
  return (
    <div className="mc-auth-shell">
      <Card className="mc-auth-card">
        <CardHeader>
          <CardTitle>Înregistrare</CardTitle>
          <CardDescription>
            Alege tipul de cont pe care vrei să îl creezi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mc-choice-grid">
            <Link href="/register/patient" className="mc-choice-link">
              <div className="mc-choice-card">
                <div className="mc-choice-icon">
                  <UserRound size={22} />
                </div>
                <h3>Pacient</h3>
                <p>
                  Creează un cont pentru programări, episoade și urmărirea
                  îngrijirii.
                </p>
                <Button className="w-full">Înregistrare ca pacient</Button>
              </div>
            </Link>

            <Link href="/register/provider" className="mc-choice-link">
              <div className="mc-choice-card">
                <div className="mc-choice-icon">
                  <BriefcaseMedical size={22} />
                </div>
                <h3>Clinic/Medic</h3>
                <p>
                  Creează un cont pentru clinică, cabinet medical, medic
                  independent sau serviciu home care și trimite datele pentru
                  aprobare.
                </p>
                <Button variant="secondary" className="w-full">
                  Clinic/Medic
                </Button>
              </div>
            </Link>
          </div>

          <div style={{ marginTop: 16 }}>
            <Link href="/login" className="mc-link-button">
              Ai deja cont? Mergi la autentificare
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
