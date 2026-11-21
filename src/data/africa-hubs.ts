/**
 * Ten African financial hubs inside the SADC and COMESA trade blocs, kept as a
 * separate group alongside the 52 global hubs (the 52 count is unchanged).
 *
 * Treaty status follows India's published comprehensive DTAA list; entries with
 * `verify` must be confirmed against the current CBDT listing before reliance.
 * Clearance days are illustrative prototype estimates, not measured times.
 * Not tax, legal or investment advice.
 */
import type { Hub } from "./hubs";

export type AfricanBloc = "SADC" | "COMESA";

export type AfricaHub = Hub & {
  iso2: string;
  currency: string;
  currencyName: string;
  blocs: AfricanBloc[];
  exchange: string;
  centre: string;
  indianAngle: string;
  dtaa: "In force" | "None";
  arrangement: string;
  verify?: boolean;
};

export const AFRICA_HUBS: AfricaHub[] = [
  {
    city: "Gaborone", country: "Botswana", iso2: "BW", currency: "BWP", currencyName: "Botswana Pula", lat: -24.65, lng: 25.91,
    route: "ODI", treaty: "DTAA", wht: "Treaty-specific", days: 29, blocs: ["SADC"], dtaa: "In force",
    exchange: "Botswana Stock Exchange · DCI", centre: "Seat of the SADC Secretariat; investment-grade sovereign.",
    indianAngle: "Diamond beneficiation, mining services and SADC regional holding.",
    arrangement: "India–SACU preferential trade talks", note: "SADC regional holding seat; Rule 7 headroom and substance review apply.",
  },
  {
    city: "Windhoek", country: "Namibia", iso2: "NA", currency: "NAD", currencyName: "Namibian Dollar", lat: -22.56, lng: 17.08,
    route: "ODI", treaty: "DTAA", wht: "Treaty-specific", days: 30, blocs: ["SADC"], dtaa: "In force",
    exchange: "Namibian Stock Exchange · NSX Overall", centre: "Common Monetary Area member; dollar pegged 1:1 to the rand.",
    indianAngle: "Uranium, green hydrogen and critical-minerals projects; Walvis Bay port access.",
    arrangement: "India–SACU preferential trade talks", note: "Rand-pegged corridor; hedge decisions follow ZAR.",
  },
  {
    city: "Dar es Salaam", country: "Tanzania", iso2: "TZ", currency: "TZS", currencyName: "Tanzanian Shilling", lat: -6.79, lng: 39.21,
    route: "ODI", treaty: "DTAA", wht: "Treaty-specific", days: 31, blocs: ["SADC"], dtaa: "In force",
    exchange: "Dar es Salaam Stock Exchange · DSE All Share", centre: "Main port and commercial capital; EAC and SADC member.",
    indianAngle: "Agri-processing, pharmaceuticals and port logistics into East and Central Africa.",
    arrangement: "No bilateral trade agreement", note: "Gateway port to landlocked SADC and EAC markets.",
  },
  {
    city: "Maputo", country: "Mozambique", iso2: "MZ", currency: "MZN", currencyName: "Mozambican Metical", lat: -25.97, lng: 32.57,
    route: "ODI", treaty: "DTAA", wht: "Treaty-specific", days: 32, blocs: ["SADC"], dtaa: "In force",
    exchange: "Bolsa de Valores de Moçambique", centre: "Energy and corridor-logistics capital of the SADC east coast.",
    indianAngle: "Indian public-sector oil companies hold stakes in Rovuma Area 1 LNG; coal and pulses supply.",
    arrangement: "No bilateral trade agreement", note: "Large energy ODI corridor; security and project-risk review.",
  },
  {
    city: "Luanda", country: "Angola", iso2: "AO", currency: "AOA", currencyName: "Angolan Kwanza", lat: -8.84, lng: 13.23,
    route: "ODI", treaty: "No DTAA", wht: "Domestic rate", days: 34, blocs: ["SADC"], dtaa: "None",
    exchange: "BODIVA · Angola Debt & Securities Exchange", centre: "Oil-led economy; kwanza convertibility checks required.",
    indianAngle: "Crude-oil supply relationship, infrastructure contracting and pharma distribution.",
    arrangement: "No bilateral trade agreement", note: "No treaty relief; repatriation and FX availability are the long poles.",
  },
  {
    city: "Lusaka", country: "Zambia", iso2: "ZM", currency: "ZMW", currencyName: "Zambian Kwacha", lat: -15.39, lng: 28.32,
    route: "ODI", treaty: "DTAA", wht: "Treaty-specific", days: 31, blocs: ["SADC", "COMESA"], dtaa: "In force",
    exchange: "Lusaka Securities Exchange · LuSE All Share", centre: "Seat of the COMESA Secretariat; member of both blocs.",
    indianAngle: "Copper and critical-minerals ODI; a single seat that reaches both trade blocs.",
    arrangement: "No bilateral trade agreement", note: "Dual-bloc corridor after sovereign debt restructuring; lender diligence applies.",
  },
  {
    city: "Victoria", country: "Seychelles", iso2: "SC", currency: "SCR", currencyName: "Seychelles Rupee", lat: -4.62, lng: 55.45,
    route: "ODI", treaty: "TIEA only", wht: "Domestic rate", days: 30, blocs: ["SADC", "COMESA"], dtaa: "None",
    exchange: "MERJ Exchange", centre: "Island financial-services centre supervised by the Seychelles FSA.",
    indianAngle: "Indian Ocean holding and services use — enhanced substance and beneficial-ownership checks.",
    arrangement: "Tax Information Exchange Agreement (in force 2016)", note: "No DTAA relief; information exchange only.",
  },
  {
    city: "Kigali", country: "Rwanda", iso2: "RW", currency: "RWF", currencyName: "Rwandan Franc", lat: -1.95, lng: 30.06,
    route: "ODI", treaty: "No DTAA in force", wht: "Domestic rate", days: 30, blocs: ["COMESA"], dtaa: "None", verify: true,
    exchange: "Rwanda Stock Exchange · RSI", centre: "Kigali International Financial Centre (KIFC).",
    indianAngle: "KIFC regional holding and services hub; ICT, education and healthcare ODI.",
    arrangement: "Treaty talks reported; not on India's in-force DTAA list", note: "Financial-centre regime; treaty status to be re-verified.",
  },
  {
    city: "Kampala", country: "Uganda", iso2: "UG", currency: "UGX", currencyName: "Ugandan Shilling", lat: 0.35, lng: 32.58,
    route: "ODI", treaty: "DTAA", wht: "Treaty-specific", days: 31, blocs: ["COMESA"], dtaa: "In force",
    exchange: "Uganda Securities Exchange · USE All Share", centre: "COMESA and EAC member with a long-standing Indian business community.",
    indianAngle: "Sugar, agri-processing, pharmaceuticals and telecom ODI.",
    arrangement: "No bilateral trade agreement", note: "Established Indian-promoter corridor; KYC chain review.",
  },
  {
    city: "Addis Ababa", country: "Ethiopia", iso2: "ET", currency: "ETB", currencyName: "Ethiopian Birr", lat: 9.03, lng: 38.74,
    route: "ODI", treaty: "DTAA", wht: "Treaty-specific", days: 33, blocs: ["COMESA"], dtaa: "In force",
    exchange: "Ethiopian Securities Exchange (ESX)", centre: "African Union headquarters; birr moved to a market-based rate in 2024.",
    indianAngle: "Textiles, leather, floriculture and pharma manufacturing ODI.",
    arrangement: "No bilateral trade agreement", note: "Recently liberalised currency; repatriation checks dominate.",
  },
];

export const AFRICAN_BLOCS: Record<AfricanBloc, { name: string; founded: string; members: number; secretariat: string; note: string }> = {
  SADC: {
    name: "Southern African Development Community",
    founded: "1992 (as SADCC, 1980)",
    members: 16,
    secretariat: "Gaborone, Botswana",
    note: "Free Trade Area launched 2008; Protocol on Finance and Investment.",
  },
  COMESA: {
    name: "Common Market for Eastern and Southern Africa",
    founded: "1994",
    members: 21,
    secretariat: "Lusaka, Zambia",
    note: "Free Trade Area since 2000; Regional Payment and Settlement System (REPSS).",
  },
};

/** Bloc members that already sit inside the 52 global hubs. */
export const BLOC_HUBS_IN_52: { city: string; country: string; blocs: AfricanBloc[] }[] = [
  { city: "Johannesburg", country: "South Africa", blocs: ["SADC"] },
  { city: "Mauritius", country: "Mauritius", blocs: ["SADC", "COMESA"] },
  { city: "Nairobi", country: "Kenya", blocs: ["COMESA"] },
  { city: "Cairo", country: "Egypt", blocs: ["COMESA"] },
];

export function africaHubsInBloc(filter: "All" | AfricanBloc | "Both"): AfricaHub[] {
  if (filter === "All") return AFRICA_HUBS;
  if (filter === "Both") return AFRICA_HUBS.filter((h) => h.blocs.length === 2);
  return AFRICA_HUBS.filter((h) => h.blocs.includes(filter));
}
