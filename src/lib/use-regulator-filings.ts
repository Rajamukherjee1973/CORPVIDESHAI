import { useQuery } from "@tanstack/react-query";
import { readRegulatorFilings } from "./regulator-filings.functions";
import { useRegulatorAuth } from "./regulator-auth";
export function useRegulatorFilings() {
  const { user, ready } = useRegulatorAuth();
  const query = useQuery({ queryKey: ["regulator-filings", user?.id], queryFn: () => readRegulatorFilings(), enabled: ready && !!user, refetchInterval: 15000, retry: 1 });
  const records = (query.data?.records ?? []).map((r) => ({ ...r, filedOn: r.filed_on, recordedAt: r.recorded_at, simulation: true as const }));
  return { ...query, records, user, ready, role: query.data?.role, desk: query.data?.desk ?? null, publicDemo: !!query.data?.publicDemo, actions: query.data?.actions ?? [] };
}