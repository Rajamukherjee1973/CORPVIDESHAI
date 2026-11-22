import { createServerFn } from "@tanstack/react-start";
import { FeedbackInput } from "@/lib/agents/training";

/**
 * Saves one reviewer rating to the signed-in person's own training notebook.
 * Guests get `saved: false` and keep the rating in their browser instead; no
 * rating is ever shared with another account.
 */
export const rateAgentAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => FeedbackInput.parse(input))
  .handler(async ({ data }) => {
    const { executionViewer } = await import("@/lib/agents/execution.server");
    const { serviceOperation } = await import("@/lib/services/runtime.server");
    return serviceOperation("agents.training.rate", async () => {
      let viewer;
      try { viewer = await executionViewer(); } catch { viewer = null; }
      if (!viewer) return { saved: false as const, scope: "browser" as const };
      const { error } = await viewer.client.from("agent_feedback").insert({
        user_id: viewer.userId, agent: data.agent, rating: data.rating,
        question: data.question, answer: data.answer, correction: data.correction,
      });
      if (error) throw new Error("Your rating could not be saved to your account.");
      return { saved: true as const, scope: "account" as const };
    });
  });

/** The signed-in person's own ratings, newest first, for the training tab and dataset export. */
export const listTrainingFeedback = createServerFn({ method: "GET" }).handler(async () => {
  const { executionViewer } = await import("@/lib/agents/execution.server");
  const { serviceOperation } = await import("@/lib/services/runtime.server");
  return serviceOperation("agents.training.list", async () => {
    let viewer;
    try { viewer = await executionViewer(); } catch { viewer = null; }
    if (!viewer) return { verified: false as const, rows: [] };
    const { data, error } = await viewer.client.from("agent_feedback")
      .select("id,agent,rating,question,answer,correction,created_at")
      .eq("user_id", viewer.userId).order("created_at", { ascending: false }).limit(300);
    if (error) throw new Error("Your training notebook could not be loaded.");
    return { verified: true as const, rows: data ?? [] };
  });
});
