// PROTOTYPE — throwaway. Delete with the prototype routes.
//
// Seed data for the v2 surface prototypes. Built from the real ground truth
// established in issue #9: the 10 verified cross-source convergences in
// data/episodes.json, plus representative single-source and provisional cases.
//
// Shapes follow docs/v2-schema.md. Heat is precomputed here rather than derived,
// because the prototypes are about layout, not scoring.

export interface FixtureCoverage {
  id: string;
  sourceName: string;
  sourceKind: "network" | "streamer";
  title: string;
  releasedAt: string; // ISO date
  viewed: boolean;
  confidence: number | null;
  provenance: "llm" | "human" | "import";
  status: "proposed" | "confirmed" | "rejected";
}

export interface FixtureCase {
  id: string;
  displayTitle: string;
  summary: string | null;
  location: string | null;
  occurredYear: number | null;
  isProvisional: boolean;
  wikidataQid: string | null;
  heat: number;
  lastCoverageAt: string;
  sourceCount90d: number;
  coverage: FixtureCoverage[];
}

const c = (
  id: string,
  sourceName: string,
  sourceKind: "network" | "streamer",
  title: string,
  releasedAt: string,
  viewed = false,
  confidence: number | null = null,
  status: FixtureCoverage["status"] = "confirmed",
  provenance: FixtureCoverage["provenance"] = "llm",
): FixtureCoverage => ({
  id,
  sourceName,
  sourceKind,
  title,
  releasedAt,
  viewed,
  confidence,
  provenance,
  status,
});

export const CASES: FixtureCase[] = [
  {
    id: "case_sementilli",
    displayTitle: "Murder of Fabio Sementilli",
    summary:
      "A celebrity hairdresser is killed in the backyard of his Woodland Hills home. A security camera and a wife's account do not agree.",
    location: "Woodland Hills, California",
    occurredYear: 2017,
    isProvisional: false,
    wikidataQid: null,
    heat: 94,
    lastCoverageAt: "2025-04-11",
    sourceCount90d: 2,
    coverage: [
      c("cov_1", "20/20", "network", "Sex, Knives, and Videotape", "2025-04-11"),
      c("cov_2", "Dateline", "network", "The Widow of Woodland Hills", "2025-04-11"),
    ],
  },
  {
    id: "case_idaho",
    displayTitle: "University of Idaho student murders",
    summary:
      "Four University of Idaho students are killed in an off-campus house on King Road. Bryan Kohberger is later charged.",
    location: "Moscow, Idaho",
    occurredYear: 2022,
    isProvisional: false,
    wikidataQid: "Q115304872",
    heat: 88,
    lastCoverageAt: "2025-09-05",
    sourceCount90d: 2,
    coverage: [
      c("cov_3", "Dateline", "network", "The Terrible Night on King Road", "2025-05-09", true),
      c("cov_4", "20/20", "network", "Idaho Justice", "2025-09-05"),
    ],
  },
  {
    id: "case_preer",
    displayTitle: "Murder of Leslie Preer",
    summary:
      "A wife and mother is found killed in her Chevy Chase home. The case goes unsolved for two decades until genetic genealogy identifies a suspect.",
    location: "Chevy Chase, Maryland",
    occurredYear: 2001,
    isProvisional: false,
    wikidataQid: null,
    heat: 81,
    lastCoverageAt: "2025-10-17",
    sourceCount90d: 2,
    coverage: [
      c("cov_5", "Dateline", "network", "A Perfect Spring Morning", "2025-09-12"),
      c("cov_6", "20/20", "network", "First Comes Love, Then Comes Murder", "2025-10-17"),
    ],
  },
  {
    id: "case_krug",
    displayTitle: "Murder of Kristil Krug",
    summary: "A stalker sends menacing messages to a young mother of three before she is murdered.",
    location: null,
    occurredYear: null,
    isProvisional: false,
    wikidataQid: null,
    heat: 76,
    lastCoverageAt: "2025-11-15",
    sourceCount90d: 2,
    coverage: [
      c("cov_7", "48 Hours", "network", "The Setup Murder of Kristil Krug", "2025-09-26"),
      c("cov_8", "20/20", "network", "He's Right Behind You", "2025-11-15"),
    ],
  },
  {
    id: "case_menendez",
    displayTitle: "Menendez brothers",
    summary:
      "Jose and Kitty Menendez are killed in their Beverly Hills home by their sons Lyle and Erik. A resentencing three decades later reopens the case.",
    location: "Beverly Hills, California",
    occurredYear: 1989,
    isProvisional: false,
    wikidataQid: "Q6003257",
    heat: 62,
    lastCoverageAt: "2024-11-08",
    sourceCount90d: 2,
    coverage: [
      c(
        "cov_9",
        "20/20",
        "network",
        "The Menendez Brothers: Reversal of Fortune?",
        "2024-10-18",
        true,
      ),
      c(
        "cov_10",
        "Dateline",
        "network",
        "The Menendez Brothers: Chance at Freedom",
        "2024-11-08",
        true,
      ),
    ],
  },
  {
    id: "case_read",
    displayTitle: "Karen Read case",
    summary:
      "A Boston police officer is found dead in the snow outside a Canton home. His girlfriend is tried twice.",
    location: "Canton, Massachusetts",
    occurredYear: 2022,
    isProvisional: false,
    wikidataQid: null,
    heat: 58,
    lastCoverageAt: "2025-06-19",
    sourceCount90d: 2,
    coverage: [
      c("cov_11", "Dateline", "network", "The Night of the Nor'easter", "2024-10-18", true),
      c("cov_12", "20/20", "network", "Karen Read: The Verdict", "2025-06-18"),
      c("cov_13", "Dateline", "network", "Center of the Storm", "2025-06-19"),
    ],
  },
  {
    id: "case_markel",
    displayTitle: "Murder of Dan Markel",
    summary:
      "A Florida State University law professor is shot in his garage in a murder-for-hire arranged through his ex-wife's family.",
    location: "Tallahassee, Florida",
    occurredYear: 2014,
    isProvisional: false,
    wikidataQid: "Q20899731",
    heat: 41,
    lastCoverageAt: "2025-12-05",
    sourceCount90d: 1,
    coverage: [c("cov_14", "Dateline", "network", "Deadly Mischief", "2025-12-05")],
  },
  {
    id: "case_tibbetts",
    displayTitle: "Murder of Mollie Tibbetts",
    summary:
      "A University of Iowa student disappears while jogging near her home in Brooklyn, Iowa.",
    location: "Brooklyn, Iowa",
    occurredYear: 2018,
    isProvisional: false,
    wikidataQid: "Q56276926",
    heat: 34,
    lastCoverageAt: "2025-11-21",
    sourceCount90d: 1,
    coverage: [c("cov_15", "Dateline", "network", "The Last Mile", "2025-11-21", true)],
  },
  {
    id: "case_prov_ride",
    displayTitle: "Woman shot outside her workplace",
    summary: null,
    location: null,
    occurredYear: null,
    isProvisional: true,
    wikidataQid: null,
    heat: 29,
    lastCoverageAt: "2026-01-16",
    sourceCount90d: 1,
    coverage: [
      c("cov_16", "20/20", "network", "Ride or Die", "2026-01-16", false, 0.41, "proposed"),
    ],
  },
  {
    id: "case_prov_coach",
    displayTitle: "Softball coach murder-for-hire",
    summary: null,
    location: null,
    occurredYear: null,
    isProvisional: true,
    wikidataQid: null,
    heat: 22,
    lastCoverageAt: "2026-01-09",
    sourceCount90d: 1,
    coverage: [
      c("cov_17", "48 Hours", "network", "Coached to Kill", "2026-01-09", false, 0.38, "proposed"),
    ],
  },
];

/** Sub-threshold links awaiting a human, ordered by what most needs review. */
export const REVIEW_QUEUE = [
  {
    id: "rev_1",
    kind: "coverage" as const,
    confidence: 0.62,
    mediaTitle: "The Final Cut",
    mediaSource: "20/20",
    mediaOverview:
      "A beloved hairstylist vanishes without a trace, launching a multistate investigation that ultimately ends in a shocking discovery.",
    proposedCaseTitle: "Murder of Fabio Sementilli",
    proposedCaseId: "case_sementilli",
    why: "Both involve a hairstylist. Different circumstances — this victim vanished; Sementilli was killed at home.",
  },
  {
    id: "rev_2",
    kind: "duplicate" as const,
    confidence: 0.94,
    mediaTitle: "Chain Reaction",
    mediaSource: "The First 48",
    mediaOverview:
      "A young father loses his life when tempers flare and bullets fly at a Gwinnett County nightclub.",
    proposedCaseTitle: "Chain Reaction (S25E7)",
    proposedCaseId: "dup_chain_reaction",
    why: "Same source, near-identical overview with reordered wording. Likely a re-air.",
  },
  {
    id: "rev_3",
    kind: "coverage" as const,
    confidence: 0.55,
    mediaTitle: "The Ruse",
    mediaSource: "Dateline",
    mediaOverview:
      "When a California father fails to return home after a quick trip to check his mail, his son calls police.",
    proposedCaseTitle: "Woman shot outside her workplace",
    proposedCaseId: "case_prov_ride",
    why: "Weak match. No named person in either item; both are provisional.",
  },
  {
    id: "rev_4",
    kind: "merge" as const,
    confidence: 0.71,
    mediaTitle: "Softball coach murder-for-hire",
    mediaSource: "—",
    mediaOverview:
      "Two provisional cases minted from 48 Hours episodes describing the same softball coach murder-for-hire.",
    proposedCaseTitle: "Coached To Kill (S38E33)",
    proposedCaseId: "case_prov_coach",
    why: "Both describe a high school softball coach recruiting a former player. One is billed as a preview of the other.",
  },
  {
    id: "rev_5",
    kind: "enrichment" as const,
    confidence: 0.48,
    mediaTitle: "Sydney Powell",
    mediaSource: "Snapped",
    mediaOverview:
      "A beloved health care worker is viciously attacked in her home with only her daughter as a witness.",
    proposedCaseTitle: "Wikipedia: Sidney Powell",
    proposedCaseId: "wiki_sidney_powell",
    why: "Name-similarity match to a living attorney. Almost certainly wrong — this is the false-positive class measured at 44%.",
  },
];
