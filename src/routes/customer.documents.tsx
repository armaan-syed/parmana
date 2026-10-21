import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/customer/documents")({
  head: () => ({
    meta: [
      { title: "My documents — Pramāṇa" },
      {
        name: "description",
        content: "Review the documents associated with your identity verification.",
      },
      { property: "og:title", content: "My documents — Pramāṇa" },
      {
        property: "og:description",
        content: "Review the documents associated with your identity verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerDocumentsRoute,
});

function CustomerDocumentsRoute() {
  return <DemoPage page="documents" />;
}
