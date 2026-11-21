/**
 * Primary stock exchange and benchmark index for each of the 52 international
 * finance hubs the outbound rail serves, with the local cash session expressed
 * in UTC minutes so the board can show which floors are trading right now.
 *
 * `symbol` is the reference feed symbol. Where no public feed carries the local
 * benchmark, `symbol` is null and the board prints an indicative level.
 */

export type HubMarket = {
  city: string;
  country: string;
  /** Exchange operating the venue. */
  exchange: string;
  /** Benchmark index shown on the board. */
  index: string;
  /** Reference feed symbol, or null when no public feed carries it. */
  symbol: string | null;
  currency: string;
  /** Cash session in UTC minutes from midnight. */
  openUtc: number;
  closeUtc: number;
  region: "Asia Pacific" | "Middle East" | "Europe" | "Africa" | "Americas";
  note: string;
};

const hm = (h: number, m = 0) => h * 60 + m;

export const HUB_MARKETS: HubMarket[] = [
  { city: "Singapore", country: "Singapore", exchange: "Singapore Exchange (SGX)", index: "Straits Times Index", symbol: "^STI", currency: "SGD", openUtc: hm(1), closeUtc: hm(9), region: "Asia Pacific", note: "Deepest Asian venue for Indian holding structures." },
  { city: "Dubai (DIFC)", country: "UAE", exchange: "Dubai Financial Market", index: "DFM General Index", symbol: null, currency: "AED", openUtc: hm(6), closeUtc: hm(10), region: "Middle East", note: "DIFC-domiciled treasury and trading arms." },
  { city: "London", country: "United Kingdom", exchange: "London Stock Exchange", index: "FTSE 100", symbol: "^FTSE", currency: "GBP", openUtc: hm(8), closeUtc: hm(16, 30), region: "Europe", note: "Sets the European pricing session for the corridor." },
  { city: "New York", country: "United States", exchange: "New York Stock Exchange", index: "S&P 500", symbol: "^GSPC", currency: "USD", openUtc: hm(14, 30), closeUtc: hm(21), region: "Americas", note: "Reference equity benchmark for USD-settled outbound." },
  { city: "GIFT IFSC", country: "India", exchange: "NSE IX / India INX", index: "Nifty 50", symbol: "^NSEI", currency: "INR", openUtc: hm(3, 45), closeUtc: hm(10), region: "Asia Pacific", note: "The onshore-offshore rail; IFSCA-supervised." },
  { city: "Hong Kong", country: "Hong Kong SAR", exchange: "Hong Kong Exchanges (HKEX)", index: "Hang Seng Index", symbol: "^HSI", currency: "HKD", openUtc: hm(1, 30), closeUtc: hm(8), region: "Asia Pacific", note: "Beneficial-ownership diligence runs deep here." },
  { city: "Zurich", country: "Switzerland", exchange: "SIX Swiss Exchange", index: "SMI", symbol: "^SSMI", currency: "CHF", openUtc: hm(8), closeUtc: hm(16, 30), region: "Europe", note: "Private-bank and treasury corridor." },
  { city: "Luxembourg", country: "Luxembourg", exchange: "Luxembourg Stock Exchange", index: "LuxX Index", symbol: null, currency: "EUR", openUtc: hm(8), closeUtc: hm(16, 30), region: "Europe", note: "Fund-vehicle listings; OPI limits apply." },
  { city: "Amsterdam", country: "Netherlands", exchange: "Euronext Amsterdam", index: "AEX", symbol: "^AEX", currency: "EUR", openUtc: hm(8), closeUtc: hm(16, 30), region: "Europe", note: "Treaty benefit tested under the MLI principal-purpose test." },
  { city: "Dublin", country: "Ireland", exchange: "Euronext Dublin", index: "ISEQ Overall", symbol: "^ISEQ", currency: "EUR", openUtc: hm(8), closeUtc: hm(16, 30), region: "Europe", note: "ICAV fund domicile of choice." },
  { city: "Frankfurt", country: "Germany", exchange: "Deutsche Börse (XETRA)", index: "DAX", symbol: "^GDAXI", currency: "EUR", openUtc: hm(7), closeUtc: hm(16, 30), region: "Europe", note: "Acquisition-finance corridor." },
  { city: "Paris", country: "France", exchange: "Euronext Paris", index: "CAC 40", symbol: "^FCHI", currency: "EUR", openUtc: hm(7), closeUtc: hm(15, 30), region: "Europe", note: "Valuation-certificate scrutiny is highest here." },
  { city: "Tokyo", country: "Japan", exchange: "Japan Exchange Group (TSE)", index: "Nikkei 225", symbol: "^N225", currency: "JPY", openUtc: hm(0), closeUtc: hm(6), region: "Asia Pacific", note: "JV disclosure and step-down reporting." },
  { city: "Shanghai", country: "China", exchange: "Shanghai Stock Exchange", index: "SSE Composite", symbol: "000001.SS", currency: "CNY", openUtc: hm(1, 30), closeUtc: hm(7), region: "Asia Pacific", note: "Press Note 3 adjacency; government-approval pathway." },
  { city: "Seoul", country: "South Korea", exchange: "Korea Exchange", index: "KOSPI", symbol: "^KS11", currency: "KRW", openUtc: hm(0), closeUtc: hm(6, 30), region: "Asia Pacific", note: "Technology JV route with royalty interplay." },
  { city: "Sydney", country: "Australia", exchange: "Australian Securities Exchange", index: "S&P/ASX 200", symbol: "^AXJO", currency: "AUD", openUtc: hm(23), closeUtc: hm(6), region: "Asia Pacific", note: "Resources JV route; FIRB runs in parallel." },
  { city: "Toronto", country: "Canada", exchange: "Toronto Stock Exchange", index: "S&P/TSX Composite", symbol: "^GSPTSE", currency: "CAD", openUtc: hm(14, 30), closeUtc: hm(21), region: "Americas", note: "Pension co-invest structures." },
  { city: "Chicago", country: "United States", exchange: "Cboe / CME", index: "Dow Jones Industrial Average", symbol: "^DJI", currency: "USD", openUtc: hm(14, 30), closeUtc: hm(21), region: "Americas", note: "Derivatives and hedging sit outside the ODI envelope." },
  { city: "San Francisco", country: "United States", exchange: "Nasdaq (West Coast listings)", index: "Nasdaq Composite", symbol: "^IXIC", currency: "USD", openUtc: hm(14, 30), closeUtc: hm(21), region: "Americas", note: "Venture OPI route; SAFE instruments contested." },
  { city: "Boston", country: "United States", exchange: "Nasdaq / NYSE (fund seat)", index: "Russell 2000", symbol: "^RUT", currency: "USD", openUtc: hm(14, 30), closeUtc: hm(21), region: "Americas", note: "LP commitments drawn in tranches complicate Rule 7." },
  { city: "Geneva", country: "Switzerland", exchange: "SIX Swiss Exchange", index: "SMI", symbol: "^SSMI", currency: "CHF", openUtc: hm(8), closeUtc: hm(16, 30), region: "Europe", note: "Commodity trading desks; transfer-pricing exposure." },
  { city: "Milan", country: "Italy", exchange: "Borsa Italiana", index: "FTSE MIB", symbol: "FTSEMIB.MI", currency: "EUR", openUtc: hm(7), closeUtc: hm(15, 30), region: "Europe", note: "Manufacturing acquisition route." },
  { city: "Madrid", country: "Spain", exchange: "Bolsa de Madrid (BME)", index: "IBEX 35", symbol: "^IBEX", currency: "EUR", openUtc: hm(7), closeUtc: hm(15, 30), region: "Europe", note: "Infrastructure concessions with LatAm step-downs." },
  { city: "Stockholm", country: "Sweden", exchange: "Nasdaq Stockholm", index: "OMX Stockholm 30", symbol: "^OMX", currency: "SEK", openUtc: hm(8), closeUtc: hm(16, 25), region: "Europe", note: "Deep-tech acquisition route." },
  { city: "Oslo", country: "Norway", exchange: "Oslo Børs", index: "OSE All-Share", symbol: "^OSEAX", currency: "NOK", openUtc: hm(8), closeUtc: hm(15, 20), region: "Europe", note: "Energy-transition JV route." },
  { city: "Copenhagen", country: "Denmark", exchange: "Nasdaq Copenhagen", index: "OMX Copenhagen 25", symbol: "^OMXC25", currency: "DKK", openUtc: hm(8), closeUtc: hm(15, 55), region: "Europe", note: "Renewables platform investments." },
  { city: "Helsinki", country: "Finland", exchange: "Nasdaq Helsinki", index: "OMX Helsinki 25", symbol: "^OMXH25", currency: "EUR", openUtc: hm(7), closeUtc: hm(15, 25), region: "Europe", note: "Industrial tech JV route." },
  { city: "Vienna", country: "Austria", exchange: "Wiener Börse", index: "ATX", symbol: "^ATX", currency: "EUR", openUtc: hm(7, 55), closeUtc: hm(15, 35), region: "Europe", note: "CEE gateway structures." },
  { city: "Brussels", country: "Belgium", exchange: "Euronext Brussels", index: "BEL 20", symbol: "^BFX", currency: "EUR", openUtc: hm(7), closeUtc: hm(15, 30), region: "Europe", note: "Holding-company regime scrutiny." },
  { city: "Warsaw", country: "Poland", exchange: "Warsaw Stock Exchange", index: "WIG20", symbol: "WIG20.WA", currency: "PLN", openUtc: hm(8), closeUtc: hm(15, 50), region: "Europe", note: "Manufacturing and services JV corridor." },
  { city: "Lisbon", country: "Portugal", exchange: "Euronext Lisbon", index: "PSI", symbol: "PSI20.LS", currency: "EUR", openUtc: hm(8), closeUtc: hm(16, 30), region: "Europe", note: "Lusophone step-down corridor into Brazil and Africa." },
  { city: "Tel Aviv", country: "Israel", exchange: "Tel Aviv Stock Exchange", index: "TA-125", symbol: "^TA125.TA", currency: "ILS", openUtc: hm(6, 45), closeUtc: hm(14, 25), region: "Middle East", note: "Deep-tech OPI route." },
  { city: "Abu Dhabi (ADGM)", country: "UAE", exchange: "Abu Dhabi Securities Exchange", index: "FTSE ADX General", symbol: null, currency: "AED", openUtc: hm(6), closeUtc: hm(11), region: "Middle East", note: "Sovereign co-investment corridor." },
  { city: "Riyadh", country: "Saudi Arabia", exchange: "Saudi Exchange (Tadawul)", index: "TASI", symbol: "^TASI.SR", currency: "SAR", openUtc: hm(7), closeUtc: hm(12, 20), region: "Middle East", note: "Giga-project JV participation." },
  { city: "Doha", country: "Qatar", exchange: "Qatar Stock Exchange", index: "QE Index", symbol: null, currency: "QAR", openUtc: hm(6, 30), closeUtc: hm(10, 15), region: "Middle East", note: "Energy and infrastructure JV route." },
  { city: "Manama", country: "Bahrain", exchange: "Bahrain Bourse", index: "Bahrain All Share", symbol: null, currency: "BHD", openUtc: hm(6, 30), closeUtc: hm(9, 30), region: "Middle East", note: "Gulf treasury and Islamic finance seat." },
  { city: "Muscat", country: "Oman", exchange: "Muscat Stock Exchange", index: "MSX 30", symbol: null, currency: "OMR", openUtc: hm(6), closeUtc: hm(9, 30), region: "Middle East", note: "Logistics and port JV corridor." },
  { city: "Nairobi", country: "Kenya", exchange: "Nairobi Securities Exchange", index: "NSE 20", symbol: null, currency: "KES", openUtc: hm(6), closeUtc: hm(12), region: "Africa", note: "East Africa operating-subsidiary route." },
  { city: "Johannesburg", country: "South Africa", exchange: "Johannesburg Stock Exchange", index: "FTSE/JSE All Share", symbol: "^J203.JO", currency: "ZAR", openUtc: hm(7), closeUtc: hm(15), region: "Africa", note: "Mining and financial-services JV corridor." },
  { city: "Lagos", country: "Nigeria", exchange: "Nigerian Exchange (NGX)", index: "NGX All-Share", symbol: null, currency: "NGN", openUtc: hm(9), closeUtc: hm(13, 30), region: "Africa", note: "West Africa operating route." },
  { city: "Cairo", country: "Egypt", exchange: "Egyptian Exchange", index: "EGX 30", symbol: "^CASE30", currency: "EGP", openUtc: hm(8), closeUtc: hm(12, 30), region: "Africa", note: "Manufacturing and pharma corridor." },
  { city: "Mauritius", country: "Mauritius", exchange: "Stock Exchange of Mauritius", index: "SEMDEX", symbol: null, currency: "MUR", openUtc: hm(5), closeUtc: hm(9, 30), region: "Africa", note: "Legacy treaty route with substance testing." },
  { city: "São Paulo", country: "Brazil", exchange: "B3", index: "Ibovespa", symbol: "^BVSP", currency: "BRL", openUtc: hm(13), closeUtc: hm(20, 55), region: "Americas", note: "Agri and energy JV corridor." },
  { city: "Mexico City", country: "Mexico", exchange: "Bolsa Mexicana de Valores", index: "S&P/BMV IPC", symbol: "^MXX", currency: "MXN", openUtc: hm(14, 30), closeUtc: hm(21), region: "Americas", note: "Nearshoring manufacturing route." },
  { city: "Santiago", country: "Chile", exchange: "Santiago Exchange", index: "S&P IPSA", symbol: "^IPSA", currency: "CLP", openUtc: hm(13, 30), closeUtc: hm(20), region: "Americas", note: "Mining and lithium supply corridor." },
  { city: "Bogotá", country: "Colombia", exchange: "Bolsa de Valores de Colombia", index: "MSCI COLCAP", symbol: null, currency: "COP", openUtc: hm(14), closeUtc: hm(20, 55), region: "Americas", note: "Energy services corridor." },
  { city: "Bangkok", country: "Thailand", exchange: "Stock Exchange of Thailand", index: "SET Index", symbol: "^SET.BK", currency: "THB", openUtc: hm(3), closeUtc: hm(9, 30), region: "Asia Pacific", note: "Manufacturing step-down route." },
  { city: "Kuala Lumpur", country: "Malaysia", exchange: "Bursa Malaysia", index: "FTSE Bursa Malaysia KLCI", symbol: "^KLSE", currency: "MYR", openUtc: hm(1), closeUtc: hm(9), region: "Asia Pacific", note: "Palm, energy and services JV route." },
  { city: "Jakarta", country: "Indonesia", exchange: "Indonesia Stock Exchange", index: "IDX Composite", symbol: "^JKSE", currency: "IDR", openUtc: hm(2), closeUtc: hm(8, 50), region: "Asia Pacific", note: "Resources and digital JV corridor." },
  { city: "Ho Chi Minh City", country: "Vietnam", exchange: "Ho Chi Minh Stock Exchange", index: "VN-Index", symbol: null, currency: "VND", openUtc: hm(2), closeUtc: hm(8), region: "Asia Pacific", note: "Electronics manufacturing route." },
  { city: "Manila", country: "Philippines", exchange: "Philippine Stock Exchange", index: "PSEi", symbol: "PSEI.PS", currency: "PHP", openUtc: hm(1, 30), closeUtc: hm(7, 30), region: "Asia Pacific", note: "Services and BPO corridor." },
  { city: "Colombo", country: "Sri Lanka", exchange: "Colombo Stock Exchange", index: "ASPI", symbol: null, currency: "LKR", openUtc: hm(4, 30), closeUtc: hm(9), region: "Asia Pacific", note: "Near-shore operating subsidiaries." },
];

/** Distinct feed symbols the quote endpoint needs to pull. */
export const MARKET_SYMBOLS: string[] = Array.from(
  new Set(HUB_MARKETS.map((m) => m.symbol).filter((s): s is string => Boolean(s))),
);

/** Is the venue's cash session open at this UTC instant? */
export function marketOpen(m: HubMarket, d: Date): boolean {
  const day = d.getUTCDay();
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const overnight = m.closeUtc < m.openUtc;
  const inWindow = overnight
    ? mins >= m.openUtc || mins < m.closeUtc
    : mins >= m.openUtc && mins < m.closeUtc;
  if (!inWindow) return false;
  // Gulf venues trade Sunday–Thursday; everywhere else Monday–Friday.
  const gulf = ["UAE", "Saudi Arabia", "Qatar", "Bahrain", "Oman"].includes(m.country);
  return gulf ? day >= 0 && day <= 4 : day >= 1 && day <= 5;
}

/** Stable indicative level for venues with no public feed. */
export function indicativeLevel(symbolless: HubMarket): number {
  let h = 0x811c9dc5;
  const s = `${symbolless.city}|${symbolless.index}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 1000 + (h % 900000) / 100;
}
