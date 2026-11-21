/**
 * Managed-deployment entry point for the statutory graph.
 *
 * LangGraph Platform (LangGraph Cloud) reads `langgraph.json`, imports this
 * factory and hosts the compiled graph behind a managed assistant endpoint with
 * its own task queue, autoscaling and persistence. The same compiled graph runs
 * in-process inside the app, so a run executed on the desk and a run executed
 * on the managed deployment are byte-for-byte the same topology.
 */

import { buildGraph } from "@/lib/agents/graph.server";

export function makeDeployedGraph() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("The statutory graph is not configured.");
  return buildGraph(key);
}

export default makeDeployedGraph;
