import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Pramāṇa" },
      { name: "description", content: "Fictional reviewer account information for this demo." },
      { property: "og:title", content: "My profile — Pramāṇa" },
      {
        property: "og:description",
        content: "Fictional reviewer account information for this demo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminProfileRoute,
});

function AdminProfileRoute() {
  return <DemoPage page="admin-profile" />;
}
