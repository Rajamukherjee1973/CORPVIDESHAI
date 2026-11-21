"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LISTED_1000 } from "@/data/listed";
import type { Company } from "@/data/companies";

type QuickFilter =
  | "all"
  | "top50"
  | "top100"
  | "nse"
  | "bse"
  | "nsebse"
  | "largecap"
  | "midsmallcap";

const QUICK_FILTERS: { key: QuickFilter; label: string; shortcut?: string }[] = [
  { key: "all", label: "All 1,000" },
  { key: "top50", label: "Top 50", shortcut: "rank ≤ 50" },
  { key: "top100", label: "Top 100", shortcut: "rank ≤ 100" },
  { key: "nse", label: "NSE only" },
  { key: "bse", label: "BSE only" },
  { key: "nsebse", label: "NSE + BSE" },
  { key: "largecap", label: "Large cap", shortcut: "1-500" },
  { key: "midsmallcap", label: "Mid / Small cap", shortcut: "501-1000" },
];

function matchesQuick(c: Company, q: QuickFilter): boolean {
  switch (q) {
    case "all":
      return true;
    case "top50":
      return c.rank <= 50;
    case "top100":
      return c.rank <= 100;
    case "nse":
      return c.exchange === "NSE";
    case "bse":
      return c.exchange === "BSE";
    case "nsebse":
      return c.exchange === "NSE + BSE";
    case "largecap":
      return c.rank <= 500;
    case "midsmallcap":
      return c.rank > 500;
    default:
      return true;
  }
}

function normalizeToken(t: string) {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

export function CompanyPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("all");
  const [sector, setSector] = useState<string>("all");

  const selected = useMemo(() => LISTED_1000.find((c) => c.name === value) ?? null, [value]);

  const sectors = useMemo(
    () => Array.from(new Set(LISTED_1000.map((c) => c.sector))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const tokens = search
      .split(/\s+/)
      .map(normalizeToken)
      .filter(Boolean);
    return LISTED_1000.filter((c) => {
      if (!matchesQuick(c, quick)) return false;
      if (sector !== "all" && c.sector !== sector) return false;
      if (tokens.length === 0) return true;

      const haystack = normalizeToken(`${c.name} ${c.sector} ${c.exchange} ${c.rank}`);
      const initialsMatch = normalizeToken(initials(c.name));
      // Every token must match somewhere, OR the full search matches initials.
      return (
        tokens.every((t) => haystack.includes(t)) ||
        (tokens.length === 1 && initialsMatch.startsWith(tokens[0] ?? ""))
      );
    });
  }, [search, quick, sector]);

  const grouped = useMemo(() => {
    const map = new Map<string, Company[]>();
    for (const c of filtered) {
      const list = map.get(c.sector) ?? [];
      list.push(c);
      map.set(c.sector, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline"
          type="button"
          aria-expanded={open}
          className={cn(
            "group flex w-full items-center justify-between border border-rule/25 bg-background px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <>
                <span className="tnum flex h-5 min-w-[2.5rem] items-center justify-center bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                  {String(selected.rank).padStart(4, "0")}
                </span>
                <span className="truncate">{selected.name}</span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {selected.sector} · {selected.exchange}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">Select the filing company…</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[min(32rem,calc(100vw-2rem))] p-0"
        align="start"
        sideOffset={4}
      >
        <Command className="overflow-hidden rounded-md border-none bg-popover" shouldFilter={false}>
          <div className="border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <CommandInput
                placeholder="Search by name, sector, exchange or rank…"
                value={search}
                onValueChange={setSearch}
                className="h-9 flex-1"
              />
              {search && (
                <Button variant="ghost" size="icon"
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b bg-secondary/20 px-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_FILTERS.map((q) => (
                <Button variant="ghost" size="sm"
                  key={q.key}
                  type="button"
                  onClick={() => setQuick(q.key)}
                  className={cn(
                    "font-mono-ui rounded px-2 py-1 text-[10px] uppercase tracking-wider transition-colors",
                    quick === q.key
                      ? "bg-primary text-primary-foreground"
                      : "border border-rule/20 bg-background text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  {q.label}
                  {q.shortcut && (
                    <span className="ml-1.5 opacity-60">· {q.shortcut}</span>
                  )}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Sector
              </span>
              <select
                aria-label="Company sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="flex-1 rounded border border-rule/20 bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <option value="all">All sectors</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {(sector !== "all" || quick !== "all") && (
                <Button variant="link" size="sm"
                  type="button"
                  onClick={() => {
                    setSector("all");
                    setQuick("all");
                  }}
                  className="font-mono-ui text-[9px] uppercase tracking-wider text-primary hover:underline"
                >
                  Reset filters
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
              {filtered.length} match{filtered.length === 1 ? "" : "es"}
            </span>
            {selected && (
              <span className="font-mono-ui text-[10px] text-primary">
                Selected: {selected.name.slice(0, 28)}
              </span>
            )}
          </div>

          <CommandList className="max-h-[320px]">
            {filtered.length === 0 && <CommandEmpty>No company matches.</CommandEmpty>}
            {grouped.map(([sectorName, companies]) => (
              <CommandGroup
                key={sectorName}
                heading={`${sectorName} · ${companies.length}`}
                className="px-1"
              >
                {companies.map((c) => {
                  const active = c.name === value;
                  return (
                    <CommandItem
                      key={c.name}
                      value={c.name}
                      onSelect={() => {
                        onChange(c.name);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-sm px-2 py-2",
                        active && "bg-primary/10 text-primary",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="tnum w-10 shrink-0 text-[10px] text-muted-foreground">
                          {String(c.rank).padStart(4, "0")}
                        </span>
                        <span className="truncate">{c.name}</span>
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          · {c.exchange}
                        </span>
                        {c.balanceSheet && (
                          <span
                            className="shrink-0 border border-primary/40 px-1 font-mono-ui text-[9px] uppercase tracking-[0.12em] text-primary"
                            title={`Filed balance sheet 31 Mar 2026 · net worth ₹${c.balanceSheet.netWorth.toLocaleString("en-IN")} cr`}
                          >
                            Filed FY26
                          </span>
                        )}
                      </span>
                      {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
          <p className="border-t px-3 py-2 text-[10px] text-muted-foreground">Demonstration catalogue, not a verified top-1,000 exchange ranking. Ranks 501–1,000 are generated examples; unmatched financial figures are illustrative.</p>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
