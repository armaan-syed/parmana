import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Pramāṇa" },
      { name: "description", content: "Customer directory and latest verification status." },
      { property: "og:title", content: "Customers — Pramāṇa" },
      { property: "og:description", content: "Customer directory and latest verification status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCustomersRoute,
});

function AdminCustomersRoute() {
  return <DemoPage page="customers" />;
}
