import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/customer/submit")({
  head: () => ({
    meta: [
      { title: "Submit documents — Pramāṇa" },
      {
        name: "description",
        content: "Add Aadhaar and Voter ID to start a simulated verification review.",
      },
      { property: "og:title", content: "Submit documents — Pramāṇa" },
      {
        property: "og:description",
        content: "Add Aadhaar and Voter ID to start a simulated verification review.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerSubmitRoute,
});

function CustomerSubmitRoute() {
  return <DemoPage page="submit" />;
}
