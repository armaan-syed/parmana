import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/customer/status")({
  head: () => ({
    meta: [
      { title: "Verification status — Pramāṇa" },
      {
        name: "description",
        content: "Track your verification request and see the latest review update.",
      },
      { property: "og:title", content: "Verification status — Pramāṇa" },
      {
        property: "og:description",
        content: "Track your verification request and see the latest review update.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerStatusRoute,
});

function CustomerStatusRoute() {
  return <DemoPage page="status" />;
}
