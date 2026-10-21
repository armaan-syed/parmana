import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/customer/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Pramāṇa" },
      { name: "description", content: "Fictional customer account information for this demo." },
      { property: "og:title", content: "My profile — Pramāṇa" },
      {
        property: "og:description",
        content: "Fictional customer account information for this demo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerProfileRoute,
});

function CustomerProfileRoute() {
  return <DemoPage page="customer-profile" />;
}
