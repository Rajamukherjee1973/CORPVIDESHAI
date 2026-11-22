import type { AgentTab } from "@/components/site/AgentDesk";

type Layer = { n: string; title: string; items: { label: string; agents: AgentTab[] }[] };

const ALL: AgentTab[] = ["graph", "copilot", "reader", "outlook", "tools", "training"];
const AI: AgentTab[] = ["graph", "copilot", "reader", "outlook"];
const AI_LEARNING: AgentTab[] = [...AI, "training"];

/** Where each agent sits: what it reads, which safeguards apply and what it returns. Descriptive only. */
export const AGENT_LAYERS: Layer[] = [
  { n: "01", title: "Inputs", items: [
    { label: "Question + deal context", agents: ["graph", "copilot"] },
    { label: "Treasury scenario · hub · ₹ amount", agents: ["copilot", "outlook"] },
    { label: "Board resolution · photo", agents: ["reader"] },
    { label: "Live FX provider rate", agents: ["copilot", "outlook", "tools"] },
    { label: "Cited statute corpus", agents: ["graph", "tools"] },
    { label: "Your reviewed examples (ratings)", agents: AI_LEARNING },
  ] },
  { n: "03", title: "Safeguards", items: [
    { label: "One LangGraph mesh · fixed dispatch", agents: AI_LEARNING },
    { label: "Server-only model calls", agents: AI },
    { label: "Evidence grader + rewrite loop", agents: ["graph"] },
    { label: "QA veto · fails closed", agents: ["graph"] },
    { label: "Conditional scenarios, no synthetic history", agents: ["outlook"] },
    { label: "Read-only · filing & ledger writes denied", agents: ["tools"] },
    { label: "Public runs not saved", agents: ALL },
  ] },
  { n: "04", title: "Outputs", items: [
    { label: "Cited determination + trace export", agents: ["graph"] },
    { label: "Forecast · action · legal basis", agents: ["copilot"] },
    { label: "Extracted facts · filings triggered", agents: ["reader"] },
    { label: "Allocation · hedge · review trigger", agents: ["outlook"] },
    { label: "Provider snapshot JSON", agents: ["tools"] },
    { label: "Ratings → examples · evaluation · dataset", agents: ["training"] },
    { label: "Human desk decides", agents: ALL },
  ] },
];

const NAMES: Record<AgentTab, string> = { graph: "Statutory graph", copilot: "Treasury copilot", reader: "Document reader", outlook: "Currency outlook", tools: "Connected tools", training: "Training loop" };

export function AgentArchitecture({ active, onPick }: { active: AgentTab; onPick: (t: AgentTab) => void }) {
  const [inputs, safeguards, outputs] = AGENT_LAYERS as [Layer, Layer, Layer];
  const col = (l: Layer) => (
    <div className="bg-background p-4">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><span className="text-primary">{l.n}</span> · {l.title}</p>
      <ul className="mt-3 space-y-1.5">
        {l.items.map((i) => {
          const on = i.agents.includes(active);
          return (
            <li key={i.label} className={`border-l-2 pl-2 text-xs leading-snug transition-colors ${on ? "border-primary text-foreground" : "hidden border-transparent text-muted-foreground/60 md:block"}`}>
              {i.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
  return (
    <figure aria-label="Agent architecture" className="border border-rule/25">
      <div className="grid gap-px bg-rule/20 md:grid-cols-4">
        {col(inputs)}
        <div className="hidden bg-background p-4 md:block">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><span className="text-primary">02</span> · Agents</p>
          <ul className="mt-3 space-y-1">
            {ALL.map((a, i) => (
              <li key={a}>
                <button
                  type="button"
                  onClick={() => onPick(a)}
                  aria-pressed={a === active}
                  className={`flex w-full items-center justify-between px-2 py-1 text-left text-xs transition-colors ${a === active ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"}`}
                >
                  <span>{NAMES[a]}</span>
                  <span className="font-mono-ui text-[10px] opacity-70">0{i + 1}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {col(safeguards)}
        {col(outputs)}
      </div>
      <figcaption className="border-t border-rule/20 px-4 py-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Highlighted path · {NAMES[active]} — inputs → agent → safeguards → output. A person signs off; no agent files or approves.
      </figcaption>
    </figure>
  );
}
