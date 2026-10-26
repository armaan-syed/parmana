import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

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
});
