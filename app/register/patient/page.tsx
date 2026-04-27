// Path: medicalend-web/app/register/patient/page.tsx

"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RegisterPatientPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string | null;
  phone: string | null;
  address_line: string;
  city: string;
  county: string;
  postal_code: string | null;
  country: string;
};

function cleanText(v: string) {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

function cleanPostal(v: string) {
  return (v ?? "").replace(/\s+/g, "").trim();
}

function extractApiError(e: any): string {
  const detail = e?.response?.data?.detail;

  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const loc = Array.isArray(first?.loc) ? first.loc.join(".") : "field";
    const msg = String(first?.msg ?? "Validation error");
    return `${loc}: ${msg}`;
  }

  if (typeof detail === "string") return detail;

  return String(e?.message || "Înregistrarea a eșuat");
}

export default function RegisterPatientPage() {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");

  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [postalCode, setPostalCode] = useState("");

  async function onSubmit() {
    if (busy) return;

    const payload: RegisterPatientPayload = {
      email: cleanText(email),
      password,
      first_name: cleanText(firstName),
      last_name: cleanText(lastName),
      birth_date: cleanText(birthDate),
      gender: cleanText(gender) || null,
      phone: cleanText(phone) || null,
      address_line: cleanText(addressLine),
      city: cleanText(city),
      county: cleanText(county),
      postal_code: cleanPostal(postalCode) || null,
      country: "RO",
    };

    if (
      payload.email.length < 5 ||
      payload.password.length < 8 ||
      payload.first_name.length < 2 ||
      payload.last_name.length < 2 ||
      payload.birth_date.length < 10 ||
      payload.address_line.length < 3 ||
      payload.city.length < 2 ||
      payload.county.length < 2
    ) {
      setError("Completează toate câmpurile obligatorii.");
      return;
    }

    try {
      setBusy(true);
      setError("");

      await apiRequest("/auth/register-patient", {
        method: "POST",
        body: payload,
      });

      router.replace(`/check-email?email=${encodeURIComponent(payload.email)}`);
    } catch (e: any) {
      setError(extractApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mc-auth-shell">
      <Card className="mc-auth-card mc-auth-card-wide">
        <CardHeader>
          <CardTitle>Înregistrare pacient</CardTitle>
          <CardDescription>
            Creează contul de pacient pentru a accesa programările și episoadele
            tale.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mc-auth-form-grid">
            <Input
              id="patient-email"
              label="E-mail *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplu.ro"
              disabled={busy}
            />

            <Input
              id="patient-password"
              label="Parolă *"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractere"
              disabled={busy}
            />

            <Input
              id="patient-first-name"
              label="Prenume *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prenume"
              disabled={busy}
            />

            <Input
              id="patient-last-name"
              label="Nume *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nume"
              disabled={busy}
            />

            <Input
              id="patient-birth-date"
              label="Data nașterii *"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={busy}
            />

            <Input
              id="patient-gender"
              label="Gen"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="Ex: feminin / masculin"
              disabled={busy}
            />

            <Input
              id="patient-phone"
              label="Telefon"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+40..."
              disabled={busy}
            />

            <Input
              id="patient-postal-code"
              label="Cod poștal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="400000"
              disabled={busy}
            />

            <div className="mc-grid-span-2">
              <Input
                id="patient-address"
                label="Adresă *"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Str. Exemplu 12"
                disabled={busy}
              />
            </div>

            <Input
              id="patient-city"
              label="Oraș *"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Cluj-Napoca"
              disabled={busy}
            />

            <Input
              id="patient-county"
              label="Județ *"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="Cluj"
              disabled={busy}
            />
          </div>

          {error ? <p className="mc-error-banner">{error}</p> : null}

          <div className="mc-auth-actions">
            <Button onClick={onSubmit} disabled={busy}>
              {busy ? "Se înregistrează..." : "Creează contul"}
            </Button>

            <Link href="/register">
              <Button variant="secondary">Înapoi</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
