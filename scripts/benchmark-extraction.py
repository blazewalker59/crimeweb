#!/usr/bin/env python3
"""
Benchmark the LLM extraction pipeline against the hand-built ground truth
from issue #9 — the same 10 verified cross-source convergences the v1 fuzzy
matcher was measured on, so the numbers are directly comparable.

v1 baseline: 19% precision @ 55% recall, or 100% @ 18%. No usable operating point.

Usage: python3 scripts/benchmark-extraction.py [--remote]
"""
import json, subprocess, sys, collections

REMOTE = "--remote" in sys.argv
FLAG = "--remote" if REMOTE else "--local"

# Verified cross-source cases: TMDb episode ids, which media_items.id is `mi_<id>`.
TRUTH = {
    "Menendez brothers":            [5737433, 5685850],
    "Leslie Preer / Chevy Chase":   [6606752, 6526732],
    "Univ. of Idaho / Kohberger":   [6220206, 6522407],
    "Karen Read":                   [6335979, 5684675, 6331815],
    "JonBenet Ramsey":              [5743590, 5941311],
    "Kristil Krug":                 [6728257, 6512473],
    "Ashley Benefield / Black Swan":[6425705, 5743584],
    "Fabio Sementilli":             [6126527, 6125877],
    "Nicholas Rossi":               [5743586, 6864165],
    "Karen Swift / Halloween":      [5720649, 5720648],
}

def q(sql):
    out = subprocess.run(
        ["npx","wrangler","d1","execute","crimeweb-db",FLAG,"--command",sql,"--json"],
        capture_output=True, text=True, timeout=180)
    try:
        return json.loads(out.stdout)[0]["results"]
    except Exception:
        start = out.stdout.find("[")
        return json.loads(out.stdout[start:])[0]["results"]

rows = q("""SELECT m.tmdb_id AS tmdb, cv.case_id AS case_id, s.name AS src
            FROM coverage cv
            JOIN media_items m ON m.id = cv.media_item_id
            JOIN sources s ON s.id = m.source_id""")
case_of = {int(r["tmdb"]): r["case_id"] for r in rows}
src_of  = {int(r["tmdb"]): r["src"] for r in rows}

# System's convergences: cases covered by 2+ distinct Sources.
by_case = collections.defaultdict(set)
for t, c in case_of.items():
    by_case[c].add(src_of[t])
system_converged = {c for c, srcs in by_case.items() if len(srcs) > 1}

def pairs(ids):
    return [(a, b) for i, a in enumerate(ids) for b in ids[i+1:]
            if src_of.get(a) and src_of.get(b) and src_of[a] != src_of[b]]

truth_pairs, found, missing, absent = set(), [], [], []
for name, ids in TRUTH.items():
    present = [i for i in ids if i in case_of]
    if len(present) < 2:
        absent.append((name, len(present), len(ids)))
        continue
    ps = pairs(present)
    if not ps:
        absent.append((name, len(present), len(ids)))
        continue
    truth_pairs.update(ps)
    same = [p for p in ps if case_of[p[0]] == case_of[p[1]]]
    (found if same else missing).append(name)

# System-produced cross-source pairs.
sys_pairs = set()
for c in system_converged:
    ids = [t for t, cc in case_of.items() if cc == c]
    for i, a in enumerate(ids):
        for b in ids[i+1:]:
            if src_of[a] != src_of[b]:
                sys_pairs.add(tuple(sorted((a, b))))

tp = len({tuple(sorted(p)) for p in truth_pairs} & sys_pairs)
prec = 100*tp/len(sys_pairs) if sys_pairs else 0
rec  = 100*tp/len(truth_pairs) if truth_pairs else 0

print(f"extracted media items with coverage : {len(case_of)}")
print(f"ground-truth cases testable         : {len(found)+len(missing)} of {len(TRUTH)}")
print(f"  (not yet ingested/extracted       : {len(absent)})")
print()
print(f"system cross-source pairs produced  : {len(sys_pairs)}")
print(f"ground-truth cross-source pairs     : {len(truth_pairs)}")
print(f"correct                             : {tp}")
print()
print(f"PRECISION : {prec:.0f}%   (v1 baseline: 19%)")
print(f"RECALL    : {rec:.0f}%   (v1 baseline: 55% at that precision)")
print()
if found:   print("resolved correctly:", ", ".join(found))
if missing: print("missed:", ", ".join(missing))
if absent:  print("not testable:", ", ".join(f"{n} ({p}/{t} present)" for n,p,t in absent))
