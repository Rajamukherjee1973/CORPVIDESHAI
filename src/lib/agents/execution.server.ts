import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database, Json } from "@/integrations/supabase/types";
import { getSessionUser } from "@/lib/auth.server";
import { memoryContext } from "./execution";
import { outlookError } from "@/lib/currency-outlook.server";
import { auditedWork } from "@/lib/services/audited-work";
import { serviceOperation } from "@/lib/services/runtime.server";

export async function executionViewer() {
  const request = getRequest();
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const identityToken = request.headers.get("x-lovable-identity-token");
  if (identityToken) {
    const user = await getSessionUser();
    if (!user) throw new Error("The signed-in identity could not be verified.");
    return { userId: user.userId, client: createClient<Database>(url, key, {
      accessToken: async () => identityToken,
      auth: { persistSession: false, autoRefreshToken: false },
    }) };
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const client = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("The signed-in identity could not be verified.");
  return { userId: data.user.id, client };
}

export async function recentExecutions(viewer: Awaited<ReturnType<typeof executionViewer>>) {
  if (!viewer) return [];
  const { data, error } = await viewer.client.from("agent_execution_records")
    .select("id,agent,status,input_summary,context_summary,result,error_message,latency_ms,created_at")
    .eq("user_id", viewer.userId).order("created_at", { ascending: false }).limit(30);
  if (error) throw new Error("Private agent history could not be loaded.");
  return data ?? [];
}

export async function executeAgent<T>(
  agent: "statutory" | "copilot" | "document" | "currency" | "tool",
  inputSummary: string,
  work: (context: string, viewer: Awaited<ReturnType<typeof executionViewer>>) => Promise<T>,
  summarize: (result: T) => string,
  accepted: (result: T) => boolean = () => true,
) {
  return serviceOperation(`agents.${agent}`, async () => {
    const viewer = await executionViewer();
    const previous = await recentExecutions(viewer);
    return auditedWork({
      work: () => work(memoryContext(previous), viewer), summarize, accepted, safeError: outlookError,
      persist: async (outcome) => {
        if (!viewer) return;
        const record = outcome.status === "failed"
          ? { error_message: outcome.error }
          : { context_summary: outcome.summary, result: JSON.parse(JSON.stringify(outcome.result)) as Json };
        const { error } = await viewer.client.from("agent_execution_records").insert({
          user_id: viewer.userId, agent, status: outcome.status, input_summary: inputSummary.slice(0, 600),
          latency_ms: outcome.latencyMs, ...record,
        });
        if (error) throw new Error("Private audit write failed.");
      },
    });
  });
}