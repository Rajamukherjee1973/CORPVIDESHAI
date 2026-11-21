// Filed standalone balance sheets as at 31 March 2026 (FY2025-26), INR crore,
// for the top 50 NSE/BSE companies in the treasury universe. Figures are taken
// from the companies' published annual results as compiled by Screener.in
// (retrieved 29 Oct 2026). Net worth here = equity share capital + reserves;
// FEMA OI net-worth computation and auditor certification may differ.
// Tata Motors maps to the post-demerger listed entity (NSE: TMPV).

export type FiledBalanceSheet = {
  symbol: string;
  name: string;
  equityCapital: number;
  reserves: number;
  netWorth: number;
  borrowings: number | null;
  /** Banks only */
  deposits: number | null;
  otherLiabilities: number;
  totalAssets: number;
  fixedAssets: number;
  cwip: number;
  investments: number;
  otherAssets: number;
};

export const BALANCE_SHEET_DATE = "2026-03-31";
export const BALANCE_SHEET_BASIS = "Standalone, as filed for FY2025-26";
export const BALANCE_SHEET_SOURCE = "Published annual results compiled by Screener.in, retrieved 29 Oct 2026";

export const FILED_BALANCE_SHEETS: FiledBalanceSheet[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", equityCapital: 13532, reserves: 552703, netWorth: 566235, borrowings: 234008, deposits: null, otherLiabilities: 365566, totalAssets: 1165809, fixedAssets: 307109, cwip: 137569, investments: 414613, otherAssets: 306518},
  { symbol: "HDFCBANK", name: "HDFC Bank", equityCapital: 1539, reserves: 561362, netWorth: 562901, borrowings: 489395, deposits: 3105250, otherLiabilities: 207340, totalAssets: 4364886, fixedAssets: 14725, cwip: 0, investments: 884201, otherAssets: 3465960},
  { symbol: "TCS", name: "Tata Consultancy Services", equityCapital: 362, reserves: 84314, netWorth: 84676, borrowings: 9354, deposits: null, otherLiabilities: 54980, totalAssets: 149010, fixedAssets: 17710, cwip: 2402, investments: 41090, otherAssets: 87808},
  { symbol: "BHARTIARTL", name: "Bharti Airtel", equityCapital: 3047, reserves: 157488, netWorth: 160535, borrowings: 144138, deposits: null, otherLiabilities: 95313, totalAssets: 399986, fixedAssets: 228336, cwip: 6737, investments: 102091, otherAssets: 62821},
  { symbol: "ICICIBANK", name: "ICICI Bank", equityCapital: 1432, reserves: 335939, netWorth: 337371, borrowings: 124994, deposits: 1794625, otherLiabilities: 115540, totalAssets: 2372531, fixedAssets: 13922, cwip: 0, investments: 492217, otherAssets: 1866391},
  { symbol: "SBIN", name: "State Bank of India", equityCapital: 923, reserves: 543519, netWorth: 544442, borrowings: 731254, deposits: 5975642, otherLiabilities: 371619, totalAssets: 7622957, fixedAssets: 54163, cwip: 627, investments: 1801254, otherAssets: 5766913},
  { symbol: "INFY", name: "Infosys", equityCapital: 2027, reserves: 78847, netWorth: 80874, borrowings: 3749, deposits: null, otherLiabilities: 41078, totalAssets: 125701, fixedAssets: 13836, cwip: 512, investments: 38075, otherAssets: 73278},
  { symbol: "LICI", name: "Life Insurance Corporation of India", equityCapital: 6325, reserves: 169031, netWorth: 175356, borrowings: 0, deposits: null, otherLiabilities: 5729104, totalAssets: 5904460, fixedAssets: 28296, cwip: 419, investments: 5521921, otherAssets: 353824},
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", equityCapital: 235, reserves: 48988, netWorth: 49223, borrowings: 1325, deposits: null, otherLiabilities: 27434, totalAssets: 77982, fixedAssets: 52419, cwip: 833, investments: 8879, otherAssets: 15851},
  { symbol: "ITC", name: "ITC", equityCapital: 1253, reserves: 68676, netWorth: 69929, borrowings: 2162, deposits: null, otherLiabilities: 16825, totalAssets: 88916, fixedAssets: 20472, cwip: 1554, investments: 39111, otherAssets: 27779},
  { symbol: "LT", name: "Larsen & Toubro", equityCapital: 275, reserves: 74258, netWorth: 74533, borrowings: 12658, deposits: null, otherLiabilities: 120947, totalAssets: 208138, fixedAssets: 12241, cwip: 1471, investments: 56606, otherAssets: 137819},
  { symbol: "BAJFINANCE", name: "Bajaj Finance", equityCapital: 622, reserves: 102501, netWorth: 103123, borrowings: 322818, deposits: null, otherLiabilities: 6263, totalAssets: 432203, fixedAssets: 3724, cwip: 119, investments: 38074, otherAssets: 390285},
  { symbol: "HCLTECH", name: "HCL Technologies", equityCapital: 543, reserves: 25355, netWorth: 25898, borrowings: 988, deposits: null, otherLiabilities: 20088, totalAssets: 46974, fixedAssets: 14829, cwip: 96, investments: 11546, otherAssets: 20503},
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", equityCapital: 240, reserves: 22131, netWorth: 22371, borrowings: 13605, deposits: null, otherLiabilities: 7084, totalAssets: 43060, fixedAssets: 7613, cwip: 899, investments: 12952, otherAssets: 21596},
  { symbol: "MARUTI", name: "Maruti Suzuki India", equityCapital: 157, reserves: 104953, netWorth: 105110, borrowings: 102, deposits: null, otherLiabilities: 41530, totalAssets: 146742, fixedAssets: 34512, cwip: 9838, investments: 74766, otherAssets: 27627},
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", equityCapital: 995, reserves: 134317, netWorth: 135312, borrowings: 32475, deposits: 572456, otherLiabilities: 42760, totalAssets: 783003, fixedAssets: 2388, cwip: 0, investments: 172535, otherAssets: 608079},
  { symbol: "M&M", name: "Mahindra & Mahindra", equityCapital: 601, reserves: 73724, netWorth: 74325, borrowings: 1653, deposits: null, otherLiabilities: 44624, totalAssets: 120603, fixedAssets: 19688, cwip: 5308, investments: 42032, otherAssets: 53575},
  { symbol: "NTPC", name: "NTPC", equityCapital: 9697, reserves: 165169, netWorth: 174866, borrowings: 191145, deposits: null, otherLiabilities: 48408, totalAssets: 414418, fixedAssets: 217307, cwip: 48303, investments: 38729, otherAssets: 110078},
  { symbol: "AXISBANK", name: "Axis Bank", equityCapital: 622, reserves: 204915, netWorth: 205537, borrowings: 235271, deposits: 1335834, otherLiabilities: 110209, totalAssets: 1886850, fixedAssets: 6289, cwip: 260, investments: 445033, otherAssets: 1435268},
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation", equityCapital: 6290, reserves: 325480, netWorth: 331770, borrowings: 33645, deposits: null, otherLiabilities: 96886, totalAssets: 462302, fixedAssets: 181583, cwip: 54994, investments: 113379, otherAssets: 112346},
  { symbol: "TMPV", name: "Tata Motors", equityCapital: 737, reserves: 24223, netWorth: 24960, borrowings: 2873, deposits: null, otherLiabilities: 15478, totalAssets: 43311, fixedAssets: 15346, cwip: 1385, investments: 13917, otherAssets: 12663},
  { symbol: "ADANIENT", name: "Adani Enterprises", equityCapital: 129, reserves: 62650, netWorth: 62779, borrowings: 11008, deposits: null, otherLiabilities: 8438, totalAssets: 82225, fixedAssets: 2453, cwip: 1083, investments: 28275, otherAssets: 50414},
  { symbol: "TITAN", name: "Titan Company", equityCapital: 89, reserves: 20398, netWorth: 20487, borrowings: 23009, deposits: null, otherLiabilities: 10121, totalAssets: 53617, fixedAssets: 3349, cwip: 89, investments: 9032, otherAssets: 41147},
  { symbol: "ULTRACEMCO", name: "Ultratech Cement", equityCapital: 295, reserves: 74369, netWorth: 74664, borrowings: 20480, deposits: null, otherLiabilities: 32698, totalAssets: 127841, fixedAssets: 79564, cwip: 8338, investments: 17559, otherAssets: 22380},
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ", equityCapital: 461, reserves: 61213, netWorth: 61674, borrowings: 48170, deposits: null, otherLiabilities: 3702, totalAssets: 113545, fixedAssets: 11067, cwip: 1136, investments: 69098, otherAssets: 32244},
  { symbol: "COALINDIA", name: "Coal India", equityCapital: 6163, reserves: 14493, netWorth: 20656, borrowings: 802, deposits: null, otherLiabilities: 8447, totalAssets: 29904, fixedAssets: 1035, cwip: 1190, investments: 15132, otherAssets: 12547},
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", equityCapital: 160, reserves: 10022, netWorth: 10182, borrowings: 0, deposits: null, otherLiabilities: 168, totalAssets: 10350, fixedAssets: 127, cwip: 13, investments: 9654, otherAssets: 556},
  { symbol: "POWERGRID", name: "Power Grid Corporation of India", equityCapital: 9301, reserves: 90628, netWorth: 99929, borrowings: 148051, deposits: null, otherLiabilities: 31457, totalAssets: 279436, fixedAssets: 152152, cwip: 8391, investments: 16392, otherAssets: 102500},
  { symbol: "WIPRO", name: "Wipro", equityCapital: 2098, reserves: 61582, netWorth: 63680, borrowings: 8086, deposits: null, otherLiabilities: 25577, totalAssets: 97342, fixedAssets: 8918, cwip: 412, investments: 63686, otherAssets: 24326},
  { symbol: "JSWSTEEL", name: "JSW Steel", equityCapital: 305, reserves: 85355, netWorth: 85660, borrowings: 70809, deposits: null, otherLiabilities: 46742, totalAssets: 203211, fixedAssets: 79969, cwip: 14294, investments: 34971, otherAssets: 73977},
  { symbol: "NESTLEIND", name: "Nestle India", equityCapital: 193, reserves: 5116, netWorth: 5309, borrowings: 444, deposits: null, otherLiabilities: 7604, totalAssets: 13357, fixedAssets: 6290, cwip: 507, investments: 706, otherAssets: 5854},
  { symbol: "TATASTEEL", name: "Tata Steel", equityCapital: 1249, reserves: 134285, netWorth: 135534, borrowings: 69049, deposits: null, otherLiabilities: 68165, totalAssets: 272747, fixedAssets: 115892, cwip: 20016, investments: 94529, otherAssets: 42312},
  { symbol: "HAL", name: "Hindustan Aeronautics", equityCapital: 334, reserves: 40528, netWorth: 40862, borrowings: 65, deposits: null, otherLiabilities: 93277, totalAssets: 134205, fixedAssets: 7287, cwip: 3313, investments: 1752, otherAssets: 121853},
  { symbol: "BEL", name: "Bharat Electronics", equityCapital: 731, reserves: 22967, netWorth: 23698, borrowings: 65, deposits: null, otherLiabilities: 20327, totalAssets: 44090, fixedAssets: 3899, cwip: 728, investments: 864, otherAssets: 38600},
  { symbol: "DMART", name: "DMart (Avenue Supermarts)", equityCapital: 652, reserves: 24868, netWorth: 25520, borrowings: 2267, deposits: null, otherLiabilities: 2518, totalAssets: 30304, fixedAssets: 19619, cwip: 1284, investments: 1607, otherAssets: 7794},
  { symbol: "INDIGO", name: "Interglobe Aviation", equityCapital: 387, reserves: 6065, netWorth: 6452, borrowings: 85246, deposits: null, otherLiabilities: 50996, totalAssets: 142694, fixedAssets: 62548, cwip: 36, investments: 35213, otherAssets: 44898},
  { symbol: "ADANIGREEN", name: "Adani Green Energy", equityCapital: 1647, reserves: 13243, netWorth: 14890, borrowings: 22558, deposits: null, otherLiabilities: 14507, totalAssets: 51955, fixedAssets: 3384, cwip: 953, investments: 28995, otherAssets: 18623},
  { symbol: "HINDALCO", name: "Hindalco Industries", equityCapital: 222, reserves: 76517, netWorth: 76739, borrowings: 17564, deposits: null, otherLiabilities: 38037, totalAssets: 132340, fixedAssets: 38991, cwip: 6869, investments: 33979, otherAssets: 52501},
  { symbol: "GRASIM", name: "Grasim Industries", equityCapital: 136, reserves: 55141, netWorth: 55277, borrowings: 12490, deposits: null, otherLiabilities: 13265, totalAssets: 81032, fixedAssets: 24702, cwip: 1795, investments: 42114, otherAssets: 12421},
  { symbol: "TECHM", name: "Tech Mahindra", equityCapital: 490, reserves: 21232, netWorth: 21722, borrowings: 1505, deposits: null, otherLiabilities: 15072, totalAssets: 38299, fixedAssets: 4163, cwip: 22, investments: 12033, otherAssets: 22081},
  { symbol: "CIPLA", name: "Cipla", equityCapital: 162, reserves: 34040, netWorth: 34202, borrowings: 125, deposits: null, otherLiabilities: 4167, totalAssets: 38493, fixedAssets: 5194, cwip: 978, investments: 17616, otherAssets: 14705},
  { symbol: "DRREDDY", name: "Dr Reddys Laboratories", equityCapital: 84, reserves: 31282, netWorth: 31366, borrowings: 5737, deposits: null, otherLiabilities: 6500, totalAssets: 43602, fixedAssets: 10730, cwip: 1369, investments: 15595, otherAssets: 15908},
  { symbol: "ADANIPOWER", name: "Adani Power", equityCapital: 3857, reserves: 49158, netWorth: 53015, borrowings: 49095, deposits: null, otherLiabilities: 17438, totalAssets: 119548, fixedAssets: 54972, cwip: 15064, investments: 4805, otherAssets: 44707},
  { symbol: "VEDL", name: "Vedanta", equityCapital: 391, reserves: 77658, netWorth: 78049, borrowings: 16418, deposits: null, otherLiabilities: 82913, totalAssets: 177380, fixedAssets: 909, cwip: 199, investments: 49919, otherAssets: 126353},
  { symbol: "IOC", name: "Indian Oil Corporation", equityCapital: 13772, reserves: 190773, netWorth: 204545, borrowings: 122603, deposits: null, otherLiabilities: 164735, totalAssets: 491882, fixedAssets: 191467, cwip: 85094, investments: 70871, otherAssets: 144450},
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", equityCapital: 280, reserves: 34695, netWorth: 34975, borrowings: 73, deposits: null, otherLiabilities: 10838, totalAssets: 45886, fixedAssets: 3533, cwip: 98, investments: 30113, otherAssets: 12142},
  { symbol: "EICHERMOT", name: "Eicher Motors", equityCapital: 27, reserves: 21780, netWorth: 21807, borrowings: 296, deposits: null, otherLiabilities: 6460, totalAssets: 28564, fixedAssets: 3670, cwip: 734, investments: 14199, otherAssets: 9961},
  { symbol: "DIVISLAB", name: "Divis Laboratories", equityCapital: 53, reserves: 16658, netWorth: 16711, borrowings: 0, deposits: null, otherLiabilities: 3243, totalAssets: 19954, fixedAssets: 6520, cwip: 2113, investments: 76, otherAssets: 11245},
  { symbol: "BRITANNIA", name: "Britannia Industries", equityCapital: 24, reserves: 4617, netWorth: 4641, borrowings: 1348, deposits: null, otherLiabilities: 2951, totalAssets: 8940, fixedAssets: 2476, cwip: 38, investments: 3684, otherAssets: 2743},
  { symbol: "ASIANPAINT", name: "Asian Paints", equityCapital: 96, reserves: 20686, netWorth: 20782, borrowings: 2369, deposits: null, otherLiabilities: 6934, totalAssets: 30084, fixedAssets: 7742, cwip: 1754, investments: 7510, otherAssets: 13078 },
];

const BY_NAME = new Map(FILED_BALANCE_SHEETS.map((b) => [b.name, b]));

export function filedBalanceSheetFor(name: string): FiledBalanceSheet | undefined {
  return BY_NAME.get(name);
}
