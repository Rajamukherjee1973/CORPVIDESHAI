/**
 * Browser training notebook — every rating is kept here so the desk can show and
 * export it; signed-in ratings are also saved to the person's account.
 * NOTE: guest examples sent to the server are bounded style hints only. Signed-in
 * runs ignore them and use the account's own stored ratings instead.
 */
import { useEffect, useState } from "react";
import { endorsedAnswer, selectExamples, type ClientExample, type ReviewedExample, type TrainableAgent } from "@/lib/agents/training";

const KEY = "cv.agent.training.v1";
const MAX = 200;
const subs = new Set<(rows: ReviewedExample[]) => void>();

function read(): ReviewedExample[] {
  if (typeof window === "undefined") return [];
  try {
    const rows = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as ReviewedExample[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function notebookRows(): ReviewedExample[] {
  return read();
}

export function addToNotebook(row: Omit<ReviewedExample, "at" | "origin">) {
  const rows = [{ ...row, at: new Date().toISOString(), origin: "browser" as const }, ...read()].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(rows));
  subs.forEach((f) => f(rows));
}

export function clearNotebook() {
  window.localStorage.removeItem(KEY);
  subs.forEach((f) => f([]));
}

/** Loads after hydration so the first render matches the server. */
export function useTrainingNotebook(): ReviewedExample[] {
  const [rows, setRows] = useState<ReviewedExample[]>([]);
  useEffect(() => {
    setRows(read());
    subs.add(setRows);
    return () => { subs.delete(setRows); };
  }, []);
  return rows;
}

/** Up to three endorsed browser examples nearest this question, in the shape the server accepts. */
export function guestExamplesFor(agent: TrainableAgent, question: string): ClientExample[] {
  return selectExamples(agent, question, read(), 3, 1600).map((e) => ({
    question: e.question.slice(0, 400),
    answer: (endorsedAnswer(e) ?? e.answer).slice(0, 1200),
  }));
}
