/**
 * India's intergovernmental arrangements with each hub jurisdiction.
 * Compiled from public Income Tax Department (DTAA), Department of Commerce
 * (trade agreements) and DEA (investment treaty) listings. Status changes over
 * time: entries flagged `verify` should be confirmed against the official
 * source before reliance. Not legal advice.
 */
export type Arrangement = {
  dtaa: "In force" | "Limited" | "None";
  trade: string;
  investment: string;
  payments?: string;
  verify?: boolean;
};

const EU_TRADE = "India–EU FTA negotiations";
const EU: Arrangement = { dtaa: "In force", trade: EU_TRADE, investment: "BIT terminated 2017; India–EU investment protection talks", verify: true };
const ASEAN = "ASEAN–India Trade in Goods Agreement (2010)";
const GCC = "India–GCC FTA negotiations";

export const ARRANGEMENTS: Record<string, Arrangement> = {
  Singapore: { dtaa: "In force", trade: `CECA (2005) · ${ASEAN}`, investment: "Investment chapter under CECA", payments: "UPI–PayNow link (2023)" },
  UAE: { dtaa: "In force", trade: "CEPA (in force 2022)", investment: "Bilateral Investment Treaty (2024)", payments: "Local-currency settlement framework (2023) · UPI acceptance" },
  "United Kingdom": { dtaa: "In force", trade: "India–UK CETA (signed 2025)", investment: "BIT terminated 2017; treaty talks", payments: "UPI acceptance pilots", verify: true },
  "United States": { dtaa: "In force", trade: "Bilateral trade agreement talks", investment: "No BIT", verify: true },
  India: { dtaa: "In force", trade: "Domestic — IFSCA jurisdiction", investment: "Domestic law (IFSC Authority Act 2019)" },
  "Hong Kong SAR": { dtaa: "In force", trade: "No trade agreement", investment: "No BIT in force" },
  Switzerland: { dtaa: "In force", trade: "EFTA–India TEPA (in force 2025)", investment: "BIT terminated 2017; TEPA investment commitment" },
  Luxembourg: EU, Netherlands: EU, Ireland: EU, Germany: EU, Finland: EU, Austria: EU, Belgium: EU, Portugal: EU, Italy: EU, Spain: EU, Sweden: EU, Denmark: EU, Poland: EU,
  France: { ...EU, payments: "UPI acceptance (2024)" },
  Japan: { dtaa: "In force", trade: "CEPA (2011)", investment: "Investment chapter under CEPA" },
  China: { dtaa: "In force", trade: "Asia-Pacific Trade Agreement (both members)", investment: "No BIT; Press Note 3 restrictions on inbound" },
  "South Korea": { dtaa: "In force", trade: "CEPA (2010) · APTA", investment: "Investment chapter under CEPA" },
  Australia: { dtaa: "In force", trade: "ECTA (in force 2022); CECA talks", investment: "BIT terminated 2017" },
  Canada: { dtaa: "In force", trade: "CEPA talks (paused)", investment: "FIPA terminated 2017", verify: true },
  Israel: { dtaa: "In force", trade: "FTA talks", investment: "Bilateral Investment Agreement (signed 2025)", verify: true },
  "Saudi Arabia": { dtaa: "In force", trade: GCC, investment: "No BIT in force" },
  Qatar: { dtaa: "In force", trade: GCC, investment: "BIT terminated; talks" },
  Bahrain: { dtaa: "In force", trade: GCC, investment: "BIT terminated 2017" },
  Oman: { dtaa: "In force", trade: "India–Oman CEPA (signed 2025)", investment: "BIT terminated 2017", verify: true },
  Kenya: { dtaa: "In force", trade: "No trade agreement", investment: "No BIT in force" },
  "South Africa": { dtaa: "In force", trade: "India–SACU PTA talks", investment: "BIT terminated 2017" },
  Nigeria: { dtaa: "None", trade: "No trade agreement", investment: "No BIT in force", verify: true },
  Egypt: { dtaa: "In force", trade: "No trade agreement", investment: "BIT terminated 2017" },
  Mauritius: { dtaa: "In force", trade: "CECPA (2021)", investment: "BIT terminated 2017", payments: "Local-currency settlement · UPI & RuPay (2024)" },
  Botswana: { dtaa: "In force", trade: "India–SACU PTA talks", investment: "No BIT in force", verify: true },
  Namibia: { dtaa: "In force", trade: "India–SACU PTA talks", investment: "No BIT in force", verify: true },
  Tanzania: { dtaa: "In force", trade: "No trade agreement", investment: "Verify current DEA listing", verify: true },
  Mozambique: { dtaa: "In force", trade: "No trade agreement", investment: "Verify current DEA listing", verify: true },
  Angola: { dtaa: "None", trade: "No trade agreement", investment: "No BIT in force", verify: true },
  Zambia: { dtaa: "In force", trade: "No trade agreement", investment: "Verify current DEA listing", verify: true },
  Seychelles: { dtaa: "None", trade: "No trade agreement", investment: "No BIT in force", payments: "Tax information exchange agreement (2016)" },
  Rwanda: { dtaa: "None", trade: "No trade agreement", investment: "Verify current DEA listing", verify: true },
  Uganda: { dtaa: "In force", trade: "No trade agreement", investment: "Verify current DEA listing", verify: true },
  Ethiopia: { dtaa: "In force", trade: "No trade agreement", investment: "Verify current DEA listing", verify: true },
  Brazil: { dtaa: "In force", trade: "India–MERCOSUR PTA (2009)", investment: "Investment Cooperation & Facilitation Treaty (signed 2020)", verify: true },
  Mexico: { dtaa: "In force", trade: "No trade agreement", investment: "BIT terminated 2017" },
  Chile: { dtaa: "None", trade: "Expanded PTA (2017); CEPA talks", investment: "No BIT in force", verify: true },
  Colombia: { dtaa: "In force", trade: "No trade agreement", investment: "BIT terminated 2017" },
  Thailand: { dtaa: "In force", trade: `${ASEAN} · early-harvest scheme`, investment: "BIT terminated 2017" },
  Malaysia: { dtaa: "In force", trade: `CECA (2011) · ${ASEAN}`, investment: "Investment chapter under CECA", payments: "INR trade settlement permitted" },
  Indonesia: { dtaa: "In force", trade: ASEAN, investment: "BIT terminated 2016", payments: "Local-currency settlement MoU (2024)" },
  Vietnam: { dtaa: "In force", trade: ASEAN, investment: "BIT terminated 2017" },
  Philippines: { dtaa: "In force", trade: ASEAN, investment: "BIT terminated 2017" },
  "Sri Lanka": { dtaa: "In force", trade: "ISFTA (2001) · APTA", investment: "BIT terminated 2017", payments: "UPI link (2024) · INR trade settlement" },
  Norway: { dtaa: "In force", trade: "EFTA–India TEPA (in force 2025)", investment: "TEPA investment commitment" },
};

export function arrangementFor(country: string): Arrangement {
  return ARRANGEMENTS[country] ?? { dtaa: "In force", trade: "Not catalogued", investment: "Not catalogued", verify: true };
}

/** 0–100 depth of India's arrangement stack with a jurisdiction (indicative). */
export function arrangementDepth(a: Arrangement): number {
  let s = a.dtaa === "In force" ? 40 : a.dtaa === "Limited" ? 20 : 0;
  if (/CEPA|CECA|ECTA|TEPA|CECPA|CETA|FTA \(|ISFTA|PTA \(/.test(a.trade) && !/talks|negotiations/.test(a.trade)) s += 30;
  else if (/ASEAN|APTA/.test(a.trade)) s += 18;
  else if (/talks|negotiations/.test(a.trade)) s += 6;
  if (/Treaty \(|Agreement \(|chapter|commitment|Facilitation/.test(a.investment)) s += 18;
  if (a.payments) s += 12;
  return Math.min(100, s);
}
