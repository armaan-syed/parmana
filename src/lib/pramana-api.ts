/**
 * Central HTTP client for the PramÄá¹‡a FastAPI backend.
 *
 * - Base URL comes from `VITE_API_BASE_URL` (see `.env.example`).
 * - Typed request/response interfaces mirror `backend/app/schemas/kyc.py`.
 * - Credentials are never stored here; the short-lived bearer token is
 *   attached as `Authorization: Bearer` when a session exists.
 * - Server-only secrets (database URL, AWS credentials, …) must never be
 *   placed in frontend `VITE_*` environment variables.
 */

import { readSession } from "@/lib/session";

export const API_BASE_URL: string =
  import.meta.env?.["VITE_API_BASE_URL"] ?? "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 15_000;

/** A failed HTTP exchange with the API. `detail` carries FastAPI's error field when present. */
export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Thrown when the request could not reach the backend at all. */
export class NetworkError extends Error {
  constructor(message = "Cannot reach the PramÄá¹‡a API. Check that the backend is running.") {
    super(message);
    this.name = "NetworkError";
  }
}

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`The PramÄá¹‡a API did not respond within ${ms}ms.`);
    this.name = "TimeoutError";
  }
}

function isApiErrorShape(value: unknown): value is { detail?: unknown } {
  return typeof value === "object" && value !== null && "detail" in value;
}

/** Normalises FastAPI error payloads (`detail` string, array, or object) into a message. */
export function apiErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : typeof item === "string"
            ? item
            : null,
      )
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join("; ");
  }
  if (isApiErrorShape(detail)) return apiErrorMessage(detail.detail, fallback);
  if (typeof detail === "object" && detail !== null) {
    try {
      return JSON.stringify(detail);
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: "The request was rejected by the API.",
  401: "Your session is not authorized for this action.",
  403: "You do not have permission for this action.",
  404: "The requested record was not found.",
  500: "The API reported an internal error.",
};

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
  query?: Record<string, string | undefined>;
};

/**
 * Performs a typed request against the backend.
 * - Sends the session token (when present) as `Authorization: Bearer`.
 * - Treats every non-2xx response as an `ApiError` with the parsed `detail`.
 * - Network failures raise `NetworkError`; slow responses raise `TimeoutError`.
 * - Empty bodies (204) resolve to `null`; `undefined` resolves when parsing
 *   yields nothing usable, so callers should validate before use.
 */
export async function request<T>(
  path: string,
  { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS, query }: RequestOptions = {},
): Promise<T | null> {
  const url = new URL(
    path.replace(/^\//, ""),
    API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`,
  );
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const session = readSession();
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(
      url.toString(),
      body === undefined
        ? { method, headers, signal: controller.signal }
        : { method, headers, body: JSON.stringify(body), signal: controller.signal },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new TimeoutError(timeoutMs);
    // fetch rejects with TypeError for network/DNS/CORS failures.
    throw new NetworkError(
      error instanceof Error && error.message ? `${error.message}` : undefined,
    );
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Non-JSON body kept as raw text below.
      if (!response.ok) {
        throw new ApiError(
          response.status,
          raw.slice(0, 200) ||
            apiErrorMessage(
              null,
              DEFAULT_ERROR_MESSAGES[response.status] ??
                `Request failed with status ${response.status}.`,
            ),
          raw.slice(0, 200),
        );
      }
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      apiErrorMessage(
        isApiErrorShape(parsed) ? parsed.detail : null,
        DEFAULT_ERROR_MESSAGES[response.status] ?? `Request failed with status ${response.status}.`,
      ),
      isApiErrorShape(parsed) ? parsed.detail : parsed,
    );
  }

  return (parsed as T | null) ?? null;
}

// ---------------------------------------------------------------------------
// Types mirroring backend/app/schemas/kyc.py
// ---------------------------------------------------------------------------

/** MATCH / MISMATCH / UNCERTAIN — unknown values are possible and must be handled defensively. */
export type MatchStatus = "MATCH" | "MISMATCH" | "UNCERTAIN";
export type Role = "customer" | "admin";

export type ComparisonField = {
  label: string;
  existing: string;
  extracted: string;
  result: string;
};

export type KycRequestSummary = {
  id: string;
  customerId: string;
  name: string;
  email: string;
  status: string;
  submitted: string;
  updated: string;
  documents: string[];
  fields: ComparisonField[];
  reason?: string | null;
};

export type AuditEvent = {
  id: string;
  requestId?: string | null;
  customerId: string;
  customer: string;
  admin: string;
  action: string;
  field: string;
  previous?: string | null;
  next?: string | null;
  reason: string;
  timestamp: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult = {
  token: string;
  role: string;
  name: string;
  userId: string;
  email: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegisterResult = {
  message: string;
  user: {
    id: string;
    userId: string;
    role: Role;
    name: string;
    email: string;
  };
};

export type CurrentUser = {
  id: string;
  userId: string;
  role: Role;
  name: string;
  email: string;
};

export type CustomerProfile = {
  customerId: string;
  name: string;
  email: string;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  phone?: string | null;
  kycStatus: string;
};

export type SubmitDocumentsPayload = {
  /** Document-type strings; the backend endpoint does not accept file bytes. */
  files: string[];
  customerId?: string | undefined;
};

export type SubmitDocumentsResult = {
  requestId: string;
  status: string;
  message: string;
};

/** Legacy alias — the frontend used to call this `DemoRequest`. */
export type DemoRequest = KycRequestSummary;

export type UpdateAndProcessPayload = {
  field: string;
  value: string;
  reason: string;
  adminName?: string | undefined;
};

export type RejectPayload = {
  reason: string;
  adminName?: string | undefined;
};

export type ProcessPayload = {
  adminName?: string | undefined;
};

export type AdminActionResult = {
  status: string;
  message: string;
  /** Present on update-and-process: whether every field now matches. */
  resolved?: boolean;
};

// ---------------------------------------------------------------------------
// Endpoints (each verified against backend/app/routes)
// ---------------------------------------------------------------------------

/** POST /auth/register — creates a customer account. */
export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const result = await request<RegisterResult>("/auth/register", {
    method: "POST",
    body: payload,
    timeoutMs: 20_000,
  });
  if (!result || typeof result.message !== "string" || typeof result.user?.userId !== "string") {
    throw new ApiError(0, "The API returned an unexpected registration response.");
  }
  return result;
}

/** POST /auth/login — verifies the account password and issues a signed token. */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const result = await request<LoginResult>("/auth/login", {
    method: "POST",
    body: payload,
    timeoutMs: 20_000,
  });
  if (
    !result ||
    typeof result.token !== "string" ||
    typeof result.userId !== "string" ||
    !["customer", "admin"].includes(result.role)
  ) {
    throw new ApiError(0, "The API returned an unexpected login response.");
  }
  return result;
}

/** GET /auth/me — validates the current bearer token and returns database identity. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const result = await request<CurrentUser>("/auth/me");
  if (
    !result ||
    typeof result.userId !== "string" ||
    !["customer", "admin"].includes(result.role)
  ) {
    throw new ApiError(0, "The API returned an unexpected session response.");
  }
  return result;
}

/** GET /customer/profile?customer_id=… */
export async function getCustomerProfile(customerId: string): Promise<CustomerProfile> {
  const result = await request<CustomerProfile>("/customer/profile", {
    query: { customer_id: customerId },
  });
  if (!result || typeof result.customerId !== "string") {
    throw new ApiError(0, "The API returned an unexpected profile response.");
  }
  return result;
}

/** GET /customer/status?customer_id=… — 404 when the customer has no KYC request yet. */
export async function getCustomerStatus(customerId: string): Promise<KycRequestSummary> {
  const result = await request<KycRequestSummary>("/customer/status", {
    query: { customer_id: customerId },
  });
  if (!result || typeof result.id !== "string") {
    throw new ApiError(0, "The API returned an unexpected status response.");
  }
  return result;
}

/** GET /customer/list — no server-side search or pagination is provided. */
export async function listCustomers(): Promise<CustomerProfile[]> {
  const result = await request<CustomerProfile[]>("/customer/list");
  return Array.isArray(result) ? result : [];
}

/** POST /documents/submit — metadata only; file bytes are NOT sent to the backend. */
export async function submitDocuments(
  payload: SubmitDocumentsPayload,
): Promise<SubmitDocumentsResult> {
  const result = await request<SubmitDocumentsResult>("/documents/submit", {
    method: "POST",
    body: payload,
    timeoutMs: 30_000,
  });
  if (!result || typeof result.requestId !== "string") {
    throw new ApiError(0, "The API returned an unexpected submission response.");
  }
  return result;
}

/** GET /admin/requests */
export async function listAdminRequests(): Promise<KycRequestSummary[]> {
  const result = await request<KycRequestSummary[]>("/admin/requests");
  return Array.isArray(result) ? result : [];
}

/** GET /admin/requests/{request_id} — 404 when the request does not exist. */
export async function getAdminRequest(requestId: string): Promise<KycRequestSummary> {
  const result = await request<KycRequestSummary>(
    `/admin/requests/${encodeURIComponent(requestId)}`,
  );
  if (!result || typeof result.id !== "string") {
    throw new ApiError(0, "The API returned an unexpected request response.");
  }
  return result;
}

/** POST /admin/requests/{request_id}/process */
export async function processAdminRequest(
  requestId: string,
  payload: ProcessPayload,
): Promise<AdminActionResult> {
  const result = await request<AdminActionResult>(
    `/admin/requests/${encodeURIComponent(requestId)}/process`,
    { method: "POST", body: payload },
  );
  if (!result || typeof result.status !== "string") {
    throw new ApiError(0, "The API returned an unexpected process response.");
  }
  return result;
}

/** POST /admin/requests/{request_id}/update-and-process */
export async function updateAndProcessAdminRequest(
  requestId: string,
  payload: UpdateAndProcessPayload,
): Promise<AdminActionResult> {
  const result = await request<AdminActionResult>(
    `/admin/requests/${encodeURIComponent(requestId)}/update-and-process`,
    { method: "POST", body: payload },
  );
  if (!result || typeof result.status !== "string") {
    throw new ApiError(0, "The API returned an unexpected update response.");
  }
  return result;
}

/** POST /admin/requests/{request_id}/reject */
export async function rejectAdminRequest(
  requestId: string,
  payload: RejectPayload,
): Promise<AdminActionResult> {
  const result = await request<AdminActionResult>(
    `/admin/requests/${encodeURIComponent(requestId)}/reject`,
    {
      method: "POST",
      body: payload,
    },
  );
  if (!result || typeof result.status !== "string") {
    throw new ApiError(0, "The API returned an unexpected reject response.");
  }
  return result;
}

/** GET /audit/logs */
export async function listAuditLogs(): Promise<AuditEvent[]> {
  const result = await request<AuditEvent[]>("/audit/logs");
  return Array.isArray(result) ? result : [];
}
