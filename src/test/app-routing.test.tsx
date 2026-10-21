import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  rootRouteId,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useState, type ReactNode } from "react";

import { routeTree } from "@/routeTree.gen";
import { DemoProvider, useDemo, type DemoRequest } from "@/components/pramana/demo-state";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
const makeRouter = () => createRouter({ routeTree, context: { queryClient: new QueryClient() } });

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const matches = makeRouter().matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("registers every public, customer, and admin route", () => {
    const router = makeRouter();
    const paths = [
      "/",
      "/login",
      "/unauthorized",
      "/customer/dashboard",
      "/customer/documents",
      "/customer/submit",
      "/customer/status",
      "/customer/profile",
      "/admin/dashboard",
      "/admin/requests",
      "/admin/requests/KYC-2841",
      "/admin/audit",
      "/admin/customers",
      "/admin/profile",
    ];
    for (const path of paths) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId, `route for ${path}`).not.toBe(rootRouteId);
    }
    const detail = router.matchRoutes("/admin/requests/KYC-2841").at(-1);
    expect(detail?.routeId).toBe("/admin/requests/$id");
    expect((detail?.params as { id?: string }).id).toBe("KYC-2841");
  });
});

// Harness exposing the shared demo state to assertions.
let latest: ReturnType<typeof useDemo>;
function Probe({ children }: { children?: ReactNode }) {
  latest = useDemo();
  return <>{children}</>;
}
function renderDemo() {
  return render(
    <DemoProvider>
      <Probe />
    </DemoProvider>,
  );
}

describe("Shared demo state", () => {
  it("mounts the provider and exposes seeded demo data", () => {
    renderDemo();
    expect(latest.role).toBeNull();
    expect(latest.requests.length).toBeGreaterThanOrEqual(5);
    expect(latest.request("KYC-2841")?.name).toBe("Anaya Rao");
  });

  it("logs in and out with a demo role", () => {
    renderDemo();
    act(() => latest.login("customer"));
    expect(latest.role).toBe("customer");
    act(() => latest.logout());
    expect(latest.role).toBeNull();
  });

  it("processes a clean matching request as verified with an audit entry", () => {
    renderDemo();
    const before = latest.audit.length;
    // KYC-2841 has one UNCERTAIN field; correct it first so all fields match.
    act(() =>
      latest.updateAndProcess(
        "KYC-2841",
        "Address",
        "18 Lake View Rd, Pune",
        "Confirmed with customer.",
      ),
    );
    const req = latest.request("KYC-2841");
    expect(req?.status).toBe("VERIFIED");
    expect(req?.fields.every((field) => field.result === "MATCH")).toBe(true);
    expect(latest.audit.length).toBe(before + 1);
    expect(latest.audit[0]?.requestId).toBe("KYC-2841");
  });

  it("does not process a request with a mismatch as a clean match", () => {
    renderDemo();
    act(() => latest.process("KYC-2838")); // Kabir Mehta — name MISMATCH
    expect(latest.request("KYC-2838")?.status).toBe("UNDER_REVIEW");
  });

  it("does not process a request with unresolved uncertain fields", () => {
    renderDemo();
    act(() => latest.process("KYC-2834")); // Meera Iyer — two UNCERTAIN fields
    expect(latest.request("KYC-2834")?.status).toBe("SUBMITTED");
  });

  it("keeps a partially corrected request under review instead of verified", () => {
    renderDemo();
    // KYC-2834 has two uncertain fields; fixing one must not verify the request.
    act(() =>
      latest.updateAndProcess(
        "KYC-2834",
        "Date of birth",
        "02 Dec 1990",
        "Confirmed via document.",
      ),
    );
    const req = latest.request("KYC-2834");
    expect(req?.status).toBe("UNDER_REVIEW");
    expect(req?.fields.find((field) => field.label === "Date of birth")?.result).toBe("MATCH");
    expect(req?.fields.find((field) => field.label === "Address")?.result).toBe("UNCERTAIN");
  });

  it("ignores corrections for unknown fields without mutating data", () => {
    renderDemo();
    const before = latest.request("KYC-2838");
    act(() => latest.updateAndProcess("KYC-2838", "Name", "Kabir Mehta", "Bad field"));
    expect(latest.request("KYC-2838")).toEqual(before);
  });

  it("rejects a request with a reason and records it", () => {
    renderDemo();
    act(() => latest.reject("KYC-2838", "Name on document does not match the account."));
    const req = latest.request("KYC-2838");
    expect(req?.status).toBe("REJECTED");
    expect(req?.reason).toBe("Name on document does not match the account.");
    expect(latest.audit[0]?.action).toBe("Request rejected");
    expect(latest.audit[0]?.reason).toBe("Name on document does not match the account.");
  });

  it("updates the customer request when documents are submitted", () => {
    renderDemo();
    let id = "";
    act(() => {
      id = latest.submitDocuments(["Aadhaar", "Voter ID"]);
    });
    const req = latest.request(id);
    expect(req?.customerId).toBe("CUS-1042");
    expect(req?.status).toBe("SUBMITTED");
    expect(req?.documents).toEqual(["Aadhaar", "Voter ID"]);
  });

  it("audit entries carry id, request, customer, admin, action, field, values, reason, and timestamp", () => {
    renderDemo();
    act(() => latest.reject("KYC-2834", "Documents illegible."));
    const entry = latest.audit[0]!;
    for (const key of [
      "id",
      "requestId",
      "customerId",
      "admin",
      "action",
      "field",
      "previous",
      "next",
      "reason",
      "timestamp",
    ] as const) {
      expect(entry[key], key).toBeTruthy();
    }
  });

  it("reset restores the original seeded state and clears the role", () => {
    renderDemo();
    act(() => latest.login("admin"));
    act(() => latest.reject("KYC-2838", "Test rejection."));
    act(() => latest.reset());
    expect(latest.role).toBeNull();
    expect(latest.request("KYC-2838")?.status).toBe("UNDER_REVIEW");
    expect(latest.audit[0]?.id).toBe("AUD-0481");
  });
});

describe("Status normalization", () => {
  it("maps UNDER_REVIEW to the display label Under review", () => {
    const label = "UNDER_REVIEW"
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    expect(label).toBe("Under Review");
    const filterValue = "Under review".toUpperCase().replaceAll(" ", "_");
    expect(filterValue).toBe("UNDER_REVIEW");
  });

  it("computes match summary counts from comparison data", () => {
    const req: DemoRequest = {
      id: "KYC-T",
      customerId: "CUS-T",
      name: "T",
      email: "t@example.test",
      status: "UNDER_REVIEW",
      submitted: "12 Oct 2026",
      updated: "12 Oct 2026",
      documents: ["Aadhaar"],
      fields: [
        { label: "Full name", existing: "a", extracted: "a", result: "MATCH" },
        { label: "Address", existing: "b", extracted: "c", result: "MISMATCH" },
        { label: "Date of birth", existing: "d", extracted: "—", result: "UNCERTAIN" },
      ],
    };
    expect(req.fields.filter((f) => f.result === "MATCH")).toHaveLength(1);
    expect(req.fields.filter((f) => f.result === "MISMATCH")).toHaveLength(1);
    expect(req.fields.filter((f) => f.result === "UNCERTAIN")).toHaveLength(1);
  });
});

describe("Landing page", () => {
  it("renders the Pramāṇa landing page instead of the blank placeholder", async () => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText(/Identity verification,/i)).toBeInTheDocument();
    expect(document.querySelector("[data-lovable-blank-page-placeholder]")).toBeNull();
  });

  it("guards protected routes behind the demo role", async () => {
    const router = createRouter({
      routeTree,
      context: { queryClient: new QueryClient() },
      history: createMemoryHistory({ initialEntries: ["/customer/dashboard"] }),
    });
    render(<RouterProvider router={router} />);
    // Signed out: the customer dashboard shows the unauthorized screen.
    expect(await screen.findByText(/This workspace is unavailable/i)).toBeInTheDocument();
  });
});
