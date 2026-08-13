import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, ShieldAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { currentUser } from "@/server/auth";

export const Route = createFileRoute("/signin")({
  loader: async () => ({ user: await currentUser() }),
  component: SignIn,
});

function SignIn() {
  const { user } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-chalk">Signed in</h1>
        <p className="mt-2 text-chalk-muted">{user.email}</p>
        <button
          onClick={async () => {
            await authClient.signOut();
            await router.invalidate();
          }}
          className="mt-6 rounded-lg bg-crime-elevated px-4 py-2 text-sm font-medium text-chalk hover:bg-white/10 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-chalk">Sign in to CrimeWeb</h1>
      <p className="mt-2 text-chalk-muted">
        CrimeWeb is invite-only. Sign in with the Google account on the invite list.
      </p>
      <button
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void authClient.signIn.social({ provider: "google", callbackURL: "/signin" });
        }}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blood px-5 py-3 font-semibold text-chalk hover:bg-blood-light transition-colors disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" />
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      <p className="mt-8 flex items-start gap-2 text-left text-xs text-chalk-dim">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          The invite list is checked after Google authenticates you. An account that is not on it is
          rejected at that point and no user record is created.
        </span>
      </p>
    </div>
  );
}
