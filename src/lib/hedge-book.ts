/** Session-scoped hedge book shared by the currency-risk dashboard and the hedge desk. Browser-only after hydration; never server data. */
import { useEffect, useState } from "react";
import type { HedgePosition } from "@/lib/fx-swings";

const KEY = "cv-hedge-book-v1";
const DEFAULT: HedgePosition[] = [
  { code: "USD", exposureCr: 500, hedgeRatio: 0.5 },
  { code: "SGD", exposureCr: 300, hedgeRatio: 0.5 },
  { code: "AED", exposureCr: 200, hedgeRatio: 0.5 },
  { code: "GBP", exposureCr: 150, hedgeRatio: 0.5 },
];
const subs = new Set<(b: HedgePosition[]) => void>();

function read(): HedgePosition[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (Array.isArray(v)) return v.filter((p) => typeof p?.code === "string" && Number.isFinite(p?.exposureCr) && Number.isFinite(p?.hedgeRatio));
  } catch { /* fall through */ }
  return DEFAULT;
}

export function setHedgeBook(next: HedgePosition[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  subs.forEach((f) => f(next));
}

export function addToHedgeBook(code: string, exposureCr = 100) {
  const b = read();
  if (!b.some((p) => p.code === code)) setHedgeBook([...b, { code, exposureCr, hedgeRatio: 0.5 }]);
}

export function useHedgeBook(): [HedgePosition[], (b: HedgePosition[]) => void, boolean] {
  const [book, setBook] = useState<HedgePosition[]>(DEFAULT);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setBook(read());
    setReady(true);
    subs.add(setBook);
    return () => { subs.delete(setBook); };
  }, []);
  return [book, setHedgeBook, ready];
}
