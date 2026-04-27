// Path: medicalend-web/lib/billing.ts
import { apiRequest } from "@/lib/api";

export type CreateCheckoutSessionOut = {
  checkout_url: string;
};

export type BillingPortalOut = {
  url: string;
};

export async function createStripeCheckoutSession(
  token: string | null,
  planId: number,
) {
  return apiRequest<CreateCheckoutSessionOut>("/billing/checkout-session", {
    method: "POST",
    token,
    body: {
      plan_id: planId,
    },
  });
}

export async function createBillingPortalSession(token: string | null) {
  return apiRequest<BillingPortalOut>("/billing/portal", {
    method: "POST",
    token,
  });
}