/**
 * Every hub a treasury scenario can target: the 52 global hubs plus the
 * separate group of 10 African SADC/COMESA hubs. HUBS itself stays at 52.
 */
import { HUBS, type Hub } from "./hubs";
import { AFRICA_HUBS } from "./africa-hubs";

export const SCENARIO_HUBS: Hub[] = [...HUBS, ...AFRICA_HUBS];

export function findHub(city: string): Hub | undefined {
  return SCENARIO_HUBS.find((h) => h.city === city);
}

export function isAfricanBlocHub(city: string): boolean {
  return AFRICA_HUBS.some((h) => h.city === city);
}
