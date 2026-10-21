import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Review overview — Pramāṇa" },
      { name: "description", content: "Monitor verification requests and reviewer activity." },
      { property: "og:title", content: "Review overview — Pramāṇa" },
      {
        property: "og:description",
        content: "Monitor verification requests and reviewer activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboardRoute,
});

function AdminDashboardRoute() {
  return <DemoPage page="admin-dashboard" />;
}
