import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  addAdminRoutes,
  addCustomerRoutes,
  auditCallCount,
  calls,
  customerProfile,
  customerStatus,
  mockApi,
  renderRoute,
  signIn,
} from "./integration-helpers";
import type { KycRequestSummary } from "@/lib/pramana-api";

/**
 * Frontend ↔ FastAPI integration tests. `fetch` is mocked per URL so screens
 * are verified against realistic backend-shaped responses without a live
 * backend. Manual steps to verify against the running backend are documented
 * in INTEGRATION_GAPS.md.
 *
 * The Radix-dialog mutation flows (process / reject / update & process / audit
 * refresh) have files of their own: consecutive dialog flows can deadlock the
 * jsdom event loop inside a single worker, so each lives in an isolated file.
 */

// ---------------------------------------------------------------------------
// 1–2. Login
// ---------------------------------------------------------------------------

describe("Login", () => {
  it("POSTs credentials to /auth/login and establishes the returned database session", async () => {
    const user = userEvent.setup();
    mockApi("/auth/login", "POST", () => ({
      body: {
        token: "signed-test-token",
        role: "customer",
        name: "Anaya Rao",
        userId: "CUS-1042",
        email: "anaya.rao@example.test",
      },
    }));
    addCustomerRoutes();
    renderRoute("/login");

    await user.type(await screen.findByLabelText(/Email address/i), "anaya.rao@example.test");
    await user.type(await screen.findByLabelText(/^Password$/i), "SecurePassword123");
    await user.click(await screen.findByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(calls.some((c) => c.method === "POST" && c.url.includes("/auth/login"))).toBe(true);
    });
    const loginCall = calls.find((c) => c.method === "POST" && c.url.includes("/auth/login"));
    expect(loginCall?.body).toEqual({
      email: "anaya.rao@example.test",
      password: "SecurePassword123",
    });

    // Navigates into the workspace established by the backend response.
    expect(
      await screen.findByText(/Good morning/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem("pramana-session")).toContain("CUS-1042");
  });

  it("displays API errors and does not create a session on failure", async () => {
    const user = userEvent.setup();
    mockApi("/auth/login", "POST", () => ({
      status: 401,
      body: { detail: "Invalid email or password." },
    }));
    renderRoute("/login");
    await user.type(await screen.findByLabelText(/Email address/i), "unknown@example.com");
    await user.type(await screen.findByLabelText(/^Password$/i), "NotThePassword123");
    await user.click(await screen.findByRole("button", { name: "Sign In" }));

    expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument();
    expect(window.sessionStorage.getItem("pramana-session")).toBeNull();
  });

  it("registers a customer account and returns to sign in after success", async () => {
    const user = userEvent.setup();
    mockApi("/auth/register", "POST", () => ({
      status: 201,
      body: {
        message: "Account created successfully. You can now sign in.",
        user: {
          id: "100",
          userId: "CUS-NEW",
          role: "customer",
          name: "New Customer",
          email: "new@example.com",
        },
      },
    }));
    renderRoute("/login");
    await user.click(await screen.findByRole("tab", { name: "Create Account" }));
    await user.type(await screen.findByLabelText(/Full name/i), "New Customer");
    await user.type(await screen.findByLabelText(/Email address/i), "new@example.com");
    await user.type(await screen.findByLabelText(/^Password$/i), "SecurePassword123");
    await user.type(await screen.findByLabelText(/Confirm password/i), "SecurePassword123");
    await user.click(await screen.findByRole("button", { name: "Create Account" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Account created successfully/i);
    expect(screen.getByRole("tab", { name: "Sign In" })).toHaveAttribute("aria-selected", "true");
    expect(window.sessionStorage.getItem("pramana-session")).toBeNull();
    const registration = calls.find(
      (call) => call.method === "POST" && call.url.includes("/auth/register"),
    );
    expect(registration?.body).toEqual({
      fullName: "New Customer",
      email: "new@example.com",
      password: "SecurePassword123",
      confirmPassword: "SecurePassword123",
    });
  });

  it("allows a six-character password when creating an account", async () => {
    const user = userEvent.setup();
    mockApi("/auth/register", "POST", () => ({
      status: 201,
      body: {
        message: "Account created successfully. You can now sign in.",
        user: {
          id: "100",
          userId: "CUS-NEW",
          role: "customer",
          name: "New Customer",
          email: "new@example.com",
        },
      },
    }));
    renderRoute("/login");
    await user.click(await screen.findByRole("tab", { name: "Create Account" }));
    await user.type(await screen.findByLabelText(/Full name/i), "New Customer");
    await user.type(await screen.findByLabelText(/Email address/i), "new@example.com");
    await user.type(await screen.findByLabelText(/^Password$/i), "Abc123");
    await user.type(await screen.findByLabelText(/Confirm password/i), "Abc123");
    await user.click(await screen.findByRole("button", { name: "Create Account" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Account created successfully/i);
    expect(
      calls.some((call) => call.method === "POST" && call.url.includes("/auth/register")),
    ).toBe(true);
  });
});

describe("Route authorization", () => {
  it("redirects unauthenticated users to sign in", async () => {
    renderRoute("/admin/dashboard");
    expect(await screen.findByRole("tab", { name: "Sign In" })).toBeInTheDocument();
  });

  it("prevents a customer session from rendering administrator screens", async () => {
    signIn("customer");
    addAdminRoutes();
    renderRoute("/admin/dashboard");
    expect(await screen.findByText(/This workspace is unavailable/i)).toBeInTheDocument();
    expect(calls.some((call) => call.url.includes("/admin/requests"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Customer profile and status
// ---------------------------------------------------------------------------

describe("Customer screens", () => {
  it("renders profile values from the API", async () => {
    signIn("customer");
    addCustomerRoutes();
    renderRoute("/customer/profile");
    expect(await screen.findByText(/Full name/i, undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getAllByText("Anaya Rao").length).toBeGreaterThan(0);
    expect(screen.getAllByText("14 Mar 1994").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18 Lake View Road, Pune").length).toBeGreaterThan(0);
  });

  it("renders verification status data from the API", async () => {
    signIn("customer");
    addCustomerRoutes();
    renderRoute("/customer/status");
    expect(
      await screen.findByText(/Request KYC-2841/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Under Review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Aadhaar, Voter ID/i).length).toBeGreaterThan(0);
  });

  it("shows the first-time empty state when the status API returns 404", async () => {
    signIn("customer");
    mockApi("/customer/profile", "GET", () => ({ body: customerProfile }));
    mockApi("/customer/status", "GET", () => ({
      status: 404,
      body: { detail: "No KYC request found for this customer." },
    }));
    renderRoute("/customer/status");
    expect(
      await screen.findByText(/No verification request/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("shows an error state without fake data when the API is unreachable", async () => {
    signIn("customer");
    mockApi("/customer/profile", "GET", () => ({ error: new TypeError("fetch failed") }));
    mockApi("/customer/status", "GET", () => ({ error: new TypeError("fetch failed") }));
    renderRoute("/customer/status");
    expect(
      await screen.findByText(/Could not load data/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    // No simulated/demo data appears in place of the API result.
    const main = document.querySelector("main")!;
    expect(within(main).queryByText(/Anaya Rao/)).toBeNull();
    expect(within(main).queryByText(/KYC-2841/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Document submission
// ---------------------------------------------------------------------------

describe("Document submission", () => {
  it("POSTs document-type metadata (not file bytes) and shows the request id", async () => {
    signIn("customer");
    // Customer status becomes the submitted request once the API accepts it.
    let currentStatus: KycRequestSummary = customerStatus;
    mockApi("/customer/profile", "GET", () => ({ body: customerProfile }));
    mockApi("/customer/status", "GET", () => ({ body: currentStatus }));
    mockApi("/documents/submit", "POST", () => {
      currentStatus = { ...customerStatus, id: "KYC-9102", status: "SUBMITTED" };
      return {
        body: {
          requestId: "KYC-9102",
          status: "SUBMITTED",
          message: "KYC documents submitted successfully.",
        },
      };
    });
    const user = userEvent.setup();
    // jsdom does not implement blob object URLs; add them without replacing
    // the URL constructor itself (new URL(...) must keep working).
    Object.defineProperty(URL, "createObjectURL", {
      value: vi.fn(() => "blob:preview"),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });

    const { container } = renderRoute("/customer/submit");
    expect(
      await screen.findByText(/Confirm and submit/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    const fileInputs = container.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThanOrEqual(2);
    const fileA = new File(["aadhaar-bytes"], "aadhaar.png", { type: "image/png" });
    const fileV = new File(["voter-bytes"], "voter.png", { type: "image/png" });
    await user.upload(fileInputs[0] as HTMLInputElement, fileA);
    await user.upload(fileInputs[1] as HTMLInputElement, fileV);

    await user.click(screen.getByRole("button", { name: /Confirm and submit/i }));

    await waitFor(() => {
      expect(calls.some((c) => c.method === "POST" && c.url.includes("/documents/submit"))).toBe(
        true,
      );
    });
    const submitCall = calls.find(
      (c) => c.method === "POST" && c.url.includes("/documents/submit"),
    );
    expect(submitCall?.body).toEqual({ files: ["Aadhaar", "Voter ID"], customerId: "CUS-1042" });

    // The returned request metadata (id/status) is shown on the status page.
    expect(
      await screen.findByText(/Request KYC-9102/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5–7. Admin dashboard, queue, detail
// ---------------------------------------------------------------------------

describe("Admin dashboard and request list", () => {
  it("derives dashboard statistics from fetched requests", async () => {
    signIn("admin");
    addAdminRoutes();
    renderRoute("/admin/dashboard");
    const heading = await screen.findByText(/Total requests/i, undefined, { timeout: 5000 });
    const card = heading.closest(".rounded-lg");
    expect(card).not.toBeNull();
    const match = within(card as HTMLElement).getByText("4");
    expect(match).toBeInTheDocument();
    expect(screen.getAllByText(/Rohan Das/i).length).toBeGreaterThan(0);
  });

  it("renders the queue table from real request rows", async () => {
    signIn("admin");
    addAdminRoutes();
    renderRoute("/admin/requests");
    expect(
      await screen.findByText(/Kabir Mehta/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tara Shah/i)).toBeInTheDocument();
  });

  it("renders unknown status values defensively", async () => {
    signIn("admin");
    addAdminRoutes();
    renderRoute("/admin/requests");
    expect(await screen.findByText(/Suspended/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  it("renders real comparison fields and a not-found state", async () => {
    signIn("admin");
    addAdminRoutes();
    renderRoute("/admin/requests/KYC-2838");
    const kabirMatches = await screen.findAllByText(/Kabir Mehta/i, undefined, { timeout: 5000 });
    expect(kabirMatches.length).toBeGreaterThan(0);
    expect(screen.getByText("Kabir R. Mehta")).toBeInTheDocument();
  });

  it("shows a not-found state for missing requests (HTTP 404)", async () => {
    signIn("admin");
    // Any request id other than the seeded list items resolves to 404.
    mockApi(new RegExp("/admin/requests/(?!KYC-2827$|KYC-2838$).+$", "i"), "GET", () => ({
      status: 404,
      body: { detail: "Request not found." },
    }));
    addAdminRoutes();
    renderRoute("/admin/requests/KYC-0000");
    expect(
      await screen.findByText(/Request not found/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("blocks direct processing of mismatched requests with no optimistic verify", async () => {
    signIn("admin");
    addAdminRoutes();
    renderRoute("/admin/requests/KYC-2838");
    const button = await screen.findByRole(
      "button",
      { name: /Process request/i },
      { timeout: 5000 },
    );
    expect(button).toBeDisabled();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. Audit history
// ---------------------------------------------------------------------------

describe("Audit history", () => {
  it("renders persisted backend audit events instead of local fabrications", async () => {
    signIn("admin");
    addAdminRoutes();
    const user = userEvent.setup();
    renderRoute("/admin/audit");
    const row = await screen.findByText(/AUD-0481/i, undefined, { timeout: 5000 });
    expect(auditCallCount()).toBeGreaterThanOrEqual(1);
    // Reason and values are shown in the expandable row.
    await user.click(row.closest("tr") as HTMLElement);
    expect(screen.getByText(/All required fields matched./i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 10. Logout and session cleanup
// ---------------------------------------------------------------------------

describe("Session cleanup", () => {
  it("signing out clears the session and cached user data", async () => {
    signIn("customer");
    addCustomerRoutes();
    const user = userEvent.setup();
    renderRoute("/customer/dashboard");
    expect(
      await screen.findByText(/Good morning/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Sign out/i }));
    await waitFor(() => expect(window.sessionStorage.getItem("pramana-session")).toBeNull());
    expect(await screen.findByText(/Welcome back/i)).toBeInTheDocument();
  });
});
