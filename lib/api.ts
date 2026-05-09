// Path: medicalend-web/lib/api.ts
export class ApiError extends Error {
  status: number;
  detail: unknown;
  code?: string;

  constructor(message: string, status: number, detail?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

type ApiRequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  headers?: Record<string, string>;
};

function resolveApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (
      host === "app.medicalend.ro" ||
      host === "medicalend-web.vercel.app"
    ) {
      return "https://api.medicalend.ro/api/v1";
    }
  }

  return "/api/v1";
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function normalizeApiErrorMessage(
  status: number,
  detail: unknown,
  path?: string,
) {
  const normalizedPath = path || "";

  if (status === 401) {
    if (normalizedPath.startsWith("/auth/login")) {
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
      return "Credentiale invalide.";
    }

    return "Sesiunea a expirat. Te rugăm să te autentifici din nou.";
  }

  if (status === 403) {
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    return "Nu ai permisiunea necesară pentru această acțiune.";
  }

  if (status === 402) {
    return "Abonamentul clinicii a expirat sau nu este activ. Pentru a continua, este necesară reactivarea acestuia.";
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as {
      msg?: string;
      loc?: Array<string | number>;
    };

    const loc = Array.isArray(first?.loc) ? first.loc.join(".") : "field";
    const msg = first?.msg || "Validation error";
    return `${loc}: ${msg}`;
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return "A apărut o eroare la comunicarea cu serverul.";
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

  const method = options.method || "GET";
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    if (isFormData(options.body)) {
      body = options.body;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers,
      body,
    });
  } catch (err) {
    throw new ApiError(
      "Nu se poate conecta la server. Verifică conexiunea sau configurarea API.",
      0,
      err instanceof Error ? err.message : err,
      "NETWORK_ERROR",
    );
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? (data as { detail?: unknown }).detail
        : data;

    throw new ApiError(
      normalizeApiErrorMessage(response.status, detail, path),
      response.status,
      detail,
      response.status === 402 ? "SUBSCRIPTION_INACTIVE" : undefined,
    );
  }

  return data as T;
}