import { createFileRoute } from "@tanstack/react-router";
import { DemoPage } from "@/components/pramana/app-ui";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Pramāṇa" },
      {
        name: "description",
        content: "Sign in or create a secure Pramāṇa account.",
      },
      { property: "og:title", content: "Sign in — Pramāṇa" },
      {
        property: "og:description",
        content: "Sign in or create a secure Pramāṇa account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  return <DemoPage page="login" />;
}
