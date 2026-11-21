import { afterEach, describe, expect, it, vi } from "vitest";
import { auditedWork } from "@/lib/services/audited-work";
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: vi.fn() }));
import { setResponseHeader } from "@tanstack/react-start/server";
import { serviceOperation } from "@/lib/services/runtime.server";
afterEach(() => vi.restoreAllMocks());
const errorMessage = (e: unknown) => e instanceof Error ? e.message : "Operation failed";
describe("backend execution reliability", () => {
  it("records exactly one accepted outcome and returns the original result", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const result = await auditedWork({ work: async () => ({ value: 7 }), summarize: () => "summary", accepted: () => true, safeError: errorMessage, persist });
    expect(result).toEqual({ value: 7 }); expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0]?.[0]).toMatchObject({ status: "completed", result: { value: 7 }, summary: "summary" });
  });
  it("never reruns model work or writes a misleading failed-model record when success persistence fails", async () => {
    const work = vi.fn().mockResolvedValue("generated"); const persist = vi.fn().mockRejectedValue(new Error("storage"));
    await expect(auditedWork({ work, summarize: String, accepted: () => true, safeError: errorMessage, persist })).rejects.toThrow("result was generated");
    expect(work).toHaveBeenCalledTimes(1); expect(persist).toHaveBeenCalledTimes(1); expect(persist.mock.calls[0]?.[0]?.status).toBe("completed");
  });
  it("preserves work failure and makes failure-audit loss explicit", async () => {
    const persist = vi.fn().mockRejectedValue(new Error("storage"));
    await expect(auditedWork({ work: async () => { throw new Error("Provider denied"); }, summarize: String, accepted: () => true, safeError: errorMessage, persist })).rejects.toThrow("Provider denied Private failure history could not be saved");
    expect(persist).toHaveBeenCalledTimes(1); expect(persist.mock.calls[0]?.[0]?.status).toBe("failed");
  });
  it("keeps rejected QA outcomes rejected", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    await auditedWork({ work: async () => "review", summarize: String, accepted: () => false, safeError: errorMessage, persist });
    expect(persist.mock.calls[0]?.[0]?.status).toBe("rejected");
  });
  it("adds a no-store correlation header without logging payloads", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const value = await serviceOperation("filings.test", async () => ({ privateData: "not-for-logs" }));
    expect(value.privateData).toBe("not-for-logs"); expect(setResponseHeader).toHaveBeenCalledWith("Cache-Control", "private, no-store");
    expect(log.mock.calls.flat().join("")).not.toContain("not-for-logs");
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({ operation: "filings.test", outcome: "returned" });
  });
  it("preserves error identity and does not retry failed operations", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = new Error("denied"); const work = vi.fn().mockRejectedValue(error);
    await expect(serviceOperation("denied", work)).rejects.toBe(error); expect(work).toHaveBeenCalledTimes(1);
  });
});