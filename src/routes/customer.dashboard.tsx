import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/customer/dashboard")({
  head: () => ({
    meta: [
      { title: "My dashboard — Pramāṇa" },
      {
        name: "description",
        content: "Track your identity verification status, documents, and next steps.",
      },
      { property: "og:title", content: "My dashboard — Pramāṇa" },
      {
        property: "og:description",
        content: "Track your identity verification status, documents, and next steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerDashboardRoute,
});

function CustomerDashboardRoute() {
  return <DemoPage page="customer-dashboard" />;
}
