import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasSession } from "@/core/functions/session-functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    throw redirect({ to: (await hasSession()) ? "/dashboard" : "/auth/sign-in" });
  },
  component: () => null,
});
