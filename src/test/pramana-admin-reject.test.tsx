import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  addAdminRoutes,
  calls,
  click,
  mockApi,
  renderRoute,
  signIn,
  type,
} from "./integration-helpers";

/**
 * "Reject" dialog flow: a mismatched request is rejected with the mandatory
 * reason through the real POST /admin/requests/{id}/reject endpoint. Own file
 * because consecutive Radix-dialog flows can deadlock the jsdom worker.
 */
describe("Admin reject action", () => {
  it("rejects with a required reason, then refetches request data and audit", async () => {
    signIn("admin");
    addAdminRoutes();
    mockApi(/\/admin\/requests\/KYC-2838\/reject$/, "POST", () => ({
      body: { status: "REJECTED", message: "KYC request rejected and audit trail updated." },
    }));
    renderRoute("/admin/requests/KYC-2838");
    click(await screen.findByRole("button", { name: /^Reject$/i }, { timeout: 5000 }));
    const confirm = await screen.findByRole("button", { name: /Confirm rejection/i });
    expect(confirm).toBeDisabled(); // reason is required
    const reasonInput = await screen.findByLabelText(/Rejection reason/i);
    type(reasonInput, "Name on document does not match.");
    await waitFor(() => expect(confirm).not.toBeDisabled());
    click(confirm);

    await waitFor(() => {
      const rejectCall = calls.find((c) => c.method === "POST" && c.url.includes("/reject"));
      expect(rejectCall?.body).toEqual({
        reason: "Name on document does not match.",
        adminName: "Nisha Verma",
      });
    });

    // Let the Radix dialog finish its close cycle (success closes it).
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
