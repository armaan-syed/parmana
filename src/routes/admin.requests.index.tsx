import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/admin/requests/")({
  head: () => ({
    meta: [
      { title: "Request queue — Pramāṇa" },
      {
        name: "description",
        content: "Search and review submitted identity verification requests.",
      },
      { property: "og:title", content: "Request queue — Pramāṇa" },
      {
        property: "og:description",
        content: "Search and review submitted identity verification requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminRequestsRoute,
});

function AdminRequestsRoute() {
  return <DemoPage page="requests" />;
}
