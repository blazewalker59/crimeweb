#!/usr/bin/env bun
// PROTOTYPE — throwaway. Question: which approach resolves Media Items onto Cases?
// Ground truth hand-built by reading all 261 title+overview pairs.
import { findRelatedEpisodes } from "../../src/lib/matching/fuzzy";
import db from "../../data/episodes.json";
const eps = db.episodes as any[];
const byId = new Map(eps.map((e) => [e.id, e]));

// Cross-show case clusters, verified by reading. Each = one Case covered by 2+ Sources.
const TRUTH: [string, number[]][] = [
  ["Menendez brothers", [5737433, 5685850]],
  ["Leslie Preer / Chevy Chase", [6606752, 6526732]],
  ["Univ. of Idaho / Kohberger", [6220206, 6522407]],
  ["Karen Read", [6335979, 5684675, 6331815]],
  ["JonBenet Ramsey", [5743590, 5941311]],
  ["Kristil Krug", [6728257, 6512473]],
  ["Ashley Benefield / Black Swan", [6425705, 5743584]],
  ["Fabio Sementilli", [6126527, 6125877]],
  ["Nicholas Rossi", [5743586, 6864165]],
  ["Karen Swift / Halloween", [5720649, 5720648]],
];
const truthPairs = new Set<string>();
for (const [, ids] of TRUTH)
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      if (byId.get(ids[i])?.showName !== byId.get(ids[j])?.showName)
        truthPairs.add([ids[i], ids[j]].sort((x, y) => x - y).join("_"));

console.log(
  `GROUND TRUTH: ${TRUTH.length} cross-show cases -> ${truthPairs.size} cross-show pairs\n`,
);

for (const min of [0.3, 0.5, 0.65, 0.7]) {
  const proposed = new Set<string>();
  for (const ep of eps)
    for (const r of findRelatedEpisodes(ep, eps, {
      maxResults: 5,
      minScore: min,
      excludeSameShow: true,
    }))
      proposed.add([ep.id, r.episodeId].sort((x, y) => x - y).join("_"));
  const tp = [...proposed].filter((p) => truthPairs.has(p)).length;
  const prec = proposed.size ? ((100 * tp) / proposed.size).toFixed(0) : "0";
  const rec = ((100 * tp) / truthPairs.size).toFixed(0);
  console.log(
    `  minScore ${min}: proposed ${String(proposed.size).padStart(3)} | correct ${tp} | precision ${prec}% | recall ${rec}%`,
  );
}

// Within-show duplicates: identical title AND overview, different id
const seen = new Map<string, number[]>();
for (const e of eps) {
  const k = `${e.showName}::${(e.name || "").toLowerCase().trim()}`;
  seen.set(k, [...(seen.get(k) || []), e.id]);
}
const dupes = [...seen.entries()].filter(([, v]) => v.length > 1);
const dupeEps = dupes.reduce((n, [, v]) => n + v.length, 0);
console.log(
  `\nWITHIN-SHOW DUPLICATES: ${dupes.length} titles / ${dupeEps} episodes (${Math.round((100 * dupeEps) / eps.length)}% of catalogue)`,
);
const byShow: Record<string, number> = {};
for (const [k, v] of dupes) {
  const s = k.split("::")[0];
  byShow[s] = (byShow[s] || 0) + v.length;
}
console.log(" ", JSON.stringify(byShow));
