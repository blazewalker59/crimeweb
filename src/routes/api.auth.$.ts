import { createFileRoute } from "@tanstack/react-router";
import { createAuth } from "@/lib/auth";

// Catch-all mounting Better Auth's handler at /api/auth/*. The Google callback
// therefore lands on /api/auth/callback/google, which is the redirect URI
// registered in Google Cloud Console.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => createAuth().handler(request),
      POST: ({ request }) => createAuth().handler(request),
    },
  },
});
