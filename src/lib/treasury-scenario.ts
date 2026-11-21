import { useEffect, useState } from "react";
import { findHub } from "@/data/hub-catalog";
import { findPurpose } from "@/data/purposes";
import { COUNTRY_META } from "@/data/currencies";

export const SCENARIO_CURRENCIES = Array.from(new Set([...Object.values(COUNTRY_META).map((c) => c.currency), "INR"])).sort();
export type TreasuryScenario = { hub: string; purpose: string; amountCr: number; currency?: string | undefined; rationale?: string | undefined };
export function scenarioCurrency(s: TreasuryScenario): string {
  return s.currency ?? COUNTRY_META[findHub(s.hub)?.country ?? ""]?.currency ?? "USD";
}
export const DEFAULT_SCENARIO: TreasuryScenario = { hub: "Singapore", purpose: "ODI-001", amountCr: 475 };
const KEY = "cv.treasury.scenario.v1";
const subscribers = new Set<(s: TreasuryScenario) => void>();
let current = DEFAULT_SCENARIO;

export function validScenario(value: unknown): value is TreasuryScenario {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<TreasuryScenario>;
  return !!findHub(v.hub ?? "") && !!findPurpose(v.purpose ?? "") && typeof v.amountCr === "number" && Number.isFinite(v.amountCr) && v.amountCr > 0 && (v.currency === undefined || SCENARIO_CURRENCIES.includes(v.currency)) && (v.rationale === undefined || typeof v.rationale === "string" && v.rationale.length <= 1500);
}

export function setTreasuryScenario(patch: Partial<TreasuryScenario>) {
  const next = { ...current, ...patch };
  // A currency override belongs to its hub: changing hub without naming a currency restores the hub's own currency.
  if (patch.hub !== undefined && patch.hub !== current.hub && !("currency" in patch)) delete next.currency;
  if (!validScenario(next)) return;
  current = next;
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* memory-only */ }
  subscribers.forEach((fn) => fn(next));
}

/** Public demonstration inputs only; never used for company authorization or private record writes. */
export function useTreasuryScenario(): [TreasuryScenario, typeof setTreasuryScenario] {
  const [scenario, setScenario] = useState(DEFAULT_SCENARIO);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      const restored: unknown = raw ? JSON.parse(raw) : current;
      if (validScenario(restored)) current = restored;
    } catch { /* keep defaults */ }
    setScenario(current);
    subscribers.add(setScenario);
    return () => { subscribers.delete(setScenario); };
  }, []);
  return [scenario, setTreasuryScenario];
}

export function scenarioAmounts(amountCr: number, inrPerUnit: number | undefined) {
  return {
    foreignAmount: inrPerUnit && Number.isFinite(inrPerUnit) && inrPerUnit > 0 ? amountCr * 1e7 / inrPerUnit : null,
    adverseFxCostCr: amountCr * 0.01,
  };
}

export const DEMO_REVIEWERS = [
  { code: "RBI", lens: "FEMA route & reporting", evidence: "Route basis · net-worth certificate" },
  { code: "IFSCA", lens: "IFSC unit perimeter", evidence: "IBU mandate · unit eligibility" },
  { code: "FIU-IND", lens: "AML & beneficial ownership", evidence: "KYC · ownership chain" },
  { code: "CBDT", lens: "Tax & treaty evidence", evidence: "Chargeability · TRC / Form 10F" },
  { code: "MoF", lens: "Policy oversight lens", evidence: "Strategic-sector context" },
  { code: "DPIIT", lens: "Industrial-policy lens", evidence: "Sector · investment rationale" },
] as const;

export function demoReviewStatus(elapsedMs: number, laneIndex: number): "Queued" | "Reviewing" | "Response ready" {
  if (elapsedMs < 0) return "Queued";
  return elapsedMs < 1200 + laneIndex * 450 ? "Reviewing" : "Response ready";
}