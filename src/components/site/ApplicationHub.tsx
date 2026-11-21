import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Building2, Landmark, BriefcaseBusiness, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const DESKS = [
  { to: "/console", name: "Corporate treasury", icon: Building2, n: "01", scope: "Company-scoped Form FC · due dates · FEMA", kind: "Assigned company account", link: "Open treasury" },
  { to: "/fund-portal", name: "Fund investors", icon: BriefcaseBusiness, n: "02", scope: "Offshore proposals · responses · GIFT tracking", kind: "Assigned fund account", link: "Open fund portal" },
  { to: "/gift-portal", name: "GIFT case review", icon: Landmark, n: "03", scope: "AD bank · authority lanes · IBU · case history", kind: "Assigned reviewer account", link: "Open GIFT portal" },
  { to: "/regulator-portal", name: "Form FC register", icon: FileCheck2, n: "04", scope: "Dated filing records · officer details · audit", kind: "Assigned filing account", link: "Open filing portal" },
] as const;

export function ApplicationHub() {
  return <section className="mx-auto max-w-[1400px] px-6 pb-8 pt-8">
    <div className="flex flex-wrap items-end justify-between gap-4 border-t-4 border-primary pt-4">
      <div><p className="font-mono-ui text-[10px] uppercase text-primary">CorpVidesh AI / Application workspace</p><h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">Outbound capital. One workspace.</h1></div>
      <Button variant="outline" asChild className="rounded-none"><Link to="/evidence">VC evidence studio<ArrowUpRight /></Link></Button>
    </div>
    <div className="mt-6 grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-4">
      {DESKS.map(({ icon: Icon, ...desk }) => <article key={desk.to} className="flex min-w-0 flex-col bg-background p-5">
        <div className="flex justify-between text-primary"><span className="font-mono-ui text-xs">{desk.n}</span><Icon size={22} /></div>
        <h2 className="mt-4 font-display text-2xl">{desk.name}</h2>
        <p className="mt-2 min-h-10 text-sm text-muted-foreground">{desk.scope}</p>
        <p className="mb-4 mt-4 border-t border-border pt-3 font-mono-ui text-[10px] text-muted-foreground">{desk.kind}</p>
        <Button variant="outline" asChild className="mt-auto justify-between rounded-none"><Link to={desk.to}>{desk.link}<ArrowUpRight /></Link></Button>
      </article>)}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Securely stored demonstration records. Not official RBI or IFSCA filings; desk selection does not grant account access.</p>
    <nav aria-label="Presentation essentials" className="mt-5 flex flex-wrap gap-2">
      {([{ to: "/intelligence", label: "Live intelligence" }, { to: "/agents", label: "Agent desk" }, { to: "/architecture", label: "Architecture & feasibility" }, { to: "/investors", label: "Investor brief" }, { to: "/decks", label: "Download presentations" }] as const).map((item) => <Button key={item.to} variant="ghost" asChild size="sm" className="rounded-none"><Link to={item.to}>{item.label}<ArrowUpRight /></Link></Button>)}
    </nav>
  </section>;
}