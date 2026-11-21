/**
 * Agent memory (client-safe, thread-scoped).
 *
 * A single-shot prompt forgets the desk between questions. The rail keeps three
 * tiers, the same split a production agent runtime uses:
 *
 *   working   — the last N turns, replayed verbatim into the next prompt
 *   episodic  — one compact line per completed run (question → route → verdict)
 *   semantic  — durable facts the desk asserted (entity, hub, net worth, route)
 *
 * Memory is persisted per thread so a reviewer can reopen the desk tomorrow and
 * the agent still knows which entity and corridor the conversation is about.
 */

const KEY = "cv.agent.memory.v1";
const MAX_WORKING = 12;
const MAX_EPISODIC = 40;

export type Turn = { role: "user" | "agent"; text: string; at: number };
export type Episode = {
  id: string;
  at: number;
  question: string;
  route: string;
  verdict: string;
  latencyMs: number;
  costUsd: number;
};
export type Fact = { key: string; value: string; at: number; source: string };

export type Thread = {
  id: string;
  title: string;
  working: Turn[];
  episodic: Episode[];
  semantic: Fact[];
};

type Store = { threads: Record<string, Thread>; active: string };

export function blank(id: string): Thread {
  return { id, title: "Statutory thread", working: [], episodic: [], semantic: [] };
}

function read(): Store {
  if (typeof window === "undefined") return { threads: {}, active: "t1" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { threads: { t1: blank("t1") }, active: "t1" };
    const s = JSON.parse(raw) as Store;
    if (!s.threads[s.active]) s.threads[s.active] = blank(s.active);
    return s;
  } catch {
    return { threads: { t1: blank("t1") }, active: "t1" };
  }
}

const subs = new Set<(t: Thread) => void>();

function write(s: Store) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(s));
  const t = s.threads[s.active];
  if (t) subs.forEach((f) => f(t));
}

export function activeThread(): Thread {
  const s = read();
  return s.threads[s.active] ?? blank(s.active);
}

export function subscribeMemory(fn: (t: Thread) => void): () => void {
  subs.add(fn);
  fn(activeThread());
  return () => subs.delete(fn);
}

export function remember(turn: Turn) {
  const s = read();
  const t = s.threads[s.active] ?? blank(s.active);
  t.working = [...t.working, turn].slice(-MAX_WORKING);
  s.threads[s.active] = t;
  write(s);
}

export function recordEpisode(e: Episode) {
  const s = read();
  const t = s.threads[s.active] ?? blank(s.active);
  t.episodic = [e, ...t.episodic].slice(0, MAX_EPISODIC);
  s.threads[s.active] = t;
  write(s);
}

/** Upsert a durable fact; later assertions of the same key win. */
export function assertFact(key: string, value: string, source: string) {
  const s = read();
  const t = s.threads[s.active] ?? blank(s.active);
  t.semantic = [
    { key, value, at: Date.now(), source },
    ...t.semantic.filter((f) => f.key !== key),
  ].slice(0, 24);
  s.threads[s.active] = t;
  write(s);
}

export function newThread(title: string) {
  const s = read();
  const id = `t${Date.now().toString(36)}`;
  s.threads[id] = { ...blank(id), title };
  s.active = id;
  write(s);
}

export function clearMemory() {
  write({ threads: { t1: blank("t1") }, active: "t1" });
}

/**
 * Context engineering: compress memory into a bounded preamble instead of
 * pasting the whole history. Facts first (cheapest, highest signal), then the
 * last outcomes, then the tail of the dialogue.
 */
export function buildContext(t: Thread, budgetChars = 1400): string {
  const parts: string[] = [];
  if (t.semantic.length)
    parts.push(
      `Known facts: ${t.semantic.map((f) => `${f.key}=${f.value}`).join("; ")}`,
    );
  if (t.episodic.length)
    parts.push(
      `Recent determinations: ${t.episodic
        .slice(0, 3)
        .map((e) => `"${e.question.slice(0, 60)}" → ${e.route} (${e.verdict})`)
        .join(" | ")}`,
    );
  if (t.working.length)
    parts.push(
      `Dialogue: ${t.working
        .slice(-4)
        .map((w) => `${w.role}: ${w.text.slice(0, 140)}`)
        .join(" / ")}`,
    );
  return parts.join("\n").slice(0, budgetChars);
}
