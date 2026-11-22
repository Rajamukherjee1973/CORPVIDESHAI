/**
 * Managed-deployment entry points declared in `langgraph.json`.
 *
 * NOTE: "statutory" is the statutory subgraph alone; "mesh" is the full agent
 * mesh that dispatches to all four AI agents. The app runs the same compiled
 * graphs in-process; a managed LangGraph deployment is not connected.
 */
import { buildGraph } from "@/lib/agents/graph.server";
export { makeMeshGraph } from "@/lib/agents/mesh.server";

export function makeDeployedGraph() {
  if (!process.env["LOVABLE_API_KEY"]) throw new Error("The statutory graph is not configured.");
  return buildGraph();
}

export default makeDeployedGraph;
