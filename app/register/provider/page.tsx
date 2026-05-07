// Path: medicalend-web/app/register/provider/page.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

type ProviderTypeValue = "clinic" | "home_care";

type RegisterProviderPayload = {
  email: string;
  password: string;
  name: string;
  provider_type: ProviderTypeValue;
  website: string | null;
  image_url: string | null;
  public_description: string | null;
  specialty: string | null;
  services_offered: string | null;
  cui: string;
  trade_register_number: string | null;
  contact_person_name: string;
  contact_email: string;
  contact_phone: string;
  phone: string | null;
  address_line: string;
  city: string;
  county: string;
  postal_code: string | null;
  country: string;
  coverage_area: string | null;
  sanitary_authorization_number: string;
  sanitary_authorization_expires_at: string | null;
  healthcare_compliance_confirmed: boolean;
  provider_agreement_accepted: boolean;
};

function cleanText(v: string) {
  return (v ?? "").replace(/\s+/g, " ").trim();
}

function cleanPostal(v: string) {
  return (v ?? "").replace(/\s+/g, "").trim();
}

function normalizeSpecialties(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const cleaned = cleanText(raw);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(cleaned);
  }

  return out;
}

function specialtiesToBackendString(values: string[]) {
  return normalizeSpecialties(values).join(", ");
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

export default function RegisterProviderPage() {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [providerType, setProviderType] = useState<ProviderTypeValue>("clinic");

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [publicDescription, setPublicDescription] = useState("");

  const [specialties, setSpecialties] = useState<string[]>([""]);
  const [servicesOffered, setServicesOffered] = useState("");

  const [cui, setCui] = useState("");
  const [tradeRegisterNumber, setTradeRegisterNumber] = useState("");

  const [contactPersonName, setContactPersonName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [phone, setPhone] = useState("");

  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [coverageArea, setCoverageArea] = useState("");

  const [sanitaryAuthorizationNumber, setSanitaryAuthorizationNumber] =
    useState("");
  const [sanitaryAuthorizationExpiresAt, setSanitaryAuthorizationExpiresAt] =
    useState("");

  const [healthcareComplianceConfirmed, setHealthcareComplianceConfirmed] =
    useState(false);
  const [providerAgreementAccepted, setProviderAgreementAccepted] =
    useState(false);

  const canSubmit = useMemo(() => {
    return (
      cleanText(email).length >= 5 &&
      password.length >= 8 &&
      cleanText(name).length >= 2 &&
      cleanText(cui).length >= 2 &&
      cleanText(contactPersonName).length >= 2 &&
      cleanText(contactEmail).length >= 5 &&
      cleanText(contactPhone).length >= 3 &&
      cleanText(addressLine).length >= 3 &&
      cleanText(city).length >= 2 &&
      cleanText(county).length >= 2 &&
      cleanText(sanitaryAuthorizationNumber).length >= 2 &&
      healthcareComplianceConfirmed &&
      providerAgreementAccepted
    );
  }, [
    email,
    password,
    name,
    cui,
    contactPersonName,
    contactEmail,
    contactPhone,
    addressLine,
    city,
    county,
    sanitaryAuthorizationNumber,
    healthcareComplianceConfirmed,
    providerAgreementAccepted,
  ]);

  function updateSpecialtyAt(index: number, value: string) {
    setSpecialties((prev) =>
      prev.map((item, i) => (i === index ? value : item)),
    );
  }

  function addSpecialtyField() {
    setSpecialties((prev) => [...prev, ""]);
  }

  function removeSpecialtyField(index: number) {
    setSpecialties((prev) => {
      if (prev.length === 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  }

  async function onSubmit() {
    if (busy) return;

    if (!canSubmit) {
      setError(
        "Completează toate câmpurile obligatorii și confirmă declarațiile cerute.",
      );
      return;
    }

    try {
      setBusy(true);
      setError("");

      const normalizedSpecialty = specialtiesToBackendString(specialties);

      const payload: RegisterProviderPayload = {
        email: cleanText(email),
        password,
        name: cleanText(name),
        provider_type: providerType,
        website: cleanText(website) || null,
        image_url: null,
        public_description: cleanText(publicDescription) || null,
        specialty: normalizedSpecialty ? normalizedSpecialty : null,
        services_offered: cleanText(servicesOffered) || null,
        cui: cleanText(cui),
        trade_register_number: cleanText(tradeRegisterNumber) || null,
        contact_person_name: cleanText(contactPersonName),
        contact_email: cleanText(contactEmail),
        contact_phone: cleanText(contactPhone),
        phone: cleanText(phone) || null,
        address_line: cleanText(addressLine),
        city: cleanText(city),
        county: cleanText(county),
        postal_code: cleanPostal(postalCode) || null,
        country: "RO",
        coverage_area: cleanText(coverageArea) || null,
        sanitary_authorization_number: cleanText(sanitaryAuthorizationNumber),
        sanitary_authorization_expires_at:
          cleanText(sanitaryAuthorizationExpiresAt) || null,
        healthcare_compliance_confirmed: healthcareComplianceConfirmed,
        provider_agreement_accepted: providerAgreementAccepted,
      };

      await apiRequest("/auth/register-provider", {
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
          <CardTitle>Înregistrare furnizor</CardTitle>
          <CardDescription>
            Creează contul clinicii sau al serviciului home care și trimite-l
            spre verificare.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mc-auth-form-grid">
            <Input
              id="provider-email"
              label="E-mail *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplu.ro"
              disabled={busy}
            />

            <Input
              id="provider-password"
              label="Parolă *"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractere"
              disabled={busy}
            />

            <div className="mc-grid-span-2">
              <label className="mc-label">Tip furnizor *</label>
              <div className="mc-chip-row" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={
                    providerType === "clinic"
                      ? "mc-chip mc-chip-active"
                      : "mc-chip"
                  }
                  onClick={() => setProviderType("clinic")}
                >
                  Clinică
                </button>
                <button
                  type="button"
                  className={
                    providerType === "home_care"
                      ? "mc-chip mc-chip-active"
                      : "mc-chip"
                  }
                  onClick={() => setProviderType("home_care")}
                >
                  Home Care
                </button>
              </div>
            </div>

            <div className="mc-grid-span-2">
              <Input
                id="provider-name"
                label="Nume clinică / furnizor *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Clinica Exemplu"
                disabled={busy}
              />
            </div>

            <Input
              id="provider-website"
              label="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://clinica-ta.ro"
              disabled={busy}
            />

            <Input
              id="provider-cui"
              label="CUI *"
              value={cui}
              onChange={(e) => setCui(e.target.value)}
              placeholder="RO12345678"
              disabled={busy}
            />

            <div className="mc-grid-span-2">
              <Input
                id="provider-public-description"
                label="Descriere publică"
                value={publicDescription}
                onChange={(e) => setPublicDescription(e.target.value)}
                placeholder="Scurtă descriere a clinicii sau serviciilor."
                disabled={busy}
              />
            </div>

            <div className="mc-grid-span-2">
              <label className="mc-label">Specialități</label>
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {specialties.map((item, index) => (
                  <div
                    key={`specialty-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 10,
                    }}
                  >
                    <Input
                      id={`specialty-${index}`}
                      label={
                        index === 0
                          ? "Specialitate"
                          : `Specialitate ${index + 1}`
                      }
                      value={item}
                      onChange={(e) => updateSpecialtyAt(index, e.target.value)}
                      placeholder={`Specialitate #${index + 1}`}
                      disabled={busy}
                    />
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => removeSpecialtyField(index)}
                      disabled={busy}
                      style={{ alignSelf: "end" }}
                    >
                      Elimină
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={addSpecialtyField}
                  disabled={busy}
                >
                  + Adaugă specialitate
                </Button>
              </div>
            </div>

            <div className="mc-grid-span-2">
              <Input
                id="provider-services"
                label="Servicii oferite"
                value={servicesOffered}
                onChange={(e) => setServicesOffered(e.target.value)}
                placeholder="Consultații, pansamente, recoltări..."
                disabled={busy}
              />
            </div>

            <Input
              id="provider-trade-register"
              label="Nr. registrul comerțului"
              value={tradeRegisterNumber}
              onChange={(e) => setTradeRegisterNumber(e.target.value)}
              placeholder="J12/1234/2024"
              disabled={busy}
            />

            <Input
              id="provider-main-phone"
              label="Telefon principal"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+40..."
              disabled={busy}
            />

            <Input
              id="provider-contact-person"
              label="Persoană de contact *"
              value={contactPersonName}
              onChange={(e) => setContactPersonName(e.target.value)}
              placeholder="Nume persoană de contact"
              disabled={busy}
            />

            <Input
              id="provider-contact-email"
              label="E-mail contact *"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@clinica.ro"
              disabled={busy}
            />

            <Input
              id="provider-contact-phone"
              label="Telefon contact *"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+40..."
              disabled={busy}
            />

            <div className="mc-grid-span-2">
              <Input
                id="provider-address"
                label="Adresă *"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Str. Exemplu 12"
                disabled={busy}
              />
            </div>

            <Input
              id="provider-city"
              label="Oraș *"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Cluj-Napoca"
              disabled={busy}
            />

            <Input
              id="provider-county"
              label="Județ *"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="Cluj"
              disabled={busy}
            />

            <Input
              id="provider-postal-code"
              label="Cod poștal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="400000"
              disabled={busy}
            />

            {providerType === "home_care" ? (
              <div className="mc-grid-span-2">
                <Input
                  id="provider-coverage-area"
                  label="Zonă de acoperire"
                  value={coverageArea}
                  onChange={(e) => setCoverageArea(e.target.value)}
                  placeholder="Ex.: Cluj-Napoca și împrejurimi"
                  disabled={busy}
                />
              </div>
            ) : null}

            <Input
              id="provider-sanitary-number"
              label="Nr. autorizație sanitară *"
              value={sanitaryAuthorizationNumber}
              onChange={(e) => setSanitaryAuthorizationNumber(e.target.value)}
              placeholder="Nr. autorizației"
              disabled={busy}
            />

            <Input
              id="provider-sanitary-expire"
              label="Expirare autorizație"
              type="date"
              value={sanitaryAuthorizationExpiresAt}
              onChange={(e) =>
                setSanitaryAuthorizationExpiresAt(e.target.value)
              }
              disabled={busy}
            />
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <label className="mc-checkbox-row">
              <input
                type="checkbox"
                checked={healthcareComplianceConfirmed}
                onChange={(e) =>
                  setHealthcareComplianceConfirmed(e.target.checked)
                }
                disabled={busy}
              />
              <span>
                Confirm că furnizorul respectă cerințele legale și de
                conformitate medicală.
              </span>
            </label>

            <label className="mc-checkbox-row">
              <input
                type="checkbox"
                checked={providerAgreementAccepted}
                onChange={(e) => setProviderAgreementAccepted(e.target.checked)}
                disabled={busy}
              />
              <span>Accept termenii și condițiile pentru furnizori.</span>
            </label>
          </div>

          {error ? <p className="mc-error-banner">{error}</p> : null}

          <div className="mc-auth-actions">
            <Button onClick={onSubmit} disabled={!canSubmit || busy}>
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
