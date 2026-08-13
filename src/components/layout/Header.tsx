/**
 * Header — the app's only navigation.
 *
 * v2 added five routes and none of them were reachable except by typing the
 * URL. Every route here is auth-gated, so the links render regardless of
 * session and a signed-out visitor simply lands on /signin.
 */
import { Link } from "@tanstack/react-router";
import { GitMerge, Inbox, Layers, ListOrdered, Search } from "lucide-react";

const NAV = [
  { to: "/", label: "Timeline", icon: ListOrdered, exact: true },
  { to: "/cases", label: "Cases", icon: Layers },
  { to: "/review", label: "Review", icon: Inbox },
  { to: "/merge", label: "Merge", icon: GitMerge },
  { to: "/search", label: "Search", icon: Search },
] as const;

export function Header() {
  return (
    <header className="bg-crime-dark border-b border-crime-elevated sticky top-0 z-50 pt-safe">
      <div className="h-0.5 bg-gradient-to-r from-transparent via-blood to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link to="/" className="flex shrink-0 items-center group">
            <span className="text-blood-light text-2xl font-bold tracking-tight group-hover:text-blood-glow transition-colors">
              Crime<span className="text-chalk">Web</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon, ...rest }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: "exact" in rest && rest.exact }}
                activeProps={{ className: "bg-crime-elevated text-chalk" }}
                inactiveProps={{ className: "text-chalk-muted hover:text-chalk" }}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
