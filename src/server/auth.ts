import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createAuth } from "@/lib/auth";
import { normalizeHeaders } from "@/lib/headers";

export interface SignedInUser {
  id: string;
  email: string;
  name: string;
}

/**
 * The signed-in user, or null. Every allowlisted user has equal authority over
 * the case graph (ADR-0002), so there is no role to resolve — the id is here
 * because graph mutations are attributed to it.
 */
export const currentUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<SignedInUser | null> => {
    const session = await createAuth().api.getSession({
      headers: normalizeHeaders(getRequestHeaders()),
    });
    if (!session) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  },
);
