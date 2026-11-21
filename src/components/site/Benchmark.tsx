import { useState } from "react";
import { COLUMNS, INCUMBENTS, MATRIX, UNIQUE_CLAIMS, score } from "@/lib/benchmark";

function Mark({ v }: { v: boolean | "partial" | undefined }) {
  if (v === true)
    return (
      <span className="font-mono-ui inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1 text-[10px] text-primary-foreground">
        ●
      </span>
    );
  if (v === "partial")
    return (
      <span className="font-mono-ui inline-flex h-5 min-w-5 items-center justify-center border border-primary px-1 text-[10px] text-primary">
        ◐
      </span>
    );
  return (
    <span className="font-mono-ui inline-flex h-5 min-w-5 items-center justify-center border border-rule/25 px-1 text-[10px] text-muted-foreground">
      ○
    </span>
  );
}

/**
 * The rail-page benchmark: what CorpVidesh AI does that Bloomberg, Reuters,
 * the RBI portal and the Indian tax toolkits structurally cannot, and why.
 */
export function Benchmark() {
  const [row, setRow] = useState<string>(MATRIX[0]!.key);
  const [col, setCol] = useState<string>("bloomberg");
  const active = MATRIX.find((m) => m.key === row)!;
  const rival = INCUMBENTS.find((i) => i.key === col) ?? INCUMBENTS[0]!;

  return (
    <div className="border border-rule/20">
      <div className="grid gap-px bg-rule/15 md:grid-cols-6">
        {COLUMNS.map((c) => {
          const n = score(c.key);
          const us = c.key === "corpvidesh";
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => !us && setCol(c.key)}
              className={`bg-background p-4 text-left transition-colors ${
                !us && col === c.key ? "bg-primary/5" : ""
              }`}
            >
              <p
                className={`font-mono-ui text-[9px] uppercase tracking-[0.16em] ${
                  us ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {c.short}
              </p>
              <p className="mt-2 text-xs leading-snug">{c.label}</p>
              <p className={`font-display tnum mt-3 text-3xl ${us ? "text-primary" : ""}`}>
                {n}
                <span className="text-base text-muted-foreground">/{MATRIX.length}</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto border-t border-rule/15">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-rule/15">
              <th className="font-mono-ui px-4 py-3 text-[9px] font-normal uppercase tracking-[0.16em] text-muted-foreground">
                Capability an outbound filing actually needs
              </th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`font-mono-ui px-2 py-3 text-center text-[9px] font-normal uppercase tracking-[0.14em] ${
                    c.key === "corpvidesh" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {c.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((m) => (
              <tr
                key={m.key}
                onClick={() => setRow(m.key)}
                className={`cursor-pointer border-b border-rule/10 transition-colors hover:bg-primary/5 ${
                  row === m.key ? "bg-primary/5" : ""
                }`}
              >
                <td className="px-4 py-3 text-sm leading-snug">{m.label}</td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-2 py-3 text-center">
                    <Mark v={m.scores[c.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-px border-t border-rule/15 bg-rule/15 lg:grid-cols-2">
        <div className="bg-background p-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            Why this line matters
          </p>
          <p className="font-display mt-3 text-2xl leading-snug">{active.label}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{active.note}</p>
        </div>
        <div className="bg-background p-6">
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            {rival.name}
          </p>
          <p className="font-mono-ui mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {rival.kind}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            <span className="text-foreground">What it is superb at — </span>
            {rival.strength}
          </p>
          <p className="mt-2 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
            <span className="text-foreground">Where it stops — </span>
            {rival.stops}
          </p>
        </div>
      </div>

      <div className="grid gap-px border-t border-rule/15 bg-rule/15 md:grid-cols-3 xl:grid-cols-5">
        {UNIQUE_CLAIMS.map((u, i) => (
          <div key={u.t} className="bg-background p-5">
            <p className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-primary">
              {String(i + 1).padStart(2, "0")}
            </p>
            <p className="mt-2 text-sm font-medium leading-snug">{u.t}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{u.d}</p>
          </div>
        ))}
      </div>

      <p className="border-t border-rule/15 bg-background px-6 py-4 text-xs leading-relaxed text-muted-foreground">
        <span className="font-mono-ui uppercase tracking-[0.16em] text-primary">In plain words —</span>{" "}
        the terminals tell you the price, the portal takes the finished form, and the tax tools fill one
        box each. This rail is the only place where the law is reasoned, the money is routed and the
        regulator is watching, all on the same record, at the same time.
      </p>
    </div>
  );
}
