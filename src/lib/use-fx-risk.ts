import { useQuery } from "@tanstack/react-query";
import { measuredFxRisk } from "@/lib/fx-risk.functions";
import { hubCurrencies } from "@/lib/hub-compare";

export const HUB_CCYS = hubCurrencies();

/** Measured currency risk for every hub currency; one cached request shared by hub-page panels. */
export function useMeasuredFxRisk(enabled = true) {
  return useQuery({
    queryKey: ["measured-fx-risk", HUB_CCYS],
    queryFn: () => measuredFxRisk({ data: { codes: HUB_CCYS } }),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 1,
    enabled,
  });
}
