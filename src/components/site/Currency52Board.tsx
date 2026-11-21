import { useMemo, useRef, useState } from "react";
import { useFxStream } from "@/lib/fx-stream";
import { flag } from "@/data/currencies";

/** 52 major world currencies quoted against the Indian Rupee. */
export const MAJOR_52: { code: string; name: string; iso2: string; region: string }[] = [
  { code: "USD", name: "US Dollar", iso2: "US", region: "Americas" },
  { code: "EUR", name: "Euro", iso2: "EU", region: "Europe" },
  { code: "GBP", name: "Pound Sterling", iso2: "GB", region: "Europe" },
  { code: "JPY", name: "Japanese Yen", iso2: "JP", region: "Asia-Pacific" },
  { code: "CHF", name: "Swiss Franc", iso2: "CH", region: "Europe" },
  { code: "CNY", name: "Chinese Yuan", iso2: "CN", region: "Asia-Pacific" },
  { code: "AUD", name: "Australian Dollar", iso2: "AU", region: "Asia-Pacific" },
  { code: "CAD", name: "Canadian Dollar", iso2: "CA", region: "Americas" },
  { code: "NZD", name: "New Zealand Dollar", iso2: "NZ", region: "Asia-Pacific" },
  { code: "SGD", name: "Singapore Dollar", iso2: "SG", region: "Asia-Pacific" },
  { code: "HKD", name: "Hong Kong Dollar", iso2: "HK", region: "Asia-Pacific" },
  { code: "KRW", name: "South Korean Won", iso2: "KR", region: "Asia-Pacific" },
  { code: "TWD", name: "New Taiwan Dollar", iso2: "TW", region: "Asia-Pacific" },
  { code: "THB", name: "Thai Baht", iso2: "TH", region: "Asia-Pacific" },
  { code: "MYR", name: "Malaysian Ringgit", iso2: "MY", region: "Asia-Pacific" },
  { code: "IDR", name: "Indonesian Rupiah", iso2: "ID", region: "Asia-Pacific" },
  { code: "PHP", name: "Philippine Peso", iso2: "PH", region: "Asia-Pacific" },
  { code: "VND", name: "Vietnamese Dong", iso2: "VN", region: "Asia-Pacific" },
  { code: "LKR", name: "Sri Lankan Rupee", iso2: "LK", region: "South Asia" },
  { code: "BDT", name: "Bangladeshi Taka", iso2: "BD", region: "South Asia" },
  { code: "NPR", name: "Nepalese Rupee", iso2: "NP", region: "South Asia" },
  { code: "PKR", name: "Pakistani Rupee", iso2: "PK", region: "South Asia" },
  { code: "AED", name: "UAE Dirham", iso2: "AE", region: "Middle East" },
  { code: "SAR", name: "Saudi Riyal", iso2: "SA", region: "Middle East" },
  { code: "QAR", name: "Qatari Riyal", iso2: "QA", region: "Middle East" },
  { code: "KWD", name: "Kuwaiti Dinar", iso2: "KW", region: "Middle East" },
  { code: "BHD", name: "Bahraini Dinar", iso2: "BH", region: "Middle East" },
  { code: "OMR", name: "Omani Rial", iso2: "OM", region: "Middle East" },
  { code: "ILS", name: "Israeli Shekel", iso2: "IL", region: "Middle East" },
  { code: "TRY", name: "Turkish Lira", iso2: "TR", region: "Europe" },
  { code: "SEK", name: "Swedish Krona", iso2: "SE", region: "Europe" },
  { code: "NOK", name: "Norwegian Krone", iso2: "NO", region: "Europe" },
  { code: "DKK", name: "Danish Krone", iso2: "DK", region: "Europe" },
  { code: "PLN", name: "Polish Zloty", iso2: "PL", region: "Europe" },
  { code: "CZK", name: "Czech Koruna", iso2: "CZ", region: "Europe" },
  { code: "HUF", name: "Hungarian Forint", iso2: "HU", region: "Europe" },
  { code: "RON", name: "Romanian Leu", iso2: "RO", region: "Europe" },
  { code: "ISK", name: "Icelandic Krona", iso2: "IS", region: "Europe" },
  { code: "KZT", name: "Kazakhstani Tenge", iso2: "KZ", region: "Asia-Pacific" },
  { code: "ZAR", name: "South African Rand", iso2: "ZA", region: "Africa" },
  { code: "NGN", name: "Nigerian Naira", iso2: "NG", region: "Africa" },
  { code: "KES", name: "Kenyan Shilling", iso2: "KE", region: "Africa" },
  { code: "EGP", name: "Egyptian Pound", iso2: "EG", region: "Africa" },
  { code: "MAD", name: "Moroccan Dirham", iso2: "MA", region: "Africa" },
  { code: "MUR", name: "Mauritian Rupee", iso2: "MU", region: "Africa" },
  { code: "BRL", name: "Brazilian Real", iso2: "BR", region: "Americas" },
  { code: "MXN", name: "Mexican Peso", iso2: "MX", region: "Americas" },
  { code: "CLP", name: "Chilean Peso", iso2: "CL", region: "Americas" },
  { code: "COP", name: "Colombian Peso", iso2: "CO", region: "Americas" },
  { code: "PEN", name: "Peruvian Sol", iso2: "PE", region: "Americas" },
  { code: "ARS", name: "Argentine Peso", iso2: "AR", region: "Americas" },
  { code: "UYU", name: "Uruguayan Peso", iso2: "UY", region: "Americas" },
];

const REGIONS = ["All", "Asia-Pacific", "South Asia", "Middle East", "Europe", "Africa", "Americas"];

function fmt(v: number) {
  return v >= 100 ? v.toFixed(2) : v >= 1 ? v.toFixed(4) : v.toFixed(6);
}

/** Live board: every one of the 52 majors priced in rupees, ticking with the shared tape. */
export function Currency52Board() {
  const t = useFxStream();
  const open = useRef<Record<string, number>>({});
  const [region, setRegion] = useState("All");
  const [sort, setSort] = useState<"list" | "gain" | "loss">("list");
  if (t.status === "live") for (const c of MAJOR_52) if (open.current[c.code] == null && t.inrPer[c.code]) open.current[c.code] = t.inrPer[c.code]!;

  const rows = useMemo(() => {
    const r = MAJOR_52.filter((c) => region === "All" || c.region === region).map((c) => {
      const px = t.inrPer[c.code];
      const o = open.current[c.code];
      return { ...c, px, chg: px && o ? ((px - o) / o) * 1e4 : 0, prev: t.prev[c.code] };
    });
    if (sort === "gain") r.sort((a, b) => b.chg - a.chg);
    if (sort === "loss") r.sort((a, b) => a.chg - b.chg);
    return r;
  }, [t, region, sort]);
  const missing = MAJOR_52.filter((c) => !t.inrPer[c.code]).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {REGIONS.map((r) => (
          <button key={r} type="button" onClick={() => setRegion(r)} className={`h-8 border px-3 font-mono-ui text-[10px] uppercase tracking-[0.14em] ${region === r ? "border-primary bg-primary text-primary-foreground" : "border-rule/30"}`}>{r}</button>
        ))}
        <select aria-label="Sort currencies" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-8 border border-rule/30 bg-background px-2 text-xs">
          <option value="list">Major order</option>
          <option value="gain">Strongest vs ₹ since open</option>
          <option value="loss">Weakest vs ₹ since open</option>
        </select>
        <span className="ml-auto flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${t.status === "live" ? "animate-pulse bg-primary" : "bg-muted-foreground"}`} />
          {t.status} · print #{t.seq} · {t.source || "connecting"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px border border-rule/20 bg-rule/20 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {rows.map((c) => {
          const up = c.px && c.prev ? c.px > c.prev : false;
          const down = c.px && c.prev ? c.px < c.prev : false;
          return (
            <div key={c.code} className="bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{flag(c.iso2 === "EU" ? "EU" : c.iso2)} {c.code}/INR</span>
                <span className={`text-xs ${up ? "text-foreground" : down ? "text-destructive" : "text-muted-foreground"}`}>{up ? "▲" : down ? "▼" : "■"}</span>
              </div>
              <div className="tnum mt-1 font-display text-2xl">{c.px ? fmt(c.px) : "—"}</div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate">{c.name}</span>
                <span className={`tnum ${c.chg > 0 ? "font-medium text-foreground" : c.chg < 0 ? "text-destructive" : ""}`}>{c.chg >= 0 ? "+" : ""}{c.chg.toFixed(1)} bps</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Rupees per 1 unit of each currency. Anchored every 60 s on the public interbank composite ({t.anchor || "awaiting anchor"}) with sub-second interpolation between anchors; "since open" counts from when this page loaded. {missing ? `${missing} currency(ies) not quoted by the feed right now.` : "All 52 quoted."} Indicative — not an execution or FBIL benchmark rate.
      </p>
    </div>
  );
}
