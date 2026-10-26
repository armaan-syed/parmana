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
 * "Update & process" dialog flow: an API-side 400 error is displayed inside
 * the dialog without losing the entered values, and the payload sent to
 * POST /admin/requests/{id}/update-and-process is exactly as documented.
 * Own file because consecutive Radix-dialog flows can deadlock the jsdom
 * worker's event loop.
 */
describe("Admin update & process action", () => {
  it("update & process sends the endpoint payload and surfaces API errors without losing form values", async () => {
    signIn("admin");
    addAdminRoutes();
    mockApi(/\/admin\/requests\/KYC-2838\/update-and-process$/, "POST", () => ({
      status: 400,
      body: { detail: "Field 'Full name' not found in verification comparison." },
    }));
    renderRoute("/admin/requests/KYC-2838");
    click(await screen.findByRole("button", { name: /Update & process/i }, { timeout: 5000 }));
    const reasonBox = await screen.findByLabelText(/Reason for change/i);
    type(reasonBox, "Name corrected from the submitted document.");
    click(
      await screen.findByRole("button", { name: /Confirm update & process/i }, { timeout: 5000 }),
    );

    await waitFor(() => {
      const call = calls.find((c) => c.method === "POST" && c.url.includes("/update-and-process"));
      expect(call?.body).toMatchObject({
        field: "Full name",
        value: "Kabir R. Mehta",
        reason: "Name corrected from the submitted document.",
        adminName: "Nisha Verma",
      });
    });
    // The real API error is displayed and the form values are preserved.
    expect(await screen.findByText(/not found in verification comparison/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for change/i)).toHaveValue(
      "Name corrected from the submitted document.",
    );
    // Close the dialog cleanly before tearing the tree down.
    click(await screen.findByRole("button", { name: /Cancel/i }, { timeout: 5000 }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
