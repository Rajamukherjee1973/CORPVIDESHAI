import { DOCS_APPROVAL, DOCS_AUTO } from "@/lib/portal";

type Row = { name: string; source: string; auto: boolean; approval: boolean };

/** Every annexure the two routes can demand, in one comparable list. */
export const CHECKLIST: Row[] = [
  ...DOCS_AUTO.map(([name, source]) => ({ name, source, auto: true, approval: true })),
  ...DOCS_APPROVAL.map(([name, source]) => ({ name, source, auto: false, approval: true })),
];

function Mark({ on }: { on: boolean }) {
  return on ? (
    <span className="font-mono-ui border border-primary bg-primary px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-primary-foreground">
      required
    </span>
  ) : (
    <span className="font-mono-ui border border-rule/25 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
      not asked
    </span>
  );
}

/**
 * Side-by-side checklist of what each route demands, with live attachment
 * state for the route currently being filed.
 */
export function DocChecklist({
  route,
  files,
}: {
  route: "Automatic" | "Approval";
  files: Record<string, string>;
}) {
  const need = CHECKLIST.filter((r) => (route === "Approval" ? r.approval : r.auto));
  const done = need.filter((r) => files[r.name]).length;

  return (
    <div className="border border-rule/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/15 px-5 py-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Documentation checklist — Automatic route vs Approval route
        </p>
        <span className="font-mono-ui tnum text-[10px] uppercase tracking-[0.14em] text-primary">
          {route} route · {done}/{need.length} attached
        </span>
      </div>
      <div className="hidden grid-cols-[1fr_130px_130px_110px] gap-3 border-b border-rule/15 px-5 py-2.5 font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground md:grid">
        <span>Annexure and the statute that demands it</span>
        <span>Automatic route</span>
        <span>Approval route</span>
        <span>On this file</span>
      </div>
      {CHECKLIST.map((r) => {
        const active = route === "Approval" ? r.approval : r.auto;
        const attached = Boolean(files[r.name]);
        return (
          <div
            key={r.name}
            className={`grid gap-3 border-b border-rule/12 px-5 py-3.5 last:border-b-0 md:grid-cols-[1fr_130px_130px_110px] md:items-center ${
              active ? "" : "opacity-55"
            }`}
          >
            <span>
              <span className="block text-sm">{r.name}</span>
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-primary">
                {r.source}
              </span>
            </span>
            <span><Mark on={r.auto} /></span>
            <span><Mark on={r.approval} /></span>
            <span className="font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {!active ? "—" : attached ? `attached · ${files[r.name]}` : "outstanding"}
            </span>
          </div>
        );
      })}
      <div className="border-t border-rule/15 bg-primary/[0.04] px-5 py-3">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">In plain words</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Both routes need the same six core papers. The Approval route asks for three more, because a
          human regulator has to be persuaded before the money may leave — not merely informed after.
        </p>
      </div>
    </div>
  );
}
