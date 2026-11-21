import { useEffect, useState } from "react";

/** One focused company shared by the Treasury Console and the live universe board. */
const KEY = "cv.treasury.focus";
const DEFAULT = "Reliance Industries";
const subs = new Set<(n: string) => void>();

export function setTreasuryFocus(name: string) {
  try {
    sessionStorage.setItem(KEY, name);
  } catch {
    /* storage unavailable */
  }
  subs.forEach((f) => f(name));
}

export function useTreasuryFocus(): [string, (n: string) => void] {
  const [name, setName] = useState(DEFAULT);
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(KEY);
      if (v) setName(v);
    } catch {
      /* ignore */
    }
    subs.add(setName);
    return () => {
      subs.delete(setName);
    };
  }, []);
  return [name, setTreasuryFocus];
}
