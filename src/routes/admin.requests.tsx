import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for /admin/requests and /admin/requests/$id.
export const Route = createFileRoute("/admin/requests")({
  component: AdminRequestsLayout,
});

function AdminRequestsLayout() {
  return <Outlet />;
}
