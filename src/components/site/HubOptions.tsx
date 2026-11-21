import { HUBS } from "@/data/hubs";
import { AFRICA_HUBS } from "@/data/africa-hubs";
import { COUNTRY_META } from "@/data/currencies";

/** <option> groups for hub pickers: the 52 global hubs, then the 10 African SADC/COMESA hubs. */
export function HubOptions({ withCurrency = false }: { withCurrency?: boolean }) {
  const label = (city: string, country: string) =>
    withCurrency ? `${city} — ${COUNTRY_META[country]?.currency ?? "USD"}` : city;
  return (
    <>
      <optgroup label="52 global hubs">
        {HUBS.map((h) => <option key={h.city} value={h.city}>{label(h.city, h.country)}</option>)}
      </optgroup>
      <optgroup label="+10 African hubs · SADC & COMESA">
        {AFRICA_HUBS.map((h) => <option key={h.city} value={h.city}>{label(h.city, h.country)} · {h.blocs.join(" + ")}</option>)}
      </optgroup>
    </>
  );
}
