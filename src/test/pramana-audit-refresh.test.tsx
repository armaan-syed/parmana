import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  addAdminRoutes,
  auditCallCount,
  calls,
  click,
  mockApi,
  renderRoute,
  signIn,
} from "./integration-helpers";

/**
 * End-to-end "audit is refreshed after a successful action" flow: read the
 * audit trail, walk to a request through the router, process it through the
 * real endpoint, and come back to see the audit query refetched (it was
 * invalidated by the mutation even while unmounted).
 *
 * Own file because consecutive Radix-dialog flows can deadlock the jsdom
 * worker's event loop.
 */
describe("Audit refresh after admin action", () => {
  it("audit history is invalidated and refetched after a successful action", async () => {
    signIn("admin");
    addAdminRoutes();
    mockApi(/\/admin\/requests\/KYC-2827\/process$/, "POST", () => ({
      body: { status: "VERIFIED", message: "KYC request successfully verified." },
    }));
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { router } = renderRoute("/admin/audit", queryClient);

    // The router renders asynchronously; wait for the audit page's data.
    expect(await screen.findByText(/AUD-0481/i, undefined, { timeout: 5000 })).toBeInTheDocument();
    const firstFetches = auditCallCount();
    expect(firstFetches).toBeGreaterThanOrEqual(1); // audit loaded on mount

    // Walk to the request detail through the same router.
    await router.navigate({ to: "/admin/requests/$id", params: { id: "KYC-2827" } });
    click(await screen.findByRole("button", { name: /Process request/i }, { timeout: 5000 }));
    click(await screen.findByRole("button", { name: /Confirm process/i }, { timeout: 5000 }));
    await waitFor(() => {
      expect(calls.some((c) => c.method === "POST" && c.url.includes("/process"))).toBe(true);
    });

    // The mutation invalidated related queries, including the audit trail even
    // though its observer was unmounted at that moment.
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["audit", "logs"] }),
    );

    // Returning to the audit page refetches (the entry is stale), proving the
    // refresh path rather than a cached, never invalidated list.
    await router.navigate({ to: "/admin/audit" });
    await waitFor(
      () => {
        expect(auditCallCount()).toBeGreaterThan(firstFetches);
      },
      { timeout: 5000 },
    );
    expect(await screen.findByText(/AUD-0481/i, undefined, { timeout: 5000 })).toBeInTheDocument();

    // Let the Radix dialog finish its close cycle before teardown.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
