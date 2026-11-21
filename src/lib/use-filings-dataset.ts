import { useEffect, useState } from "react";
import RBI_ODI from "@/data/rbi-odi-aug2026.json";
import { supabase } from "@/integrations/supabase/client";
import type { RbiFlow } from "@/lib/frontier";

export function useFilingsDataset() {
  const [ds, setDs] = useState({ period: RBI_ODI.period, released: RBI_ODI.released, url: RBI_ODI.url, rows: RBI_ODI.rows as RbiFlow[] });
  useEffect(() => {
    let active = true;
    supabase.from("rbi_odi_releases").select("period,released,page_url,rows,status").eq("status", "loaded").then(({ data }) => {
      const best = (data ?? []).filter((d) => Array.isArray(d.rows)).sort((a, b) => Date.parse(`1 ${b.period}`) - Date.parse(`1 ${a.period}`))[0];
      if (active && best && Date.parse(`1 ${best.period}`) >= Date.parse(`1 ${RBI_ODI.period}`))
        setDs({ period: best.period, released: best.released ?? "", url: best.page_url, rows: best.rows as unknown as RbiFlow[] });
    });
    return () => { active = false; };
  }, []);
  return ds;
}