// Path: medicalend-web/components/app-feedback.tsx
"use client";

import { AlertTriangle, Lock, ShieldAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AppFeedbackProps = {
  title: string;
  message: string;
  variant?: "error" | "permission" | "warning";
};

export function AppFeedback({
  title,
  message,
  variant = "error",
}: AppFeedbackProps) {
  const Icon =
    variant === "permission"
      ? Lock
      : variant === "warning"
        ? AlertTriangle
        : ShieldAlert;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Icon size={18} />
            {title}
          </span>
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mc-empty-note">
          Dacă rolul curent nu permite această acțiune, interfața rămâne
          accesibilă fără a afișa erori tehnice brute.
        </p>
      </CardContent>
    </Card>
  );
}
