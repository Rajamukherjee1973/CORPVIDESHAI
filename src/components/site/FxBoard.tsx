import { useEffect, useState } from "react";

const TOP: [string, string, string][] = [
  ["USD", "US Dollar", "AMER"], ["EUR", "Euro", "EMEA"], ["GBP", "Pound Sterling", "EMEA"],
  ["JPY", "Japanese Yen", "APAC"], ["CHF", "Swiss Franc", "EMEA"], ["SGD", "Singapore Dollar", "APAC"],
  ["HKD", "Hong Kong Dollar", "APAC"], ["CNY", "Chinese Yuan", "APAC"], ["AUD", "Australian Dollar", "APAC"],
  ["CAD", "Canadian Dollar", "AMER"], ["NZD", "NZ Dollar", "APAC"], ["SEK", "Swedish Krona", "EMEA"],
  ["NOK", "Norwegian Krone", "EMEA"], ["DKK", "Danish Krone", "EMEA"], ["KRW", "Korean Won", "APAC"],
  ["THB", "Thai Baht", "APAC"], ["MYR", "Malaysian Ringgit", "APAC"], ["IDR", "Indonesian Rupiah", "APAC"],
  ["PHP", "Philippine Peso", "APAC"], ["ZAR", "South African Rand", "AFR"], ["BRL", "Brazilian Real", "AMER"],
  ["MXN", "Mexican Peso", "AMER"], ["TRY", "Turkish Lira", "EMEA"], ["PLN", "Polish Zloty", "EMEA"],
  ["ILS", "Israeli Shekel", "MENA"],
];

const CLOCKS: [string, string][] = [
  ["GIFT IFSC", "Asia/Kolkata"],
  ["Singapore", "Asia/Singapore"],
  ["Dubai", "Asia/Dubai"],
  ["London", "Europe/London"],
  ["New York", "America/New_York"],
];

const CR = 1_00_00_000;

export function FxBoard() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [prev, setPrev] = useState<Record<string, number>>({});
  const [state, setState] = useState<"loading" | "live" | "offline">("loading");
  const [stamp, setStamp] = useState("");
  const [amount, setAmount] = useState(1 * CR);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch(
          `https://api.frankfurter.dev/v1/latest?base=INR&symbols=${TOP.map((t) => t[0]).join(",")}`,
        );
        const d = (await r.json()) as { rates?: Record<string, number>; date?: string };
        if (!alive || !d.rates) throw new Error("feed");
        setPrev((p) => (Object.keys(p).length ? p : d.rates!));
        setRates((old) => {
          if (Object.keys(old).length) setPrev(old);
          return d.rates!;
        });
        setStamp(d.date ?? "");
        setState("live");
      } catch {
        if (alive) setState((s) => (s === "live" ? "live" : "offline"));
      }
    };
    void pull();
    const fx = setInterval(pull, 60_000);
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => {
      alive = false;
      clearInterval(fx);
      clearInterval(tick);
    };
  }, []);

  const total = TOP.reduce((a, [c]) => a + (rates[c] ? 1 : 0), 0);

  return (
    <div className="border border-rule/25">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule/15 px-6 py-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">
            INR spot board · top 25
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            European Central Bank reference fixings via frankfurter.dev, polled every 60 seconds.
          </p>
        </div>
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {state === "live" ? `Live · ${stamp} · ${total}/25 priced` : state === "loading" ? "Syncing" : "Feed unreachable"}
        </p>
      </div>

      <div className="grid gap-px bg-rule/15 md:grid-cols-5">
        {CLOCKS.map(([city, tz]) => (
          <div key={city} className="bg-background px-5 py-4">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {city}
            </p>
            <p className="tnum font-display mt-1 text-2xl">
              {now ? now.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }) : "--:--"}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-rule/15 px-6 py-5">
        <label className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Principal to price in parallel (INR)
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="number"
            value={amount}
            min={0}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            className="tnum w-64 border border-rule/25 bg-transparent px-3 py-2 text-lg outline-none focus:border-primary"
          />
          {[
            ["₹1 L", 1_00_000],
            ["₹1 Cr", CR],
            ["₹100 Cr", 100 * CR],
            ["₹1,000 Cr", 1000 * CR],
          ].map(([l, v]) => (
            <button
              key={String(l)}
              onClick={() => setAmount(Number(v))}
              className="font-mono-ui border border-rule/25 px-3 py-2 text-[11px] uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border-t border-rule/15">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {["Currency", "Region", "1 INR →", "1 unit → INR", "Δ vs prev tick", "Converted"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-mono-ui text-[10px] uppercase tracking-[0.14em]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOP.map(([code, name, region]) => {
              const r = rates[code];
              const p = prev[code];
              const delta = r && p ? r - p : 0;
              return (
                <tr key={code} className="border-t border-rule/10">
                  <td className="px-4 py-2.5">
                    <span className="font-mono-ui text-[11px] tracking-[0.1em] text-primary">{code}</span>{" "}
                    <span className="text-muted-foreground">{name}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {region}
                  </td>
                  <td className="tnum px-4 py-2.5">{r ? r.toFixed(4) : "—"}</td>
                  <td className="tnum px-4 py-2.5">{r ? (1 / r).toFixed(2) : "—"}</td>
                  <td className="tnum px-4 py-2.5 text-muted-foreground">
                    {r ? `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}` : "—"}
                  </td>
                  <td className="tnum px-4 py-2.5">
                    {r ? `${code} ${(amount * r).toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-rule/15 px-6 py-4 text-sm text-muted-foreground">
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-primary">In plain words —</span>{" "}
        one rupee amount, priced at the same moment in 25 currencies, so a treasury can see exactly what lands
        at each hub before it commits.
      </p>
    </div>
  );
}
