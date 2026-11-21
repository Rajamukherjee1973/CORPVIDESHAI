import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { executeReadTool, integrationStatus } from "@/lib/agent-integration.functions";
import { HUB_MARKETS } from "@/data/exchanges";
import { logAgentRun } from "@/lib/agent-session";

export function AgentIntegration({ compact = false }: { compact?: boolean } = {}) {
  const statusFn = useServerFn(integrationStatus);
  const callFn = useServerFn(executeReadTool);
  const [state, setState] = useState<Awaited<ReturnType<typeof integrationStatus>> | null>(null);
  const [tool, setTool] = useState<"fx.rate" | "market.quote" | "statute.search" | "ledger.read" | "ledger.stamp" | "filing.submit">("fx.rate");
  const [query, setQuery] = useState("FEMA overseas investment reporting");
  const [code, setCode] = useState("USD");
  const [symbol, setSymbol] = useState("^NSEI");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<unknown>(null);
  async function refresh() {
    try { setState(await statusFn()); }
    catch (e) { setError(e instanceof Error ? e.message : "Connection status unavailable."); }
  }
  useEffect(() => { void refresh(); }, []);
  async function execute() {
    setBusy(true); setError(""); setOutput(null);
    const t0 = performance.now();
    try {
      const result = await callFn({ data: { name: tool, code, symbol, query } });
      logAgentRun("tools", performance.now() - t0, result.ok);
      if (result.ok) setOutput(result.output); else setError(result.error);
      await refresh();
    } catch (e) { logAgentRun("tools", performance.now() - t0, false); setError(e instanceof Error ? e.message : "The function could not complete."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Backend integration" className={compact ? "" : "border-t-2 border-primary py-6"}>
    <div className="flex items-start justify-between gap-4"><div><p className="font-mono-ui text-xs uppercase text-primary">Connected execution · private evidence</p>{compact ? null : <h2 className="font-display mt-2 text-3xl">One handoff. One accountable record.</h2>}</div><Button variant="outline" size="icon" aria-label="Refresh integration status" onClick={() => void refresh()}><RefreshCw /></Button></div>
    <div className={`${compact ? "mt-3" : "mt-6"} grid gap-px bg-rule/15 sm:grid-cols-2 lg:grid-cols-4`}>{[
      ["AI functions", state ? state.aiConfigured ? "Configured · four agent entry points" : "Not configured" : "Checking…"],
      ["Private run history", state?.verified ? `${state.history.length} saved outcomes · verified identity` : "Public demonstration · no anonymous inputs stored"],
      ["Licensed FX", state?.licensedFxConfigured ? "Adapter configured · verify provider response" : "Public provider feeds · licensed access pending"],
      ["External approvals", "Not connected · filings and regulator lanes remain simulations"],
    ].map(([label, value]) => <div key={label} className="bg-background p-4"><p className="font-mono-ui text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-2 text-sm">{value}</p></div>)}</div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs text-muted-foreground">Server function<select aria-label="Connected server function" className="mt-2 h-10 w-full border border-border bg-background px-3 text-foreground" value={tool} onChange={(e) => setTool(e.target.value as typeof tool)}><option value="fx.rate">FX provider snapshot</option><option value="market.quote">Hub market quote</option><option value="statute.search">Statutory retrieval</option><option value="ledger.read">Private agent records</option><option value="ledger.stamp">Ledger mutation · not connected</option><option value="filing.submit">Official filing · not connected</option></select></label>
      {tool === "market.quote" ? <label className="text-xs text-muted-foreground">Market index<select aria-label="Tool market index" className="mt-2 h-10 w-full border border-border bg-background px-3 text-foreground" value={symbol} onChange={(e) => setSymbol(e.target.value)}>{HUB_MARKETS.filter((h) => h.symbol).map((h) => <option key={h.city} value={h.symbol ?? ""}>{h.city} · {h.index}</option>)}</select></label> : tool === "statute.search" ? <label className="text-xs text-muted-foreground">Evidence query<input aria-label="Tool evidence query" className="mt-2 h-10 w-full border border-border bg-background px-3 text-foreground" value={query} onChange={(e) => setQuery(e.target.value)} /></label> : <label className="text-xs text-muted-foreground">Currency<select aria-label="Tool currency" className="mt-2 h-10 w-full border border-border bg-background px-3 text-foreground" value={code} onChange={(e) => setCode(e.target.value)}>{["USD", "SGD", "EUR", "GBP", "JPY", "CHF"].map((c) => <option key={c}>{c}</option>)}</select></label>}
      <Button className="self-end" disabled={busy} onClick={() => void execute()}><Activity />{busy ? "Running…" : "Run connected function"}</Button>
    </div>
    {error && <p role="alert" className="mt-4 border-l-2 border-destructive pl-4 text-sm text-destructive">{error}</p>}
    {output !== null && <pre aria-label="Connected function result" className="mt-4 max-h-80 overflow-auto border-y border-rule/20 py-4 font-mono-ui text-xs leading-relaxed">{JSON.stringify(output, null, 2)}</pre>}
    {state?.verified && <div className="mt-6"><p className="font-mono-ui text-xs uppercase text-primary">Private execution history</p><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{["Time", "Agent", "Outcome", "Handoff", "Latency"].map((h) => <th key={h} className="border-b border-border py-2 pr-4 font-normal text-muted-foreground">{h}</th>)}</tr></thead><tbody>{state.history.map((r) => <tr key={r.id}><td className="border-b border-rule/15 py-3 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td><td className="border-b border-rule/15 py-3 pr-4">{r.agent}</td><td className="border-b border-rule/15 py-3 pr-4">{r.status}</td><td className="border-b border-rule/15 py-3 pr-4">{r.error_message ?? r.context_summary}</td><td className="border-b border-rule/15 py-3 whitespace-nowrap">{r.latency_ms} ms</td></tr>)}</tbody></table></div>{!state.history.length && <p className="mt-3 text-xs text-muted-foreground">No saved outcomes for this identity.</p>}</div>}
    <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Verified users receive owner-scoped, append-only agent outcomes; recent successful summaries ground subsequent copilot and statutory requests. Public demonstrations remain unsaved. Local demonstration roles never authorize private records or external actions. Managed graph deployment and official submissions require separate provisioned connections.</p>
  </section>;
}