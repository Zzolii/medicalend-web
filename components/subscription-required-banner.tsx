// Path: medicalend-web/components/subscription-required-banner.tsx
"use client";

import { CreditCard, ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SubscriptionRequiredBannerProps = {
  title?: string;
  message?: string;
};

export function SubscriptionRequiredBanner({
  title = "Abonamentul clinicii nu este activ",
  message = "Pentru a continua această acțiune este necesar un abonament activ sau trial valid. Te rugăm să contactezi administratorul platformei pentru reactivare sau upgrade.",
}: SubscriptionRequiredBannerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <ShieldAlert size={18} />
            {title}
          </span>
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mc-info-banner">
          <CreditCard size={16} />
          <span>
            Accesul de tip write poate fi limitat atunci când subscription-ul
            este expirat, anulat sau inexistent.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
