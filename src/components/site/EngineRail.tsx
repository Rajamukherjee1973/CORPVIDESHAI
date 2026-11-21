import { Link } from "@tanstack/react-router";
import { ENGINE_META, type Engine } from "@/lib/regulator";
import type { Session } from "@/lib/session";

const ORDER: Engine[] = ["qwen", "langchain", "alicloud", "fabric", "manual"];

type Desk =
  | "rail"
  | "corporate"
  | "regulator"
  | "processing"
  | "mechanism"
  | "worklist"
  | "security"
  | "routes"
  | "casefile"
  | "section195"
  | "supervisor"
  | "gift"
  | "treasury"
  | "proof"
  | "apply";

const LINKS = [
  { desk: "worklist", to: "/worklist", label: "Ready list", sub: "Your to-do matrix, live" },
  { desk: "proof", to: "/proof", label: "Proof desk", sub: "Side-by-side vs the incumbents" },
  { desk: "corporate", to: "/portal", label: "Corporate application desk", sub: "File the route and documents" },
  { desk: "routes", to: "/routes", label: "Automatic vs Approval routes", sub: "Intake, 3D execution, evidence" },
  { desk: "processing", to: "/processing", label: "AD bank processing", sub: "Bank rail, live tape" },
  { desk: "regulator", to: "/regulator", label: "Regulator approval desk", sub: "Six-regulator window" },
  { desk: "supervisor", to: "/supervisor", label: "Supervisor ledger", sub: "Read-only, append-only replay" },
  { desk: "section195", to: "/section195", label: "Section 195 engine", sub: "Royalty/FTS, TRC, 15CA/15CB" },
  { desk: "casefile", to: "/casefile", label: "Case file", sub: "Audit timeline and money pipeline" },
  { desk: "security", to: "/security", label: "Security theatre", sub: "Breach containment, live" },
  { desk: "gift", to: "/gift", label: "GIFT IFSC desk", sub: "Company in, hub out" },
  { desk: "mechanism", to: "/mechanism", label: "Mechanism matrix", sub: "Layer-by-layer build" },
] as const satisfies readonly { desk: Desk; to: string; label: string; sub: string }[];

/**
 * The technology spine shared by every desk, plus the hand-off links that
 * interlink the corporate application, AD-bank processing and regulator
 * approval surfaces around one filing.
 */
export function EngineRail({
  desk,
  session,
  activeRef,
}: {
  desk: Desk;
  session?: Session | null;
  activeRef?: string | null;
}) {
  const visible = LINKS.filter((l) => {
    if (l.desk === desk) return false;
    if (session?.role === "corporate" && l.desk === "regulator") return false;
    if (session?.role === "corporate" && l.desk === "supervisor") return false;
    if (session?.role === "regulator" && l.desk === "corporate") return false;
    return true;
  });

  return (
    <div className="border border-rule/20">
      <div className="grid gap-px bg-rule/15 md:grid-cols-3 xl:grid-cols-5">
        {ORDER.map((e) => (
          <div key={e} className="bg-background p-4">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
              {ENGINE_META[e].label}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ENGINE_META[e].note}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-px border-t border-rule/15 bg-rule/15 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {visible.map((l) => {
          const body = (
            <>
              <span className="font-mono-ui block text-[10px] uppercase tracking-[0.14em] text-primary group-hover:underline">
                {l.label} →
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{l.sub}</span>
            </>
          );
          const cls = "group bg-background px-4 py-3";
          const ref = activeRef ?? undefined;
          if (l.desk === "regulator")
            return (
              <Link key={`${l.to}-${l.label}`} to="/regulator" search={{ ref }} className={cls}>
                {body}
              </Link>
            );
          if (l.desk === "processing")
            return (
              <Link key={`${l.to}-${l.label}`} to="/processing" search={{ ref }} className={cls}>
                {body}
              </Link>
            );
          return (
            <Link key={`${l.to}-${l.label}`} to={l.to} className={cls}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
