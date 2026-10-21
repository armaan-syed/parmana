import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/admin/requests/$id")({
  head: () => ({
    meta: [
      { title: "Verification request — Pramāṇa" },
      {
        name: "description",
        content: "Review field comparisons and record a simulated verification decision.",
      },
      { property: "og:title", content: "Verification request — Pramāṇa" },
      {
        property: "og:description",
        content: "Review field comparisons and record a simulated verification decision.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminRequestDetailRoute,
});

function AdminRequestDetailRoute() {
  const { id } = Route.useParams();
  return <DemoPage page="request-detail" id={id} />;
}
