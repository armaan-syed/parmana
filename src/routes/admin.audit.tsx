import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit history — Pramāṇa" },
      {
        name: "description",
        content: "A read-only record of simulated reviewer decisions and changes.",
      },
      { property: "og:title", content: "Audit history — Pramāṇa" },
      {
        property: "og:description",
        content: "A read-only record of simulated reviewer decisions and changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAuditRoute,
});

function AdminAuditRoute() {
  return <DemoPage page="audit" />;
}
