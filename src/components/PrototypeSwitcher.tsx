// PROTOTYPE — throwaway. Delete along with the prototype routes.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

interface Props {
  variants: { key: string; name: string }[];
  current: string;
  onChange: (key: string) => void;
}

/**
 * Floating variant switcher for UI prototypes. Deliberately high-contrast so it
 * reads as scaffolding rather than part of the design being judged.
 */
export function PrototypeSwitcher({ variants, current, onChange }: Props) {
  const i = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );
  const go = (delta: number) =>
    onChange(variants[(i + delta + variants.length) % variants.length].key);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full bg-tape text-crime-black shadow-2xl shadow-black/60 ring-2 ring-crime-black/40 px-1.5 py-1.5">
      <button
        onClick={() => go(-1)}
        aria-label="Previous variant"
        className="rounded-full p-1.5 hover:bg-crime-black/15 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-2 text-xs font-bold tracking-wide tabular-nums whitespace-nowrap">
        {variants[i].key} — {variants[i].name}
        <span className="ml-2 font-medium opacity-60">
          {i + 1}/{variants.length} · ←/→
        </span>
      </span>
      <button
        onClick={() => go(1)}
        aria-label="Next variant"
        className="rounded-full p-1.5 hover:bg-crime-black/15 transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
