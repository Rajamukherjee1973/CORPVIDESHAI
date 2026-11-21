export type Hub = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  route: "ODI" | "OPI" | "ODI / OPI";
  treaty: string;
  wht: string;
  days: number;
  note: string;
};

export const HUBS: Hub[] = [
  { city: "Singapore", country: "Singapore", lat: 1.35, lng: 103.82, route: "ODI / OPI", treaty: "DTAA + LOB", wht: "10% / 15%", days: 24, note: "Most-used holding jurisdiction for Indian outbound; Rule 7 headroom tested against consolidated net worth." },
  { city: "Dubai (DIFC)", country: "UAE", lat: 25.21, lng: 55.28, route: "ODI / OPI", treaty: "DTAA", wht: "10%", days: 21, note: "Substance tests under FEMA(ODI) Rules 2022; commonly used for trading and treasury arms." },
  { city: "London", country: "United Kingdom", lat: 51.51, lng: -0.13, route: "ODI / OPI", treaty: "DTAA", wht: "10% / 15%", days: 26, note: "Section 195 withholding analysis usually dominates clearance time." },
  { city: "New York", country: "United States", lat: 40.71, lng: -74.01, route: "ODI / OPI", treaty: "DTAA", wht: "15%", days: 29, note: "Form 15CA/15CB pairing plus FIRC reconciliation is the long pole." },
  { city: "GIFT IFSC", country: "India", lat: 23.16, lng: 72.68, route: "ODI / OPI", treaty: "Domestic / IFSCA", wht: "Nil (unit)", days: 6, note: "Onshore-offshore rail; IFSCA-supervised and the pilot corridor for CorpVidesh." },
  { city: "Hong Kong", country: "Hong Kong SAR", lat: 22.32, lng: 114.17, route: "ODI", treaty: "DTAA", wht: "10%", days: 25, note: "Enhanced beneficial-ownership diligence at AD bank level." },
  { city: "Zurich", country: "Switzerland", lat: 47.38, lng: 8.54, route: "ODI / OPI", treaty: "DTAA + MFN", wht: "10%", days: 27, note: "MFN clause interpretation is a recurring dispute trigger." },
  { city: "Luxembourg", country: "Luxembourg", lat: 49.61, lng: 6.13, route: "OPI", treaty: "DTAA", wht: "10%", days: 23, note: "Fund-vehicle route; OPI limits apply to listed-entity investment." },
  { city: "Amsterdam", country: "Netherlands", lat: 52.37, lng: 4.9, route: "ODI / OPI", treaty: "DTAA", wht: "10%", days: 25, note: "Treaty benefit contingent on PPT under MLI." },
  { city: "Dublin", country: "Ireland", lat: 53.35, lng: -6.26, route: "ODI / OPI", treaty: "DTAA", wht: "10%", days: 24, note: "Fund domicile of choice; ICAV structures need layered ODI disclosure." },
  { city: "Frankfurt", country: "Germany", lat: 50.11, lng: 8.68, route: "ODI", treaty: "DTAA", wht: "10%", days: 26, note: "Acquisition financing scrutiny under ODI debt caps." },
  { city: "Paris", country: "France", lat: 48.86, lng: 2.35, route: "ODI", treaty: "DTAA", wht: "10%", days: 27, note: "Valuation certificate requirements drive resubmission." },
  { city: "Tokyo", country: "Japan", lat: 35.68, lng: 139.69, route: "ODI", treaty: "DTAA", wht: "10%", days: 28, note: "JV disclosure and step-down subsidiary reporting." },
  { city: "Shanghai", country: "China", lat: 31.23, lng: 121.47, route: "ODI", treaty: "DTAA", wht: "10%", days: 34, note: "Press Note 3 adjacency; heightened government-approval pathway." },
  { city: "Seoul", country: "South Korea", lat: 37.57, lng: 126.98, route: "ODI", treaty: "DTAA", wht: "10%", days: 27, note: "Technology JV route with royalty-flow interplay." },
  { city: "Sydney", country: "Australia", lat: -33.87, lng: 151.21, route: "ODI", treaty: "DTAA", wht: "15%", days: 26, note: "Resources JV route; FIRB clearance runs in parallel." },
  { city: "Toronto", country: "Canada", lat: 43.65, lng: -79.38, route: "ODI", treaty: "DTAA", wht: "15%", days: 27, note: "Pension co-invest structures require layered UBO proof." },
  { city: "Chicago", country: "United States", lat: 41.88, lng: -87.63, route: "ODI", treaty: "DTAA", wht: "15%", days: 29, note: "Derivatives and hedging approvals sit outside the ODI envelope." },
  { city: "San Francisco", country: "United States", lat: 37.77, lng: -122.42, route: "OPI", treaty: "DTAA", wht: "15%", days: 28, note: "Venture OPI route; startup SAFE instruments contested as ODI." },
  { city: "Boston", country: "United States", lat: 42.36, lng: -71.06, route: "OPI", treaty: "DTAA", wht: "15%", days: 28, note: "Fund LP commitments drawn down in tranches complicate Rule 7." },
  { city: "Geneva", country: "Switzerland", lat: 46.2, lng: 6.14, route: "ODI", treaty: "DTAA", wht: "10%", days: 26, note: "Commodity trading desks; transfer-pricing exposure." },
  { city: "Milan", country: "Italy", lat: 45.46, lng: 9.19, route: "ODI", treaty: "DTAA", wht: "15%", days: 28, note: "Manufacturing acquisition route." },
  { city: "Madrid", country: "Spain", lat: 40.42, lng: -3.7, route: "ODI", treaty: "DTAA", wht: "15%", days: 28, note: "Infrastructure concessions with LatAm step-downs." },
  { city: "Stockholm", country: "Sweden", lat: 59.33, lng: 18.07, route: "ODI", treaty: "DTAA", wht: "10%", days: 25, note: "Deep-tech acquisition route." },
  { city: "Oslo", country: "Norway", lat: 59.91, lng: 10.75, route: "ODI", treaty: "DTAA", wht: "10%", days: 25, note: "Energy transition JV route." },
  { city: "Copenhagen", country: "Denmark", lat: 55.68, lng: 12.57, route: "ODI", treaty: "DTAA", wht: "15%", days: 25, note: "Renewables platform investments." },
  { city: "Helsinki", country: "Finland", lat: 60.17, lng: 24.94, route: "ODI", treaty: "DTAA", wht: "10%", days: 25, note: "Industrial tech JV route." },
  { city: "Vienna", country: "Austria", lat: 48.21, lng: 16.37, route: "ODI", treaty: "DTAA", wht: "10%", days: 26, note: "CEE holding platform." },
  { city: "Brussels", country: "Belgium", lat: 50.85, lng: 4.35, route: "ODI", treaty: "DTAA", wht: "15%", days: 26, note: "EU regulatory-facing entities." },
  { city: "Warsaw", country: "Poland", lat: 52.23, lng: 21.01, route: "ODI", treaty: "DTAA", wht: "15%", days: 27, note: "Nearshoring and services delivery centres." },
  { city: "Lisbon", country: "Portugal", lat: 38.72, lng: -9.14, route: "ODI", treaty: "DTAA", wht: "10%", days: 27, note: "Lusophone-Africa gateway." },
  { city: "Tel Aviv", country: "Israel", lat: 32.09, lng: 34.78, route: "OPI", treaty: "DTAA", wht: "10%", days: 26, note: "Defence-adjacent tech triggers additional diligence." },
  { city: "Abu Dhabi (ADGM)", country: "UAE", lat: 24.45, lng: 54.38, route: "ODI / OPI", treaty: "DTAA", wht: "10%", days: 21, note: "Sovereign co-investment structures." },
  { city: "Riyadh", country: "Saudi Arabia", lat: 24.71, lng: 46.68, route: "ODI", treaty: "DTAA", wht: "10%", days: 24, note: "Local-content JV mandates alter shareholding tests." },
  { city: "Doha", country: "Qatar", lat: 25.29, lng: 51.53, route: "ODI", treaty: "DTAA", wht: "10%", days: 24, note: "Energy and infrastructure JVs." },
  { city: "Manama", country: "Bahrain", lat: 26.23, lng: 50.59, route: "ODI", treaty: "DTAA", wht: "10%", days: 23, note: "Regional treasury centres." },
  { city: "Muscat", country: "Oman", lat: 23.59, lng: 58.41, route: "ODI", treaty: "DTAA", wht: "10%", days: 23, note: "Logistics and port JVs." },
  { city: "Nairobi", country: "Kenya", lat: -1.29, lng: 36.82, route: "ODI", treaty: "DTAA", wht: "10%", days: 30, note: "East Africa operating subsidiaries; repatriation risk flagged." },
  { city: "Johannesburg", country: "South Africa", lat: -26.2, lng: 28.05, route: "ODI", treaty: "DTAA", wht: "10%", days: 30, note: "Exchange-control interplay on both sides." },
  { city: "Lagos", country: "Nigeria", lat: 6.52, lng: 3.38, route: "ODI", treaty: "No DTAA", wht: "20%", days: 33, note: "No treaty relief; full-rate withholding modelled." },
  { city: "Cairo", country: "Egypt", lat: 30.04, lng: 31.24, route: "ODI", treaty: "DTAA", wht: "10%", days: 31, note: "Currency convertibility constraints." },
  { city: "Mauritius", country: "Mauritius", lat: -20.16, lng: 57.5, route: "ODI / OPI", treaty: "DTAA + LOB", wht: "7.5%", days: 22, note: "GAAR and substance testing scrutinised at AD bank stage." },
  { city: "São Paulo", country: "Brazil", lat: -23.55, lng: -46.63, route: "ODI", treaty: "DTAA", wht: "15%", days: 32, note: "Layered LatAm holding chains." },
  { city: "Mexico City", country: "Mexico", lat: 19.43, lng: -99.13, route: "ODI", treaty: "DTAA", wht: "10%", days: 31, note: "Nearshoring manufacturing route." },
  { city: "Santiago", country: "Chile", lat: -33.45, lng: -70.67, route: "ODI", treaty: "DTAA", wht: "10%", days: 31, note: "Mining and lithium JV route." },
  { city: "Bogotá", country: "Colombia", lat: 4.71, lng: -74.07, route: "ODI", treaty: "DTAA", wht: "10%", days: 32, note: "Services delivery subsidiaries." },
  { city: "Bangkok", country: "Thailand", lat: 13.76, lng: 100.5, route: "ODI", treaty: "DTAA", wht: "10%", days: 27, note: "ASEAN manufacturing shift." },
  { city: "Kuala Lumpur", country: "Malaysia", lat: 3.14, lng: 101.69, route: "ODI", treaty: "DTAA", wht: "10%", days: 27, note: "Labuan structures need extra substance proof." },
  { city: "Jakarta", country: "Indonesia", lat: -6.21, lng: 106.85, route: "ODI", treaty: "DTAA", wht: "10%", days: 29, note: "Resources and digital JVs." },
  { city: "Ho Chi Minh City", country: "Vietnam", lat: 10.82, lng: 106.63, route: "ODI", treaty: "DTAA", wht: "10%", days: 29, note: "Electronics supply-chain relocation." },
  { city: "Manila", country: "Philippines", lat: 14.6, lng: 120.98, route: "ODI", treaty: "DTAA", wht: "15%", days: 29, note: "BPO capacity build-out." },
  { city: "Colombo", country: "Sri Lanka", lat: 6.93, lng: 79.86, route: "ODI", treaty: "DTAA", wht: "10%", days: 28, note: "Sovereign-stress overlay on repatriation." },
];

export const REGULATORS = [
  { code: "IFSCA", name: "International Financial Services Centres Authority", sees: "Unit-level transaction record inside GIFT IFSC", when: "At origination, live", proof: "Rail membership + full ledger read" },
  { code: "RBI", name: "Reserve Bank of India", sees: "Rule 7 headroom, ODI/OPI route, LRN lifecycle", when: "Pre-remittance, live", proof: "Zero-knowledge headroom proof" },
  { code: "SEBI", name: "Securities and Exchange Board of India", sees: "Listed-entity disclosure and related-party overlap", when: "On event trigger", proof: "Signed disclosure hash" },
  { code: "MCA", name: "Ministry of Corporate Affairs", sees: "Beneficial ownership and step-down subsidiary chain", when: "On structure change", proof: "UBO chain attestation" },
  { code: "CBDT", name: "Central Board of Direct Taxes", sees: "Section 195 position, 15CA-15CB pairing", when: "At filing", proof: "Machine-checkable 15CB lineage" },
  { code: "AD Bank", name: "Authorised Dealer Category-I", sees: "Full documentary set and FIRC reconciliation", when: "At execution", proof: "Complete evidence bundle" },
];