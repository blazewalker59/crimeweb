import { describe, expect, it } from "vitest";
import { normName, normTitle, parseExtraction } from "@/server/ingest/parse";

describe("normName", () => {
  it("lowercases and trims", () => {
    expect(normName("  Leslie   Preer ")).toBe("leslie preer");
  });

  it("strips punctuation", () => {
    expect(normName("Lyle Menendez, Jr.")).toBe("lyle menendez jr");
  });

  // Regression: an earlier `[^a-z\s]` deleted accented letters, so
  // "JonBenét Ramsey" became "jonbent ramsey" and never matched the SQL side's
  // lower(name) = "jonbenét ramsey". Extraction therefore minted two separate
  // Cases for the same victim.
  it("keeps accented letters so they still match lower(name) in SQL", () => {
    expect(normName("JonBenét Ramsey")).toBe("jonbenét ramsey");
    expect(normName("JonBenét Ramsey")).toBe("JonBenét Ramsey".toLowerCase());
  });

  it("keeps non-latin letters", () => {
    expect(normName("Søren Nyborg")).toBe("søren nyborg");
  });
});

describe("normTitle", () => {
  it("collapses punctuation so within-source duplicates match", () => {
    expect(normTitle("Gun Runner/In a Flash")).toBe(
      normTitle("Gun Runner and In a Flash").replace(" and ", " "),
    );
    expect(normTitle("Coached To Kill")).toBe(normTitle("Coached to Kill"));
  });
});

describe("parseExtraction", () => {
  const valid = JSON.stringify({
    caseTitle: "Murder of Jane Doe",
    victims: ["Jane Doe"],
    perpetrators: [],
    location: "Springfield",
    year: 2011,
    confidence: 0.9,
  });

  // Workers AI response shape varies by model: llama-4-scout returns
  // OpenAI-style choices[0].message.content, others return { response }.
  it("reads the OpenAI-style shape", () => {
    const out = parseExtraction({ choices: [{ message: { content: valid } }] });
    expect(out?.caseTitle).toBe("Murder of Jane Doe");
    expect(out?.victims).toEqual(["Jane Doe"]);
  });

  it("reads the { response } shape", () => {
    expect(parseExtraction({ response: valid })?.year).toBe(2011);
  });

  it("reads a bare string", () => {
    expect(parseExtraction(valid)?.confidence).toBe(0.9);
  });

  // A malformed response must fail, not be salvaged — guessing is how a wrong
  // link reaches a graph that has no moderation.
  it("returns null rather than guessing at malformed output", () => {
    expect(parseExtraction("not json")).toBeNull();
    expect(parseExtraction({ response: "{}" })).toBeNull();
    expect(parseExtraction({ response: '{"caseTitle":""}' })).toBeNull();
    expect(parseExtraction(null)).toBeNull();
  });

  it("clamps confidence and rejects implausible years", () => {
    const odd = JSON.stringify({
      caseTitle: "X",
      victims: [],
      perpetrators: [],
      location: null,
      year: 12,
      confidence: 5,
    });
    const out = parseExtraction(odd);
    expect(out?.confidence).toBe(1);
    expect(out?.year).toBeNull();
  });
});
