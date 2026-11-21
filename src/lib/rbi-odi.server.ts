import { RBI_LIST_URL, findLatestRelease, findOfdiFile, isXlsx, keepForRadar, parseOfdiMatrix } from "@/lib/rbi-odi";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", Accept: "*/*" };

async function getText(url: string) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`RBI returned ${r.status} for ${url}`);
  return r.text();
}

/** Check RBI for the newest monthly release and try to load it. One run = at most 3 requests to RBI. */
export async function syncRbiOdi() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const latest = findLatestRelease(await getText(RBI_LIST_URL));
  if (!latest) return { status: "error", note: "Could not find a release on RBI's list page." };

  const { data: existing } = await supabaseAdmin.from("rbi_odi_releases").select("status").eq("period", latest.period).maybeSingle();
  if (existing?.status === "loaded") return { status: "loaded", period: latest.period, note: "Already loaded." };

  const pageUrl = `https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=${latest.prid}`;
  const pageHtml = await getText(pageUrl);
  const fileUrl = findOfdiFile(pageHtml);
  const releasedMatch = /<th[^>]*>\s*([A-Z][a-z]{2} \d{1,2}, \d{4})\s*<\/th>/.exec(pageHtml);
  const base = { period: latest.period, page_url: pageUrl, file_url: fileUrl, released: releasedMatch?.[1] ?? null, checked_at: new Date().toISOString() };

  const save = async (row: Record<string, unknown>) => {
    const { error } = await supabaseAdmin.from("rbi_odi_releases").upsert({ ...base, ...row } as never);
    if (error) throw new Error(`Saving release failed: ${error.message}`);
  };

  if (!fileUrl) {
    await save({ status: "error", note: "Release found but it has no company spreadsheet link." });
    return { status: "error", period: latest.period };
  }

  let bytes = new Uint8Array();
  let why = "";
  try {
    const r = await fetch(fileUrl, { headers: { ...UA, Referer: pageUrl }, signal: AbortSignal.timeout(30000) });
    bytes = new Uint8Array(await r.arrayBuffer());
    if (!r.ok || !isXlsx(bytes)) why = `HTTP ${r.status}, ${r.headers.get("content-type") ?? "unknown"}`;
  } catch (e) {
    why = e instanceof Error ? e.message : String(e);
  }
  if (why) {
    await save({ status: "blocked", note: `RBI's website blocked the automatic download (${why}).` });
    return { status: "blocked", period: latest.period };
  }

  const XLSX = await import("xlsx");
  const wb = XLSX.read(bytes, { type: "array" });
  const sheetName = wb.SheetNames.find((n) => /annex\s*2|ofdi details/i.test(n)) ?? wb.SheetNames[1] ?? wb.SheetNames[0]!;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, { header: 1, raw: true });
  const all = parseOfdiMatrix(matrix);
  if (all.length === 0) {
    await save({ status: "error", note: "Spreadsheet downloaded but no company rows were found." });
    return { status: "error", period: latest.period };
  }
  const total = all.reduce((s, f) => s + f.total, 0);
  await save({
    status: "loaded", note: null, total_rows: all.length, total_usd_mn: Math.round(total * 100) / 100,
    rows: keepForRadar(all), loaded_at: new Date().toISOString(),
  });
  return { status: "loaded", period: latest.period, rows: all.length };
}
