import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PainelError } from "@/components/PainelError";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: () => <Outlet />,
  errorComponent: PainelError,
  notFoundComponent: () => <PainelError />,
});