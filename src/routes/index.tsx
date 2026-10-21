import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pramāṇa — Identity verification, made simpler" },
      {
        name: "description",
        content:
          "A clearer way to submit identity documents, compare key information, and bring human review into the verification process. Frontend demonstration with fictional records.",
      },
      { property: "og:title", content: "Pramāṇa — Identity verification, made simpler" },
      {
        property: "og:description",
        content:
          "A clearer way to submit identity documents, compare key information, and bring human review into the verification process.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingRoute,
});

function LandingRoute() {
  return <DemoPage page="landing" />;
}
