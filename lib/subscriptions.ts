// Path: medicalend-web/lib/subscriptions.ts
import { apiRequest } from "@/lib/api";

export type MyClinicSubscription = {
  id: number;
  clinic_id: number;
  clinic_name?: string | null;
  plan_id: number;
  plan_code?: string | null;
  plan_name?: string | null;
  price_eur?: number | null;
  duration_days?: number | null;
  status: "trialing" | "active" | "expired" | "canceled" | string;
  starts_at: string;
  ends_at: string;
  created_at?: string | null;
};

export function formatSubscriptionStatus(status?: string | null) {
  if (status === "trialing") return "Trial";
  if (status === "active") return "Activ";
  if (status === "expired") return "Expirat";
  if (status === "canceled") return "Anulat";
  return status || "Necunoscut";
}

export function subscriptionStatusClass(status?: string | null) {
  if (status === "trialing") return "mc-pill mc-pill-warning";
  if (status === "active") return "mc-pill mc-pill-success";
  if (status === "expired") return "mc-pill mc-pill-danger";
  if (status === "canceled") return "mc-pill mc-pill-neutral";
  return "mc-pill mc-pill-neutral";
}

export function daysUntilSubscriptionEnd(value?: string | null) {
  if (!value) return null;

  const end = new Date(value).getTime();
  if (Number.isNaN(end)) return null;

  return Math.ceil((end - Date.now()) / 86400000);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("ro-RO");
  } catch {
    return value;
  }
}

export async function fetchMyClinicSubscription(token: string | null) {
  return apiRequest<MyClinicSubscription>("/subscriptions/me", { token });
}