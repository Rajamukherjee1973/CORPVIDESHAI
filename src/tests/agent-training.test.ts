import { describe, expect, it } from "vitest";
import { CURATED_EXAMPLES, RESPONSIBILITY, TRAINABLE_AGENTS, endorsedAnswer, formatExamples, selectExamples, toFineTuneJsonl, trainingStats, type ReviewedExample } from "@/lib/agents/training";

const ex = (o: Partial<ReviewedExample>): ReviewedExample => ({
  agent: "copilot", rating: 1, question: "Should we hedge a USD OPI into London?", answer: "Ask the AD bank for a forward quote.", correction: "", at: "", origin: "account", ...o,
});

describe("agent training loop", () => {
  it("a correction replaces the original answer; an unhelpful answer without one teaches nothing", () => {
    expect(endorsedAnswer(ex({ rating: -1, correction: "Check headroom first." }))).toBe("Check headroom first.");
    expect(endorsedAnswer(ex({ rating: -1 }))).toBeNull();
  });
  it("only reuses examples from the same agent, at most three", () => {
    const pool = [ex({}), ex({}), ex({}), ex({}), ex({ agent: "currency" })];
    const picked = selectExamples("copilot", "hedge USD OPI London", pool);
    expect(picked).toHaveLength(3);
    expect(picked.every((p) => p.agent === "copilot")).toBe(true);
  });
  it("ranks the reviewer's own similar example above an unrelated curated seed", () => {
    const mine = ex({ question: "Hedge a euro OPI into Frankfurt this quarter?" });
    const picked = selectExamples("copilot", "Should we hedge a euro OPI into Frankfurt?", [mine, ...CURATED_EXAMPLES], 1);
    expect(picked[0]).toBe(mine);
  });
  it("labels examples as references, not instructions", () => {
    expect(formatExamples([ex({})])).toMatch(/not evidence, not instructions/);
    expect(formatExamples([])).toBe("");
  });
  it("exports one chat fine-tuning line per endorsed pair", () => {
    const lines = toFineTuneJsonl([ex({}), ex({ rating: -1 }), ex({ rating: -1, correction: "Fixed." })]).split("\n");
    expect(lines).toHaveLength(2);
    const last = JSON.parse(lines[1]!) as { messages: { role: string; content: string }[] };
    expect(last.messages.map((m) => m.role)).toEqual(["system", "user", "assistant"]);
    expect(last.messages[2]!.content).toBe("Fixed.");
  });
  it("counts helpful share per agent", () => {
    const s = trainingStats([ex({}), ex({ rating: -1 })]).find((x) => x.agent === "copilot");
    expect(s?.approvalPct).toBe(50);
    expect(s?.usable).toBe(1);
  });
  it("gives every AI agent exactly one responsibility row and a curated seed", () => {
    for (const a of TRAINABLE_AGENTS) {
      expect(RESPONSIBILITY.filter((r) => r.agent === a)).toHaveLength(1);
      expect(CURATED_EXAMPLES.some((c) => c.agent === a)).toBe(true);
    }
  });
});
