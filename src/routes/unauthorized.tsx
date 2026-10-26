import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Workspace unavailable — Pramāṇa" },
      {
        name: "description",
        content: "Your account does not have permission to view this workspace.",
      },
      { property: "og:title", content: "Workspace unavailable — Pramāṇa" },
      {
        property: "og:description",
        content: "Your account does not have permission to view this workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnauthorizedRoute,
});

function UnauthorizedRoute() {
  return <DemoPage page="unauthorized" />;
}
