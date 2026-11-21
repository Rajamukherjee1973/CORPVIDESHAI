// Unlisted universe: top 500 unlisted Indian companies ranked by annual turnover.
// Names are drawn from well-known unlisted / privately held Indian groups and
// extended with sector-and-city entities so the desk can demonstrate the Rule 7
// route test across a full 500-name dropdown. Figures are illustrative.
import type { Company } from "./companies";

const SEEDS: [string, string][] = [
  ["Tata Sons", "Conglomerate"],
  ["Reliance Retail Ventures", "Retail"],
  ["Reliance Jio Infocomm", "Telecom"],
  ["National Stock Exchange of India", "Financial Infrastructure"],
  ["Serum Institute of India", "Pharma"],
  ["Amul (GCMMF)", "FMCG"],
  ["Parle Products", "FMCG"],
  ["Haldiram Snacks", "FMCG"],
  ["Hero FinCorp", "NBFC"],
  ["Tata Capital Financial Services", "NBFC"],
  ["HDB Financial Services", "NBFC"],
  ["Flipkart Internet", "E-commerce"],
  ["Swiggy Bundl Technologies", "Consumer Tech"],
  ["Ola Electric Technologies", "Automobile"],
  ["Oyo Rooms (Oravel Stays)", "Hospitality"],
  ["PharmEasy (API Holdings)", "Health Tech"],
  ["Razorpay Software", "Fintech"],
  ["PhonePe Private", "Fintech"],
  ["Cred Club (Dreamplug)", "Fintech"],
  ["Zepto (Kiranakart)", "Quick Commerce"],
  ["Lenskart Solutions", "Retail"],
  ["Meesho (Fashnear)", "E-commerce"],
  ["Byju's (Think & Learn)", "EdTech"],
  ["Udaan (Hiveloop)", "B2B Commerce"],
  ["Zoho Corporation", "IT Services"],
  ["Intas Pharmaceuticals", "Pharma"],
  ["Macleods Pharmaceuticals", "Pharma"],
  ["Micro Labs", "Pharma"],
  ["MSN Laboratories", "Pharma"],
  ["Hetero Labs", "Pharma"],
  ["Bharat Serums and Vaccines", "Pharma"],
  ["Patanjali Ayurved", "FMCG"],
  ["Dabur International", "FMCG"],
  ["Adani Wilmar Agri", "Agri Processing"],
  ["Cargill India", "Agri Processing"],
  ["ITC Infotech India", "IT Services"],
  ["Larsen & Toubro Infotech Services", "IT Services"],
  ["Tata Technologies Engineering", "Engineering"],
  ["Mahindra Aerospace", "Defence"],
  ["Bharat Forge Defence", "Defence"],
  ["Adani Defence Systems", "Defence"],
  ["Tata Advanced Systems", "Defence"],
  ["JSW Cement", "Cement"],
  ["Nuvoco Vistas Trading", "Cement"],
  ["Vedanta Star", "Metals"],
  ["Essar Ports", "Logistics"],
  ["DP World India", "Logistics"],
  ["Delhivery Supply Chain", "Logistics"],
  ["Blue Dart Aviation", "Logistics"],
  ["Indian Oil Adani Ventures", "Energy"],
  ["Cairn Oil & Gas Operations", "Energy"],
  ["Torrent Gas", "Energy"],
  ["ReNew Solar Power", "Renewables"],
  ["Avaada Energy", "Renewables"],
  ["Greenko Energies", "Renewables"],
  ["Sterlite Grid", "Power"],
  ["Tata Power Renewable Energy", "Power"],
  ["Jindal Renewables", "Renewables"],
  ["Godrej & Boyce Manufacturing", "Engineering"],
  ["Emami Realty Estates", "Real Estate"],
  ["Lodha Developers International", "Real Estate"],
  ["Hiranandani Communitie", "Real Estate"],
  ["K Raheja Realty", "Real Estate"],
  ["Embassy Property Developments", "Real Estate"],
  ["Prestige Hospitality Ventures", "Hospitality"],
  ["Taj SATS Air Catering", "Hospitality"],
  ["Indian Hotels Overseas", "Hospitality"],
  ["Air India Express", "Aviation"],
  ["Akasa Air (SNV Aviation)", "Aviation"],
  ["GMR Hyderabad International Airport", "Infrastructure"],
  ["Bangalore International Airport", "Infrastructure"],
  ["Mumbai International Airport", "Infrastructure"],
  ["Adani Road Transport", "Infrastructure"],
  ["IRB Infrastructure Trust", "Infrastructure"],
  ["Dilip Buildcon Highways", "Infrastructure"],
  ["Shapoorji Pallonji & Company", "Infrastructure"],
  ["Afcons Infrastructure Overseas", "Infrastructure"],
  ["Megha Engineering & Infrastructures", "Infrastructure"],
  ["Navayuga Engineering", "Infrastructure"],
  ["Hindustan Zinc Alloys", "Metals"],
  ["Jindal Stainless Steelway", "Metals"],
  ["Rungta Mines", "Mining"],
  ["Vedanta Aluminium Odisha", "Metals"],
  ["Sanghi Cement Works", "Cement"],
  ["Wonder Cement", "Cement"],
  ["Nirma Chemicals", "Chemicals"],
  ["Meghmani Organochem", "Chemicals"],
  ["Aarti Speciality Chemicals", "Chemicals"],
  ["SRF Industrial Chemicals", "Chemicals"],
  ["Deepak Phenolics", "Chemicals"],
  ["Grasim Chlor Alkali", "Chemicals"],
  ["Indorama India", "Petrochemicals"],
  ["Haldia Petrochemicals", "Petrochemicals"],
  ["Nayara Energy", "Energy"],
  ["Bharat Oman Refineries", "Energy"],
  ["Petronet MHB", "Energy"],
  ["Amazon Seller Services India", "E-commerce"],
  ["Walmart India Wholesale", "Retail"],
  ["Metro Cash & Carry India", "Retail"],
  ["Reliance Brands", "Retail"],
  ["Aditya Birla Fashion Ventures", "Retail"],
];

const CITIES = [
  "Mumbai", "Ahmedabad", "Pune", "Chennai", "Bengaluru", "Hyderabad", "Kolkata",
  "Surat", "Coimbatore", "Ludhiana", "Jaipur", "Indore", "Nagpur", "Vadodara",
  "Kochi", "Noida", "Gurugram", "Rajkot", "Visakhapatnam", "Bhubaneswar",
];

const FORMS = ["Industries", "Enterprises", "Manufacturing", "Exports", "Technologies", "Projects", "Holdings", "Overseas"];

const GEN_SECTORS = [
  "Textiles", "Auto Components", "Speciality Chemicals", "Agri Processing", "Engineering",
  "Pharma", "IT Services", "Logistics", "Renewables", "Metals", "Packaging", "Electronics",
  "Gems & Jewellery", "Leather", "Marine Exports", "Real Estate", "Health Tech", "Fintech",
];

/** Deterministic pseudo-random so the universe is identical on every render. */
function rnd(seed: number) {
  let x = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  return (x >>> 8) / 0x1000000;
}

const RESTRICTED = new Set(["Real Estate"]);

function build(name: string, sector: string, i: number): Company {
  const r1 = rnd(i * 7 + 11);
  const r2 = rnd(i * 13 + 29);
  const r3 = rnd(i * 17 + 41);
  // Turnover falls with rank so the dropdown truly reads "by turnover".
  const turnover = Math.round((180000 * Math.pow(0.988, i) + 400) * (0.85 + r1 * 0.3));
  const netWorth = Math.round(turnover * (0.22 + r2 * 0.45));
  const ceiling = netWorth * 4;
  const used = Math.round(ceiling * (0.05 + r3 * 0.62));
  const proposed = Math.round(netWorth * (0.05 + r1 * 0.9));
  const total = used + proposed;
  const utilisation = (total / ceiling) * 100;
  const restricted = RESTRICTED.has(sector);
  const breach = total > ceiling;
  return {
    rank: i + 1,
    name,
    sector,
    exchange: "Unlisted",
    netWorth,
    ceiling,
    used,
    proposed,
    total,
    utilisation,
    headroom: ceiling - total,
    turnover,
    route: breach || restricted ? "Approval" : "Automatic",
    reason: breach
      ? "Commitment exceeds the 400% of net worth ceiling — prior RBI approval required under Rule 9"
      : restricted
        ? "Real-estate business is a restricted activity — approval route irrespective of headroom"
        : utilisation > 75
          ? "Within the 400% ceiling — automatic route, flagged above the 75% internal alert"
          : "Within the 400% ceiling — automatic route under Rule 7",
  };
}

const names: [string, string][] = [...SEEDS];
let n = 0;
while (names.length < 500) {
  const city = CITIES[n % CITIES.length]!;
  const form = FORMS[Math.floor(n / CITIES.length) % FORMS.length]!;
  const sector = GEN_SECTORS[n % GEN_SECTORS.length]!;
  const label = `${city} ${sector.split(" ")[0]} ${form}`;
  if (!names.some(([x]) => x === label)) names.push([label, sector]);
  n++;
  if (n > 5000) break;
}

export const UNLISTED: Company[] = names
  .slice(0, 500)
  .map(([name, sector], i) => build(name, sector, i))
  .sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0))
  .map((c, i) => ({ ...c, rank: i + 1 }));