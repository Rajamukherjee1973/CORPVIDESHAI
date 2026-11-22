/** Session-scoped booked forwards for the hedge contract builder. Browser-only after hydration; never server data. */
import { useEffect, useState } from "react";
import type { ForwardContract } from "@/lib/forward-contract";

const KEY = "cv-forward-book-v1";
type Store = { seq: number; contracts: ForwardContract[] };
const EMPTY: Store = { seq: 0, contracts: [] };
const subs = new Set<(s: Store) => void>();

function read(): Store {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (v && Array.isArray(v.contracts) && Number.isFinite(v.seq)) {
      return { seq: v.seq, contracts: v.contracts.filter((c: ForwardContract) => typeof c?.ref === "string" && Number.isFinite(c?.rate) && Number.isFinite(c?.notional)) };
    }
  } catch { /* fall through */ }
  return EMPTY;
}

function write(next: Store) {
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  subs.forEach((f) => f(next));
}

export function useForwardBook() {
  const [store, setStore] = useState<Store>(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setStore(read());
    setReady(true);
    subs.add(setStore);
    return () => { subs.delete(setStore); };
  }, []);
  return {
    contracts: store.contracts,
    nextSeq: store.seq + 1,
    ready,
    book: (c: ForwardContract) => { const s = read(); write({ seq: s.seq + 1, contracts: [c, ...s.contracts] }); },
    remove: (ref: string) => { const s = read(); write({ ...s, contracts: s.contracts.filter((c) => c.ref !== ref) }); },
    clear: () => { const s = read(); write({ seq: s.seq, contracts: [] }); },
  };
}
