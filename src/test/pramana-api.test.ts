import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the central API client (`src/lib/pramana-api.ts`) using mocked
 * `fetch` — no live backend or AWS environment is required.
 */

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  };
}

async function loadModule() {
  // Fresh dynamic import so module-level env reads are deterministic.
  vi.resetModules();
  return import("@/lib/pramana-api");
}

describe("API base URL configuration", () => {
  it("defaults to http://localhost:8000 when VITE_API_BASE_URL is not set", async () => {
    vi.unstubAllEnvs();
    const { API_BASE_URL } = await loadModule();
    expect(API_BASE_URL).toBe("http://localhost:8000");
  });

  it("uses VITE_API_BASE_URL when provided", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.local:9000");
    const { API_BASE_URL } = await loadModule();
    expect(API_BASE_URL).toBe("http://api.local:9000");
  });
});

describe("Request handling", () => {
  it("sends the session token as a Bearer header when a session exists", async () => {
    window.sessionStorage.setItem(
      "pramana-session",
      JSON.stringify({
        token: "mock-token-123",
        role: "admin",
        userId: "ADM-001",
        name: "Nisha Verma",
        email: "admin@pramana.test",
      }),
    );
    const api = await loadModule();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await api.listAuditLogs();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toContain("/audit/logs");
    expect(init.headers["Authorization"]).toBe("Bearer mock-token-123");
  });

  it("sends no Authorization header without a session", async () => {
    const api = await loadModule();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await api.listAuditLogs();
    const [, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(init.headers["Authorization"]).toBeUndefined();
  });

  it("serializes JSON request bodies", async () => {
    const api = await loadModule();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ requestId: "KYC-9001", status: "SUBMITTED", message: "ok" }),
    );
    await api.submitDocuments({ files: ["Aadhaar", "Voter ID"], customerId: "CUS-1042" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/documents/submit");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({ files: ["Aadhaar", "Voter ID"], customerId: "CUS-1042" }),
    );
  });

  it("resolves with null for an empty (204-style) response body", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, text: async () => "" });
    const api = await loadModule();
    const { request } = api as unknown as { request: <T>(p: string) => Promise<T | null> };
    const result = await request<{ data: unknown }>("/anything");
    expect(result).toBeNull();
  });
});

describe("Error handling", () => {
  it("parses a FastAPI string detail into the error message", async () => {
    const api = await loadModule();
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Invalid email or password." }, 401));
    await expect(
      api.login({ email: "unknown@example.com", password: "WrongPassword123" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Invalid email or password.",
    });
  });

  it("parses array (validation) details from FastAPI", async () => {
    const api = await loadModule();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: [{ msg: "field: Input should be a valid string" }] }, 422),
    );
    await expect(api.rejectAdminRequest("KYC-1", { reason: "" })).rejects.toMatchObject({
      status: 422,
      message: "field: Input should be a valid string",
    });
  });

  it("exposes a 404 status for missing records", async () => {
    const api = await loadModule();
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Request KYC-999 not found." }, 404));
    const error = await api.getAdminRequest("KYC-999").catch((err: unknown) => err);
    expect((error as { status: number }).status).toBe(404);
  });

  it("raises a NetworkError for connection failures without silent fake data", async () => {
    const api = await loadModule();
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(api.listAdminRequests()).rejects.toMatchObject({ name: "NetworkError" });
  });

  it("wraps non-JSON error bodies", async () => {
    const api = await loadModule();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => "<html>Bad gateway</html>",
    });
    await expect(api.listCustomers()).rejects.toMatchObject({ status: 502 });
  });
});
