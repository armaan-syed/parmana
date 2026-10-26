import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterAll, afterEach, beforeEach, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import type { AuditEvent, KycRequestSummary } from "@/lib/pramana-api";

/**
 * Shared infrastructure for the frontend ↔ FastAPI integration tests. `fetch`
 * is mocked per URL so screens are verified against realistic backend-shaped
 * responses without a live backend.
 *
 * These helpers are imported by several test files: vitest runs each file in
 * its own worker, so the Radix-dialog mutation flows (which can deadlock the
 * jsdom event loop of a shared worker when successive dialogs close) live in
 * files of their own.
 */

// ---------------------------------------------------------------------------
// Fixtures mirroring backend/app/schemas/kyc.py responses
// ---------------------------------------------------------------------------

export const cleanRequest: KycRequestSummary = {
  id: "KYC-2827",
  customerId: "CUS-1024",
  name: "Rohan Das",
  email: "rohan.das@example.test",
  status: "SUBMITTED",
  submitted: "12 Oct 2026",
  updated: "12 Oct 2026",
  documents: ["Aadhaar", "Voter ID"],
  fields: [
    { label: "Full name", existing: "Rohan Das", extracted: "Rohan Das", result: "MATCH" },
    { label: "Date of birth", existing: "17 Jan 1992", extracted: "17 Jan 1992", result: "MATCH" },
    {
      label: "Address",
      existing: "71 Green Avenue, Delhi",
      extracted: "71 Green Avenue, Delhi",
      result: "MATCH",
    },
    {
      label: "Document number",
      existing: "XXXX XXXX 6410",
      extracted: "XXXX XXXX 6410",
      result: "MATCH",
    },
  ],
};

export const mismatchRequest: KycRequestSummary = {
  id: "KYC-2838",
  customerId: "CUS-1038",
  name: "Kabir Mehta",
  email: "kabir.mehta@example.test",
  status: "UNDER_REVIEW",
  submitted: "11 Oct 2026",
  updated: "12 Oct 2026",
  documents: ["Aadhaar", "Voter ID"],
  fields: [
    {
      label: "Full name",
      existing: "Kabir Mehta",
      extracted: "Kabir R. Mehta",
      result: "MISMATCH",
    },
    { label: "Date of birth", existing: "23 Jul 1988", extracted: "23 Jul 1988", result: "MATCH" },
    {
      label: "Address",
      existing: "44 Palm Grove, Mumbai",
      extracted: "44 Palm Grove, Mumbai",
      result: "MATCH",
    },
  ],
};

export const listResponse: KycRequestSummary[] = [
  cleanRequest,
  mismatchRequest,
  {
    ...cleanRequest,
    id: "KYC-2819",
    customerId: "CUS-1016",
    name: "Tara Shah",
    status: "REJECTED",
    reason: "The submitted address proof was not legible.",
  },
  // Unknown status: must be rendered defensively, never crash the dashboard.
  {
    ...cleanRequest,
    id: "KYC-9999",
    customerId: "CUS-0999",
    name: "Casey Unknown",
    status: "SUSPENDED",
  },
];

export const auditResponse: AuditEvent[] = [
  {
    id: "AUD-0481",
    requestId: "KYC-2827",
    customerId: "CUS-1024",
    customer: "Rohan Das",
    admin: "Nisha Verma",
    action: "Request verified",
    field: "KYC status",
    previous: "Under review",
    next: "Verified",
    reason: "All required fields matched.",
    timestamp: "09 Oct 2026 · 14:32",
  },
];

export const customerProfile = {
  customerId: "CUS-1042",
  name: "Anaya Rao",
  email: "anaya.rao@example.test",
  dob: "14 Mar 1994",
  gender: "Female",
  address: "18 Lake View Road, Pune",
  phone: "+91 98500 00000",
  kycStatus: "UNDER_REVIEW",
};

export const customerStatus: KycRequestSummary = {
  id: "KYC-2841",
  customerId: "CUS-1042",
  name: "Anaya Rao",
  email: "anaya.rao@example.test",
  status: "UNDER_REVIEW",
  submitted: "12 Oct 2026",
  updated: "12 Oct 2026",
  documents: ["Aadhaar", "Voter ID"],
  fields: [
    { label: "Full name", existing: "Anaya Rao", extracted: "Anaya Rao", result: "MATCH" },
    {
      label: "Address",
      existing: "18 Lake View Rd, Pune",
      extracted: "18 Lakeview Road, Pune",
      result: "UNCERTAIN",
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock HTTP plumbing
// ---------------------------------------------------------------------------

export const calls: { url: string; method: string; body: unknown }[] = [];
export const fetchMock = vi.fn();

type MockResponse = { status?: number; body?: unknown; error?: Error };
const routes: {
  match: (url: string, method: string) => boolean;
  respond: () => MockResponse;
}[] = [];

export function mockApi(
  match: string | RegExp,
  method: "GET" | "POST",
  respond: () => MockResponse,
) {
  routes.push({
    match: (url, actual) => {
      const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0]!;
      const okPath = typeof match === "string" ? path === match : match.test(path);
      return okPath && method === actual;
    },
    respond: () => {
      const result = respond();
      if (result.error) throw result.error;
      return result;
    },
  });
}

function mockCall(url: string, method: string) {
  for (const route of routes) {
    if (route.match(url, method)) {
      const { status = 200, body: json } = route.respond();
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => (json === undefined ? "" : JSON.stringify(json)),
      };
    }
  }
  return {
    ok: false,
    status: 500,
    text: async () => JSON.stringify({ detail: `No mock route for ${method} ${url}` }),
  };
}

beforeEach(() => {
  routes.length = 0;
  calls.length = 0;
  window.sessionStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    let body: unknown;
    try {
      body = init?.body ? JSON.parse(String(init.body)) : undefined;
    } catch {
      body = init?.body;
    }
    calls.push({ url, method, body });
    return mockCall(url, method);
  });
  vi.stubGlobal("fetch", fetchMock);
  mockApi("/auth/me", "GET", () => {
    const rawSession = window.sessionStorage.getItem("pramana-session");
    const session = rawSession ? JSON.parse(rawSession) : null;
    return {
      status: session ? 200 : 401,
      body: session
        ? {
            id: session.userId,
            userId: session.userId,
            role: session.role,
            name: session.name,
            email: session.email,
          }
        : { detail: "Authentication required." },
    };
  });
});

afterEach(() => {
  // Unmount everything rendered in this test before wiping dialog leftovers
  // (portals, scroll-lock attributes) so they cannot leak into the next test.
  cleanup();
  document
    .querySelectorAll<HTMLDivElement>("div[data-testid='test-root']")
    ?.forEach((n) => n.remove());
  document.body.innerHTML = "";
  document.body.style.pointerEvents = "auto";
  document.body.removeAttribute("data-scroll-locked");
  document.body.removeAttribute("aria-hidden");
  window.sessionStorage.clear();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------

export function signIn(role: "customer" | "admin") {
  window.sessionStorage.setItem(
    "pramana-session",
    JSON.stringify({
      token: "test-session-token",
      role,
      userId: role === "admin" ? "ADM-001" : "CUS-1042",
      name: role === "admin" ? "Nisha Verma" : "Anaya Rao",
      email: role === "admin" ? "admin@pramana.test" : "anaya.rao@example.test",
    }),
  );
}

export function renderRoute(
  path: string,
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  }),
) {
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const container = document.createElement("div");
  container.setAttribute("data-testid", "test-root");
  document.body.appendChild(container);
  const view = render(<RouterProvider router={router} />, { container });
  return { ...view, router, queryClient, container };
}

export function addCustomerRoutes() {
  mockApi("/customer/profile", "GET", () => ({ body: customerProfile }));
  mockApi("/customer/status", "GET", () => ({ body: customerStatus }));
}

export function addAdminRoutes() {
  mockApi("/admin/requests", "GET", () => ({ body: listResponse }));
  mockApi(/\/admin\/requests\/KYC-2827$/, "GET", () => ({ body: cleanRequest }));
  mockApi(/\/admin\/requests\/KYC-2838$/, "GET", () => ({ body: mismatchRequest }));
  mockApi("/audit/logs", "GET", () => ({ body: auditResponse }));
}

export const auditCallCount = () =>
  calls.filter((c) => c.method === "GET" && c.url.includes("/audit/logs")).length;

// Radix Dialog ports outside the rendered tree; userEvent's pointer-event
// chain can hang in jsdom, so dialog interactions use fireEvent (which still
// wraps act()).
export const click = (element: HTMLElement) => fireEvent.click(element);
export const type = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });
