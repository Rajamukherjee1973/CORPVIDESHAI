import { setResponseHeader } from "@tanstack/react-start/server";

/** Request-local telemetry only. No payloads, identities, credentials, timers or automatic retries. */
export async function serviceOperation<T>(operation: string, work: () => Promise<T>): Promise<T> {
  const traceId = crypto.randomUUID();
  const started = Date.now();
  setResponseHeader("X-CorpVidesh-Trace-ID", traceId);
  setResponseHeader("Cache-Control", "private, no-store");
  try {
    const result = await work();
    console.info(JSON.stringify({ event: "service-operation", operation, traceId, durationMs: Date.now() - started, outcome: "returned" }));
    return result;
  } catch (error) {
    console.warn(JSON.stringify({ event: "service-operation", operation, traceId, durationMs: Date.now() - started, outcome: "threw" }));
    throw error;
  }
}