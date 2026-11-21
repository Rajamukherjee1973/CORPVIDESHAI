import { describe, expect, it } from "vitest";
import { buildWorkflowChain, investmentChecklist, verifyWorkflowChain, workflowDecision } from "@/lib/treasury-workflow";

const facts = { investment: "ODI" as const, investor: "listed" as const, netWorthCr: 100, existingExposureCr: 0, proposedCr: 100, activity: "operating" as const, denomination: "foreign" as const, nocRequired: false, nocAvailable: false, evidenceComplete: false };
describe("treasury clearance workflow", () => {
  it("requires every document before simulation", () => {
    const list = investmentChecklist("ODI", false);
    expect(workflowDecision(facts, list, []).canSimulate).toBe(false);
    expect(workflowDecision(facts, list, list.map((d) => d.id)).handoff).toBe("Automatic");
  });
  it("routes over-ceiling ODI to approval referral", () => {
    const list = investmentChecklist("ODI", false);
    expect(workflowDecision({ ...facts, proposedCr: 401 }, list, list.map((d) => d.id)).handoff).toBe("Approval");
  });
  it("blocks prohibited activity even with acknowledged documents", () => {
    const list = investmentChecklist("ODI", false);
    expect(workflowDecision({ ...facts, activity: "gambling" }, list, list.map((d) => d.id)).canSimulate).toBe(false);
  });
  it("detects altered hash-chain records", async () => {
    const chain = await buildWorkflowChain("packet", "Automatic");
    expect(chain).toHaveLength(10);
    expect(await verifyWorkflowChain(chain)).toBe(true);
    expect(await verifyWorkflowChain(chain.map((e, i) => i === 3 ? { ...e, action: "changed" } : e))).toBe(false);
  });
  it("binds the stated investment rationale to the demonstration proof", async () => {
    const packet = JSON.stringify({ company: "Infosys", amountCr: 950, rationale: "Acquire an operating overseas subsidiary" });
    const chain = await buildWorkflowChain(packet, "Automatic");
    const altered = chain.map((event) => ({ ...event, packet: event.packet.replace("Acquire an operating overseas subsidiary", "Purchase an unrelated investment") }));
    expect(await verifyWorkflowChain(chain)).toBe(true);
    expect(await verifyWorkflowChain(altered)).toBe(false);
  });
});