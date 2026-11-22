/**
 * Booked forwards for the hedge contract builder. Signed-in accounts save to
 * their own server-side hedge book (owner-only, with daily profit/loss marks);
 * signed-out visitors keep practice tickets in this browser tab only.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ForwardContract } from "@/lib/forward-contract";
import { rowToContract, type HedgeMark, type SaveForwardInput } from "@/lib/saved-forwards";
import { readHedgeBook, removeHedgeContract, saveHedgeContract } from "@/lib/saved-forwards.functions";
import { useRegulatorAuth } from "@/lib/regulator-auth";

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

export type BookContract = ForwardContract & { id?: string };

export function useForwardBook() {
  const { user, ready: authReady } = useRegulatorAuth();
  const qc = useQueryClient();
  const [store, setStore] = useState<Store>(EMPTY);
  const [localReady, setLocalReady] = useState(false);
  useEffect(() => {
    setStore(read());
    setLocalReady(true);
    subs.add(setStore);
    return () => { subs.delete(setStore); };
  }, []);

  const readFn = useServerFn(readHedgeBook);
  const saveFn = useServerFn(saveHedgeContract);
  const removeFn = useServerFn(removeHedgeContract);
  const key = ["hedge-book", user?.id ?? "none"];
  const saved = useQuery({ queryKey: key, queryFn: () => readFn(), enabled: Boolean(user), staleTime: 60_000, retry: 1 });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const save = useMutation({ mutationFn: (c: SaveForwardInput) => saveFn({ data: c }), onSuccess: refresh });
  const drop = useMutation({ mutationFn: (id: string) => removeFn({ data: { id } }), onSuccess: refresh });

  if (user) {
    const contracts: BookContract[] = (saved.data?.rows ?? []).map(rowToContract);
    return {
      mode: "account" as const,
      email: user.email ?? saved.data?.email ?? "",
      contracts,
      marks: (saved.data?.marks ?? []) as HedgeMark[],
      markNote: saved.data?.markNote ?? "",
      loadError: saved.error ? (saved.error as Error).message : "",
      nextSeq: 0,
      ready: !saved.isPending,
      saving: save.isPending,
      book: async (c: ForwardContract) => (await save.mutateAsync(c)).ref,
      remove: (c: BookContract) => { if (c.id) drop.mutate(c.id); },
      clear: undefined,
    };
  }
  return {
    mode: "local" as const,
    email: "",
    contracts: store.contracts as BookContract[],
    marks: [] as HedgeMark[],
    markNote: "",
    loadError: "",
    nextSeq: store.seq + 1,
    ready: localReady && authReady,
    saving: false,
    book: async (c: ForwardContract) => { const s = read(); write({ seq: s.seq + 1, contracts: [c, ...s.contracts] }); return c.ref; },
    remove: (c: BookContract) => { const s = read(); write({ ...s, contracts: s.contracts.filter((x) => x.ref !== c.ref) }); },
    clear: () => { const s = read(); write({ seq: s.seq, contracts: [] }); },
  };
}
