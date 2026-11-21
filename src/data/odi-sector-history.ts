/**
 * India's actual Overseas Direct Investment (ODI) outflows, FY2000-01 to FY2025-26.
 *
 * Measure: "actual ODI outflow" = equity + loans + guarantees invoked (guarantees
 * issued are excluded), in US$ million, as published by RBI / Ministry of Finance (DEA).
 * Each year uses the latest official revision found; DEA figures are provisional.
 * Sector split follows RBI's nine-sector activity classification and is only filled
 * where an official year-wise table publishes it. Years without one stay `null` —
 * never estimated.
 */

export const ODI_SECTORS = [
  { key: "fin", label: "Financial, insurance & business services", short: "Financial & business services", color: "var(--color-sector-1)" },
  { key: "mfg", label: "Manufacturing", short: "Manufacturing", color: "var(--color-sector-2)" },
  { key: "trade", label: "Wholesale, retail trade, restaurants & hotels", short: "Trade & hospitality", color: "var(--color-sector-3)" },
  { key: "agri", label: "Agriculture & mining", short: "Agriculture & mining", color: "var(--color-sector-4)" },
  { key: "transport", label: "Transport, storage & communication", short: "Transport & communication", color: "var(--color-sector-5)" },
  { key: "community", label: "Community, social & personal services", short: "Community & social services", color: "var(--color-sector-6)" },
  { key: "construction", label: "Construction", short: "Construction", color: "var(--color-sector-7)" },
  { key: "utilities", label: "Electricity, gas & water", short: "Electricity, gas & water", color: "var(--color-sector-8)" },
  { key: "misc", label: "Miscellaneous", short: "Miscellaneous", color: "var(--color-sector-9)" },
] as const;

export type SectorKey = (typeof ODI_SECTORS)[number]["key"];
export type SectorSplit = Record<SectorKey, number>;

export const ODI_SOURCES = {
  rbiKhan2012: {
    label: "RBI — H R Khan, “Outward Indian FDI: Recent Trends & Emerging Issues”, 2 Mar 2012 (Tables 1 & 3)",
    url: "https://rbi.org.in/scripts/BS_SpeechesView.aspx?Id=674",
  },
  isid2019: {
    label: "ISID Working Paper 214 (2019), Table 3 — compiled from RBI ODI data",
    url: "https://isid.org.in/wp-content/uploads/2022/07/WP214.pdf",
  },
  dea2017: {
    label: "Ministry of Finance (DEA) ODI fact sheet, March 2017",
    url: "https://dea.gov.in/files/overseas_direct_investment_documents/March_Format17.pdf",
  },
  dea2019: {
    label: "Ministry of Finance (DEA) ODI fact sheet, April 2016 – March 2019",
    url: "https://dea.gov.in/files/overseas_direct_investment_documents/ODI_Fact_sheet_April_2016_to_March_2019.pdf",
  },
  dea2021: {
    label: "Ministry of Finance (DEA) ODI fact sheet, March 2021",
    url: "https://dea.gov.in/files/overseas_direct_investment_documents/FDI_Factsheet_for_March_2021.pdf",
  },
  dea2022: {
    label: "Ministry of Finance (DEA) ODI fact sheet, March 2022",
    url: "https://dea.gov.in/files/overseas_direct_investment_documents/ODI_Factsheet_March_2022.pdf",
  },
  dea2023: {
    label: "Ministry of Finance (DEA) ODI fact sheet, March 2023",
    url: "https://dea.gov.in/files/overseas_direct_investment_documents/ODI_FACTSHEET_MARCH_2023.pdf",
  },
  dea2024: {
    label: "Ministry of Finance (DEA) ODI fact sheet, March 2024",
    url: "https://dea.gov.in/files/overseas_direct_investment_documents/DraftFactsheetMarch2024.pdf",
  },
  dea2025: {
    label: "Ministry of Finance (DEA) ODI fact sheet, March 2025",
    url: "https://dea.gov.in/files/overseas_direct_investment_documents/DraftODI_Factsheet_March_2025.pdf",
  },
  dea2026: {
    label: "Ministry of Finance (DEA) ODI fact sheet, March 2026 (data as on 1 Apr 2026, provisional)",
    url: "https://dea.gov.in/files/overseas_direct_investment_documents/Draft%20Factsheet%20of%20March%202026.pdf",
  },
  rbiFx: {
    label: "RBI Handbook of Statistics, Table 139 — ₹ per US$, financial-year average",
    url: "https://www.rbi.org.in/scripts/PublicationsView.aspx?id=22613",
  },
} as const;

export type OdiSourceId = keyof typeof ODI_SOURCES;

export type OdiYear = {
  /** Financial year, April–March, e.g. "2025-26". */
  fy: string;
  /** Actual ODI outflow, US$ million. */
  usdMn: number;
  /** RBI financial-year average ₹ per US$. */
  inrPerUsd: number;
  /** True when the year's average is compiled from RBI reference rates but not yet in RBI's Handbook table. */
  rateCompiled?: boolean;
  /** Nine-sector split in US$ million, or null when no official split was found. */
  sectors: SectorSplit | null;
  source: OdiSourceId;
  note?: string;
};

const s = (fin: number, mfg: number, trade: number, agri: number, transport: number, community: number, construction: number, utilities: number, misc: number): SectorSplit => ({
  fin, mfg, trade, agri, transport, community, construction, utilities, misc,
});

export const ODI_HISTORY: OdiYear[] = [
  { fy: "2000-01", usdMn: 677.67, inrPerUsd: 45.6844, sectors: null, source: "rbiKhan2012" },
  { fy: "2001-02", usdMn: 1000.07, inrPerUsd: 47.6919, sectors: null, source: "rbiKhan2012" },
  { fy: "2002-03", usdMn: 1848.38, inrPerUsd: 48.3953, sectors: null, source: "rbiKhan2012" },
  { fy: "2003-04", usdMn: 1566.58, inrPerUsd: 45.9516, sectors: null, source: "rbiKhan2012" },
  { fy: "2004-05", usdMn: 1995.16, inrPerUsd: 44.9315, sectors: null, source: "rbiKhan2012" },
  { fy: "2005-06", usdMn: 7856.49, inrPerUsd: 44.2735, sectors: null, source: "rbiKhan2012" },
  { fy: "2006-07", usdMn: 13309.9, inrPerUsd: 45.2495, sectors: null, source: "rbiKhan2012" },
  { fy: "2007-08", usdMn: 18506.48, inrPerUsd: 40.2607, sectors: null, source: "rbiKhan2012" },
  { fy: "2008-09", usdMn: 18578.7, inrPerUsd: 45.9933, sectors: s(3550, 10180, 1170, 2380, 310, 390, 350, 140, 120), source: "rbiKhan2012", note: "RBI published this split in US$ billion to two decimals; agriculture appears as “agriculture & allied activities”." },
  { fy: "2009-10", usdMn: 13714.07, inrPerUsd: 47.4433, sectors: s(4410, 5350, 1130, 950, 380, 180, 360, 840, 110), source: "rbiKhan2012", note: "RBI published this split in US$ billion to two decimals." },
  { fy: "2010-11", usdMn: 16843.37, inrPerUsd: 45.5626, sectors: s(6530, 5040, 1890, 1210, 820, 700, 380, 100, 180), source: "rbiKhan2012", note: "RBI published this split in US$ billion to two decimals." },
  { fy: "2011-12", usdMn: 14613.6, inrPerUsd: 47.9229, sectors: null, source: "isid2019", note: "Secondary compilation from RBI monthly ODI data; not reconciled with RBI’s part-year figure of US$8.86 bn to 22 Feb 2012." },
  { fy: "2012-13", usdMn: 10207.2, inrPerUsd: 54.4099, sectors: null, source: "isid2019", note: "Secondary compilation from RBI monthly ODI data." },
  { fy: "2013-14", usdMn: 13377.08, inrPerUsd: 60.5019, sectors: s(1817.93, 2688.54, 1073.98, 6330.6, 716.52, 427.9, 210.82, 36.45, 74.34), source: "dea2017", note: "Total is the sum of the published sector rows." },
  { fy: "2014-15", usdMn: 6742.43, inrPerUsd: 61.1436, sectors: s(1969.28, 2009.19, 818.09, 485.2, 782.02, 330.66, 298.19, 10.3, 39.5), source: "dea2017", note: "Total is the sum of the published sector rows." },
  { fy: "2015-16", usdMn: 10579.72, inrPerUsd: 65.4685, sectors: s(2376.98, 4202.28, 1445.75, 378.8, 735.18, 574.65, 237.31, 574.35, 54.42), source: "dea2017", note: "Total is the sum of the published sector rows." },
  { fy: "2016-17", usdMn: 15271.37, inrPerUsd: 67.072, sectors: s(4561.83, 3713.15, 2020.62, 1751.31, 1515.68, 655.02, 311.51, 618.98, 123.27), source: "dea2019", note: "Total is the sum of the published sector rows." },
  { fy: "2017-18", usdMn: 14559.87, inrPerUsd: 64.4549, sectors: s(6600.12, 2812.76, 1324.38, 2013.06, 912.71, 364.52, 398.85, 60.1, 73.37), source: "dea2019", note: "Total is the sum of the published sector rows." },
  { fy: "2018-19", usdMn: 13513.46, inrPerUsd: 69.9229, sectors: s(5341.6, 3008.02, 1776.73, 2013.72, 113.77, 309.54, 763.05, 140.45, 46.58), source: "dea2021" },
  { fy: "2019-20", usdMn: 13173, inrPerUsd: 70.897, sectors: s(3761, 3449, 2521, 658, 907, 200, 834, 797, 46), source: "dea2022" },
  { fy: "2020-21", usdMn: 15696, inrPerUsd: 74.225, sectors: s(4331, 6541, 2952, 841, 144, 170, 497, 166, 54), source: "dea2023" },
  { fy: "2021-22", usdMn: 18528, inrPerUsd: 74.5039, sectors: s(8157, 4249, 2317, 1010, 323, 1346, 1030, 74, 22), source: "dea2024" },
  { fy: "2022-23", usdMn: 13629, inrPerUsd: 80.3635, sectors: s(4057, 3543, 2904, 1208, 838, 323, 591, 109, 56), source: "dea2025" },
  { fy: "2023-24", usdMn: 14499, inrPerUsd: 82.7897, sectors: s(6441, 3066, 1847, 777, 992, 467, 687, 197, 25), source: "dea2026" },
  { fy: "2024-25", usdMn: 24183, inrPerUsd: 84.58, rateCompiled: true, sectors: s(11797, 4566, 3797, 1333, 1180, 781, 445, 231, 53), source: "dea2026" },
  { fy: "2025-26", usdMn: 26746, inrPerUsd: 88.31, rateCompiled: true, sectors: s(11384, 4698, 2928, 1679, 2578, 1697, 569, 1017, 196), source: "dea2026" },
];

/** Context markers drawn on the chart; each is a documented policy or market event. */
export const ODI_MARKERS = [
  { fy: "2008-09", label: "Global financial crisis; outflows fall the next year" },
  { fy: "2013-14", label: "Aug 2013: RBI cuts the automatic-route ceiling from 400% to 100% of net worth (restored to 400% in Jul 2014)" },
  { fy: "2022-23", label: "22 Aug 2022: FEM (Overseas Investment) Rules and Regulations 2022 notified" },
] as const;
