import { z } from "zod";

export async function readObservedHistory(code: string) {

    const end = new Date(); const start = new Date(end); start.setUTCFullYear(start.getUTCFullYear() - 5);
    const source = "Frankfurter · ECB reference rates";
    if (code === "INR") return { points: [{ date: start.toISOString().slice(0, 10), value: 1 }, { date: end.toISOString().slice(0, 10), value: 1 }], source: "INR identity pair", error: null };
    try {
      const response = await fetch(`https://api.frankfurter.dev/v1/${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}?base=${code}&symbols=INR`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Unsupported currency");
      const parsed = z.object({ rates: z.record(z.object({ INR: z.number().positive() })) }).parse(await response.json());
      const points = Object.entries(parsed.rates).sort(([a], [b]) => a.localeCompare(b)).map(([date, r]) => ({ date, value: r.INR }));
      if (points.length < 2) throw new Error("No history");
      return { points, source, error: null };
    } catch { return { points: [], source, error: "Observed five-year history is unavailable for this currency. No synthetic series is substituted." }; }
}
