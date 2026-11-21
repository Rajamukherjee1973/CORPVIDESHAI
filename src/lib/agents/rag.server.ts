/**
 * Retrieval — embeddings-backed vector search over the statutory corpus.
 *
 * The corpus is embedded once per process with the Lovable AI Gateway
 * embeddings endpoint and held in an in-process vector index (the same shape a
 * pgvector table would hold: id, vector, payload). Queries are embedded and
 * ranked by cosine similarity, which retrieves on meaning rather than on the
 * words a treasury officer happened to type. If the embeddings endpoint is
 * unavailable the module degrades to the deterministic lexical retriever, so
 * the graph never loses its grounding.
 */

import { CORPUS, retrieve as lexical } from "./corpus";
import type { RetrievedChunk } from "./types";

const MODEL = "google/gemini-embedding-2";
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/embeddings";

type IndexRow = { id: string; vec: number[] };
let index: IndexRow[] | null = null;
let building: Promise<IndexRow[] | null> | null = null;

async function embed(inputs: string[], key: string): Promise<number[][] | null> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { index: number; embedding: number[] }[] };
  if (!json.data) return null;
  const out: number[][] = [];
  for (const d of json.data) out[d.index] = d.embedding;
  return out;
}

async function buildIndex(key: string): Promise<IndexRow[] | null> {
  const batches: (typeof CORPUS)[] = [];
  for (let i = 0; i < CORPUS.length; i += 90) batches.push(CORPUS.slice(i, i + 90));
  const rows: IndexRow[] = [];
  for (const b of batches) {
    const vecs = await embed(
      b.map((d) => `${d.title}. ${d.source}. ${d.text}`),
      key,
    );
    if (!vecs) return null;
    b.forEach((d, i) => {
      const v = vecs[i];
      if (v) rows.push({ id: d.id, vec: v });
    });
  }
  return rows;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export type RetrievalResult = {
  chunks: RetrievedChunk[];
  mode: "vector" | "lexical";
  indexed: number;
  dims: number;
};

/** Semantic retrieval with a deterministic lexical fallback. */
export async function semanticRetrieve(query: string, k = 4): Promise<RetrievalResult> {
  const key = process.env["LOVABLE_API_KEY"];
  const fallback = (): RetrievalResult => ({
    chunks: lexical(query, k),
    mode: "lexical",
    indexed: CORPUS.length,
    dims: 0,
  });
  if (!key) return fallback();

  try {
    if (!index) {
      building = building ?? buildIndex(key);
      index = await building;
      building = null;
    }
    if (!index) return fallback();

    const qv = (await embed([query], key))?.[0];
    if (!qv) return fallback();

    const scored = index
      .map((r) => ({ r, s: cosine(qv, r.vec) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, k);

    const chunks: RetrievedChunk[] = scored.flatMap(({ r, s }) => {
      const doc = CORPUS.find((d) => d.id === r.id);
      if (!doc) return [];
      return [
        {
          id: doc.id,
          title: doc.title,
          source: doc.source,
          text: doc.text,
          score: Number(s.toFixed(3)),
          origin: "enterprise" as const,
        },
      ];
    });

    return { chunks, mode: "vector", indexed: index.length, dims: qv.length };
  } catch {
    return fallback();
  }
}
