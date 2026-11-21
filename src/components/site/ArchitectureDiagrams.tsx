import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const DIAGRAM_IDS = ["system", "flow", "lanes", "agents", "trust"] as const;
export type DiagramId = (typeof DIAGRAM_IDS)[number];

type Stage = { name: string; use: string; integration: string; to: string; desk: string };
type Diagram = { id: DiagramId; n: string; title: string; kicker: string; svg: () => ReactNode; stages: Stage[]; boundary: string };

/* ---------- SVG primitives (semantic tokens only) ---------- */
function Box({ x, y, w, h, lines, tone = "plain", tag }: { x: number; y: number; w: number; h: number; lines: string[]; tone?: "plain" | "red" | "dash" | "ink"; tag?: string }) {
  const rect =
    tone === "red" ? "fill-primary stroke-primary" : tone === "ink" ? "fill-foreground stroke-foreground" : tone === "dash" ? "fill-background stroke-muted-foreground" : "fill-background stroke-foreground/50";
  const text = tone === "red" ? "fill-primary-foreground" : tone === "ink" ? "fill-background" : tone === "dash" ? "fill-muted-foreground" : "fill-foreground";
  const start = y + h / 2 - ((lines.length - 1) * 16) / 2 + (tag ? 7 : 0);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} strokeWidth={1.2} strokeDasharray={tone === "dash" ? "5 4" : undefined} className={rect} />
      {tag ? <text x={x + 10} y={y + 16} fontSize={10} letterSpacing={1.4} className={`font-mono-ui ${tone === "red" || tone === "ink" ? text : "fill-primary"}`}>{tag}</text> : null}
      {lines.map((l, i) => (
        <text key={l} x={x + w / 2} y={start + i * 16} textAnchor="middle" dominantBaseline="middle" fontSize={i === 0 ? 13 : 11} className={`${i === 0 ? "font-display" : "font-mono-ui"} ${text}`}>{l}</text>
      ))}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, red, dashed, label }: { x1: number; y1: number; x2: number; y2: number; red?: boolean; dashed?: boolean; label?: string }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.4} markerEnd={red ? "url(#cv-head-red)" : "url(#cv-head)"} strokeDasharray={dashed ? "5 4" : undefined} className={red ? "stroke-primary" : "stroke-foreground/60"} />
      {label ? <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={10} className={`font-mono-ui ${red ? "fill-primary" : "fill-muted-foreground"}`}>{label}</text> : null}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <marker id="cv-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="fill-foreground/60" /></marker>
      <marker id="cv-head-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="fill-primary" /></marker>
    </defs>
  );
}

function Svg({ h, label, children }: { h: number; label: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 1200 ${h}`} role="img" aria-label={label} className="block w-full min-w-[760px]">
        <Defs />
        {children}
      </svg>
    </div>
  );
}

/* ---------- 01 System architecture ---------- */
const LAYERS: { tag: string; tone: "plain" | "red" | "ink"; items: string[][] }[] = [
  { tag: "USERS", tone: "plain", items: [["Corporate treasury", "CFO · treasury desk"], ["AD Category-I bank", "authorised dealer"], ["GIFT IFSC desks", "nine review roles"], ["Regulator reviewers", "six authority lanes"], ["Fund investors", "offshore proposals"]] },
  { tag: "WORKSPACES", tone: "plain", items: [["Treasury console", "filings · Form FC"], ["GIFT clearance portal", "multi-party case"], ["Secure Form FC portal", "regulator actions"], ["Fund portal", "proposal tracking"], ["Agent desk", "five AI agents"], ["Evidence studio", "proof · mechanism"]] },
  { tag: "SERVER DOMAINS", tone: "ink", items: [["Legal triage", "FEMA · OI Rules 2022"], ["Filings", "snapshot · append"], ["Markets & FX", "52 hubs · benchmarks"], ["Agents", "graph · copilot · reader"]] },
  { tag: "SAFEGUARDS", tone: "red", items: [["Sign-in & roles", "server-checked"], ["Row isolation", "per company / desk"], ["Append-only + hash", "SHA-256 chain"], ["QA veto", "fails closed"], ["Trace IDs", "payload-free logs"]] },
  { tag: "DATA & SOURCES", tone: "plain", items: [["Cloud database", "encrypted records"], ["Statute corpus", "cited provisions"], ["FX providers", "ECB · market feeds"], ["RBI ODI releases", "daily sync"], ["AI gateway", "server-side keys"]] },
];

function SystemSvg() {
  const top = 20, rowH = 82, gap = 26, left = 170, width = 1200 - left - 20;
  return (
    <Svg h={top + LAYERS.length * (rowH + gap) + 70} label="Five-layer system architecture of CorpVidesh AI">
      {LAYERS.map((layer, r) => {
        const y = top + r * (rowH + gap);
        const n = layer.items.length, g = 12, w = (width - g * (n - 1)) / n;
        return (
          <g key={layer.tag}>
            <text x={10} y={y + 20} fontSize={10} letterSpacing={2} className="font-mono-ui fill-primary">{String(r + 1).padStart(2, "0")}</text>
            <text x={10} y={y + 38} fontSize={11} letterSpacing={1.6} className="font-mono-ui fill-foreground">{layer.tag}</text>
            <line x1={10} x2={150} y1={y + 48} y2={y + 48} className="stroke-primary" strokeWidth={2} />
            {layer.items.map((it, i) => <Box key={it[0]} x={left + i * (w + g)} y={y} w={w} h={rowH} lines={it} tone={layer.tone} />)}
            {r < LAYERS.length - 1 ? <Arrow x1={left + width / 2} y1={y + rowH + 2} x2={left + width / 2} y2={y + rowH + gap - 2} red /> : null}
          </g>
        );
      })}
      <Box x={left} y={top + LAYERS.length * (rowH + gap) + 4} w={width} h={50} tone="dash" lines={["Not connected today: RBI FIRMS · IFSCA systems · SWIFT · bank core ledgers", "planned integrations — require authorised access agreements"]} />
    </Svg>
  );
}

/* ---------- 02 Functional flow ---------- */
const FLOW = [
  ["Select company", "top-1,000 · hub · currency"], ["Choose class & amount", "212 ODI / OPI purposes"], ["Route triage", "Automatic vs Approval"], ["Document checklist", "statute-linked gating"],
  ["File Form FC", "append-only record"], ["Six-lane review", "parallel · simulated"], ["Hash-chained record", "tamper-evident trail"], ["Proof packet", "export & replay"],
];
function FlowSvg() {
  const w = 250, h = 96, gx = 46, x0 = 30;
  const pos = (i: number) => (i < 4 ? { x: x0 + i * (w + gx), y: 40 } : { x: x0 + (7 - i) * (w + gx), y: 230 });
  return (
    <Svg h={370} label="Eight-step functional flow from company selection to proof packet">
      {FLOW.map((f, i) => { const p = pos(i); return <Box key={f[0]} x={p.x} y={p.y} w={w} h={h} lines={f} tag={String(i + 1).padStart(2, "0")} tone={i === 5 ? "red" : i === 6 ? "ink" : "plain"} />; })}
      {[0, 1, 2].map((i) => <Arrow key={i} x1={pos(i).x + w + 4} y1={88} x2={pos(i + 1).x - 4} y2={88} />)}
      <Arrow x1={pos(3).x + w / 2} y1={140} x2={pos(4).x + w / 2} y2={226} red label="complete" />
      {[4, 5, 6].map((i) => <Arrow key={i} x1={pos(i).x - 4} y1={278} x2={pos(i + 1).x + w + 4} y2={278} />)}
      <Arrow x1={pos(3).x + 90} y1={178} x2={pos(2).x + w - 30} y2={178} dashed label="missing document → blocked" />
      <text x={30} y={360} fontSize={11} className="font-mono-ui fill-muted-foreground">Every arrow writes to the same case record. Regulator responses are demonstrations, not official approvals.</text>
    </Svg>
  );
}

/* ---------- 03 Swimlanes ---------- */
const COLS = ["Prepare", "Validate", "File", "Review", "Record & release"];
const LANES: [string, (string | null)[]][] = [
  ["Treasury", ["Pick company, hub, amount", "Upload documents", "Submit Form FC", null, "Download proof packet"]],
  ["CorpVidesh AI", ["FX & headroom check", "Route triage · checklist", "Snapshot & append", "Route to six lanes", "Hash-chain the case"]],
  ["AD Cat-I bank", [null, "Verify KYC & limits", "Countersign filing", "Raise / clear queries", "Release (simulated)"]],
  ["Regulators", [null, null, "Receive dossier", "Parallel actions", "Read audit trail"]],
];
function LanesSvg() {
  const lx = 170, cw = (1200 - lx - 20) / COLS.length, rh = 80, ty = 50;
  return (
    <Svg h={ty + LANES.length * rh + 20} label="Swimlane diagram of who does what at each stage">
      {COLS.map((c, i) => (
        <g key={c}>
          <rect x={lx + i * cw} y={10} width={cw - 4} height={30} className="fill-foreground" />
          <text x={lx + i * cw + 12} y={30} fontSize={11} letterSpacing={1.4} className="font-mono-ui fill-background">{String(i + 1).padStart(2, "0")} {c.toUpperCase()}</text>
        </g>
      ))}
      {LANES.map(([lane, cells], r) => {
        const y = ty + r * rh;
        return (
          <g key={lane}>
            <line x1={10} x2={1180} y1={y + rh} y2={y + rh} className="stroke-foreground/15" />
            <text x={10} y={y + rh / 2 + 4} fontSize={13} className={`font-display ${r === 1 ? "fill-primary" : "fill-foreground"}`}>{lane}</text>
            {cells.map((c, i) => c ? <Box key={i} x={lx + i * cw + 4} y={y + 12} w={cw - 12} h={rh - 24} lines={[c]} tone={r === 1 ? "red" : "plain"} /> : <line key={i} x1={lx + i * cw + 20} x2={lx + (i + 1) * cw - 24} y1={y + rh / 2} y2={y + rh / 2} strokeDasharray="2 5" className="stroke-foreground/25" />)}
          </g>
        );
      })}
    </Svg>
  );
}

/* ---------- 04 Agent graph ---------- */
const AGENTS = [["Statutory retriever", "cited provisions"], ["Route triage", "Automatic / Approval"], ["Tax & treaty", "Section 195 · DTAA"], ["FX outlook", "conditional scenarios"], ["Document reader", "extract & flag"], ["Evidence writer", "append-only outcome"], ["QA veto", "fail closed"]];
function AgentsSvg() {
  const cx = 600, cy = 270, rx = 440, ry = 185, w = 200, h = 64;
  return (
    <Svg h={540} label="Multi-agent graph with a coordinator and quality veto">
      {AGENTS.map((a, i) => {
        const t = -Math.PI / 2 + (i * 2 * Math.PI) / AGENTS.length;
        const x = cx + rx * Math.cos(t), y = cy + ry * Math.sin(t);
        const veto = a[0] === "QA veto";
        return (
          <g key={a[0]}>
            {veto
              ? <Arrow x1={cx + (x - cx) * 0.7} y1={cy + (y - cy) * 0.7} x2={cx + (x - cx) * 0.3} y2={cy + (y - cy) * 0.3} red dashed label="veto → re-plan" />
              : <Arrow x1={cx + (x - cx) * 0.24} y1={cy + (y - cy) * 0.24} x2={cx + (x - cx) * 0.76} y2={cy + (y - cy) * 0.76} />}
            <Box x={x - w / 2} y={y - h / 2} w={w} h={h} lines={a} tone={veto ? "red" : "plain"} />
          </g>
        );
      })}
      <Box x={cx - 120} y={cy - 42} w={240} h={84} tone="ink" lines={["Coordinator", "plans · routes · merges", "bounded shared context"]} />
    </Svg>
  );
}

/* ---------- 05 Trust & isolation ---------- */
function TrustSvg() {
  const blocks = ["Case opened", "Checklist complete", "Form FC filed", "Lane actions", "Proof issued"];
  const w = 196, gx = 40;
  return (
    <Svg h={420} label="Hash chain of case events and record isolation">
      {blocks.map((b, i) => (
        <g key={b}>
          <Box x={20 + i * (w + gx)} y={30} w={w} h={110} tag={`EVENT ${i + 1}`} lines={[b, `prev: ${i === 0 ? "genesis" : `h${i}`}`, `hash: h${i + 1}`]} tone={i === 4 ? "red" : "plain"} />
          {i < 4 ? <Arrow x1={20 + i * (w + gx) + w + 2} y1={85} x2={20 + (i + 1) * (w + gx) - 4} y2={85} red label="links" /> : null}
        </g>
      ))}
      <text x={20} y={172} fontSize={11} className="font-mono-ui fill-muted-foreground">Changing any earlier event breaks every later hash — tampering becomes visible. This is record integrity, not blockchain consensus.</text>
      <Box x={20} y={200} w={350} h={170} lines={["Private desks", "company-scoped records", "assigned regulator roles"]} />
      <rect x={400} y={200} width={14} height={170} className="fill-primary" />
      <text x={407} y={390} textAnchor="middle" fontSize={10} className="font-mono-ui fill-primary">ROW ISOLATION</text>
      <Box x={444} y={200} w={350} h={170} lines={["Public showcase desks", "shared demo sign-ins", "cannot see private cases"]} tone="dash" />
      <Box x={830} y={200} w={350} h={170} tone="ink" lines={["Server checks every write", "role → company → workflow order", "no client-side authority"]} />
    </Svg>
  );
}

export const DIAGRAMS: Diagram[] = [
  {
    id: "system", n: "01", title: "System architecture", kicker: "Five layers, one record", svg: SystemSvg,
    boundary: "One integrated deployment with separated domains — not independently hosted microservices.",
    stages: [
      { name: "Users", use: "Each role signs in to its own workspace; no one sees another company's private records.", integration: "Sign-in identity and server-assigned roles decide access.", to: "/access", desk: "Open desks" },
      { name: "Workspaces", use: "Treasury prepares and files; GIFT and regulator desks review; investors track proposals.", integration: "All workspaces call the same validated server functions.", to: "/console", desk: "Treasury console" },
      { name: "Server domains", use: "Legal triage, filings, markets and agents each own their rules.", integration: "Versioned contracts and pure policy modules keep domains decoupled.", to: "/architecture", desk: "Architecture & feasibility" },
      { name: "Safeguards", use: "Every write is role-checked, company-scoped and appended — never overwritten.", integration: "Database isolation rules plus server checks; hash chain per case.", to: "/security", desk: "Security demonstration" },
      { name: "Data & sources", use: "Statutes, FX observations, RBI ODI releases and AI answers feed the case.", integration: "Fetched server-side with source timestamps shown on screen.", to: "/intelligence", desk: "Prediction & FX" },
    ],
  },
  {
    id: "flow", n: "02", title: "Functional flow", kicker: "Eight steps, case to proof", svg: FlowSvg,
    boundary: "Review lanes and release are simulated; no official RBI or IFSCA submission occurs.",
    stages: [
      { name: "01–02 Select", use: "Treasury picks a company, hub, currency, investment class and amount.", integration: "Shared scenario bar carries the choice to every desk.", to: "/access", desk: "Applications" },
      { name: "03 Route triage", use: "Conservative Automatic vs Approval assessment with cited provisions.", integration: "Legal domain policy; uncertain cases are referred, never auto-approved.", to: "/routes", desk: "Route intake" },
      { name: "04 Checklist", use: "Statute-linked documents must be acknowledged before filing.", integration: "Pure workflow policy blocks the next step until complete.", to: "/console", desk: "Clearance studio" },
      { name: "05 File Form FC", use: "Company-scoped filing saved as an append-only snapshot.", integration: "Shared snapshot/append service for corporate and regulator entry points.", to: "/filings", desk: "Filings register" },
      { name: "06–08 Review & proof", use: "Six simulated lanes act in parallel; the case is hash-chained and exported.", integration: "Proof packet binds scenario, documents and decisions.", to: "/evidence", desk: "Evidence studio" },
    ],
  },
  {
    id: "lanes", n: "03", title: "Who does what", kicker: "Four parties, five stages", svg: LanesSvg,
    boundary: "Bank and regulator roles shown are a proposed operating model for the pilot.",
    stages: [
      { name: "Treasury", use: "Prepares, uploads, files and downloads proof.", integration: "Company membership authorises filing — never a typed company name.", to: "/console", desk: "Treasury console" },
      { name: "CorpVidesh AI", use: "Checks headroom, triages route, snapshots, routes and chains.", integration: "Server functions with correlation IDs on every request.", to: "/agents", desk: "Agent desk" },
      { name: "AD Category-I bank", use: "Verifies KYC and limits, countersigns and releases.", integration: "GIFT portal reviewer role; release is simulated.", to: "/gift-portal", desk: "GIFT portal" },
      { name: "Regulators", use: "Receive one dossier and act in parallel lanes.", integration: "Append-only regulator actions on the secure Form FC portal.", to: "/regulator-portal", desk: "Regulator portal" },
    ],
  },
  {
    id: "agents", n: "04", title: "Agent graph", kicker: "Seven specialists, one veto", svg: AgentsSvg,
    boundary: "AI outputs are advisory; read tools cannot file, approve or move money.",
    stages: [
      { name: "Coordinator", use: "Plans which specialists to call and merges their findings.", integration: "Bounded cross-agent context; owner-scoped outcomes.", to: "/agents", desk: "Agent desk" },
      { name: "Specialists", use: "Statute retrieval, route, tax, FX and document reading.", integration: "Reuse the same server FX, market and statutory functions as the desks.", to: "/frontier", desk: "Frontier tools" },
      { name: "QA veto", use: "Rejects unsupported or malformed answers and forces a re-plan.", integration: "Fails closed — unsupported evidence is never marked verified.", to: "/evidence", desk: "Evidence studio" },
    ],
  },
  {
    id: "trust", n: "05", title: "Trust & isolation", kicker: "Tamper-evident, separated", svg: TrustSvg,
    boundary: "Hash chains prove record integrity only; they are not consensus, approval or certification.",
    stages: [
      { name: "Hash chain", use: "Each case event stores the previous event's hash.", integration: "Database trigger locks order; browser re-verifies the chain.", to: "/gift-portal", desk: "GIFT portal" },
      { name: "Row isolation", use: "Private and public showcase desks never see each other's cases.", integration: "Restrictive database policies per desk and company.", to: "/regulator-portal", desk: "Regulator portal" },
      { name: "Server authority", use: "Role, company and workflow order are checked on every write.", integration: "Local selectors never authorise server data.", to: "/security", desk: "Security demonstration" },
    ],
  },
];

export function StageTable({ stages }: { stages: Stage[] }) {
  return (
    <div className="grid gap-px bg-rule/15 md:grid-cols-2 xl:grid-cols-3">
      {stages.map((s, i) => (
        <div key={s.name} className="bg-background p-5">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">{String(i + 1).padStart(2, "0")} · {s.name}</p>
          <p className="mt-3 text-sm leading-relaxed"><span className="font-mono-ui mr-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Usage</span>{s.use}</p>
          <p className="mt-2 text-sm leading-relaxed"><span className="font-mono-ui mr-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Integration</span>{s.integration}</p>
          <Link to={s.to} className="font-mono-ui mt-4 inline-block border-b border-primary pb-0.5 text-[10px] uppercase tracking-[0.14em] text-primary">{s.desk} →</Link>
        </div>
      ))}
    </div>
  );
}
