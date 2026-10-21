import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Workspace unavailable — Pramāṇa" },
      { name: "description", content: "Sign in with the appropriate demo role to continue." },
      { property: "og:title", content: "Workspace unavailable — Pramāṇa" },
      {
        property: "og:description",
        content: "Sign in with the appropriate demo role to continue.",
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
