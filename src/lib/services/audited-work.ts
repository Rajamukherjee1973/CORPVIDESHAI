export type AuditOutcome<T> =
  | { status: "completed" | "rejected"; result: T; summary: string; latencyMs: number }
  | { status: "failed"; error: string; latencyMs: number };

/** A successful model run is never repeated just because its audit write failed. */
export async function auditedWork<T>(options: {
  work: () => Promise<T>;
  summarize: (result: T) => string;
  accepted: (result: T) => boolean;
  safeError: (error: unknown) => string;
  persist: (outcome: AuditOutcome<T>) => Promise<void>;
}) {
  const started = Date.now();
  let result: T;
  try {
    result = await options.work();
  } catch (error) {
    const message = options.safeError(error);
    try {
      await options.persist({ status: "failed", error: message, latencyMs: Date.now() - started });
    } catch {
      throw new Error(`${message} Private failure history could not be saved. No automatic retry was performed.`);
    }
    throw new Error(message);
  }
  try {
    await options.persist({ status: options.accepted(result) ? "completed" : "rejected", result, summary: options.summarize(result).slice(0, 1400), latencyMs: Date.now() - started });
  } catch {
    throw new Error("The result was generated, but private history could not be saved. No external action was taken. No automatic retry was performed.");
  }
  return result;
}