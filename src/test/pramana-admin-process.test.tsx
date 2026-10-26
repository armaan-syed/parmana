import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { addAdminRoutes, calls, click, mockApi, renderRoute, signIn } from "./integration-helpers";

/**
 * "Process" dialog flow: a clean (MATCH-only) request is verified through the
 * real POST /admin/requests/{id}/process endpoint. Kept in its own file —
 * consecutive Radix-dialog flows can deadlock the jsdom worker's event loop.
 */
describe("Admin process action", () => {
  it("processes a clean request through the real endpoint and invalidates queries", async () => {
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
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    renderRoute("/admin/requests/KYC-2827", queryClient);
    click(await screen.findByRole("button", { name: /Process request/i }, { timeout: 5000 }));
    click(await screen.findByRole("button", { name: /Confirm process/i }, { timeout: 5000 }));
    await waitFor(() => {
      const call = calls.find((c) => c.method === "POST" && c.url.includes("/process"));
      expect(call?.body).toEqual({ adminName: "Nisha Verma" });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["audit", "logs"] }));
    });
    // Let the Radix dialog finish its close cycle before teardown.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
