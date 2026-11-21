// Banking counterparties used by the Automatic-route intake on /routes.
// Indian side: AD Category-I authorised dealers. Overseas side: the fifteen
// largest correspondent / custodian banks operating in each hub jurisdiction.
// Figures and codes are illustrative prototype values.

export type AdBank = {
  name: string;
  /** Illustrative AD Category-I licence reference. */
  licence: string;
  swift: string;
  giftBranch: boolean;
  note: string;
};

/** Top 15 Indian banks on the AD Category-I authorised dealer list. */
export const AD_BANKS: AdBank[] = [
  { name: "State Bank of India", licence: "AD-I / MUM / 0001", swift: "SBININBB", giftBranch: true, note: "Largest outbound ODI book; IBU at GIFT IFSC clears in the same time zone as the corridor." },
  { name: "HDFC Bank", licence: "AD-I / MUM / 0004", swift: "HDFCINBB", giftBranch: true, note: "High-volume corporate remittance desk; Form A2 and 15CA/15CB pairing fully digital." },
  { name: "ICICI Bank", licence: "AD-I / MUM / 0007", swift: "ICICINBB", giftBranch: true, note: "Deep correspondent network across Singapore, Dubai and London corridors." },
  { name: "Axis Bank", licence: "AD-I / MUM / 0011", swift: "AXISINBB", giftBranch: true, note: "Strong GIFT IFSC banking unit; competitive USD/INR corporate pricing." },
  { name: "Kotak Mahindra Bank", licence: "AD-I / MUM / 0015", swift: "KKBKINBB", giftBranch: true, note: "Treasury-led structuring for holding-company and step-down flows." },
  { name: "Bank of Baroda", licence: "AD-I / VAD / 0002", swift: "BARBINBB", giftBranch: true, note: "Public-sector overseas branch network across Africa and the Gulf." },
  { name: "Punjab National Bank", licence: "AD-I / DEL / 0003", swift: "PUNBINBB", giftBranch: false, note: "Widely used by mid-cap manufacturers for JV equity remittance." },
  { name: "Canara Bank", licence: "AD-I / BLR / 0006", swift: "CNRBINBB", giftBranch: true, note: "London and GIFT presence; documentary trade plus ODI combination flows." },
  { name: "Union Bank of India", licence: "AD-I / MUM / 0009", swift: "UBININBB", giftBranch: true, note: "DIFC and Hong Kong representative coverage for Asian corridors." },
  { name: "IndusInd Bank", licence: "AD-I / MUM / 0018", swift: "INDBINBB", giftBranch: true, note: "Fast turnaround on Form A2; strong Gulf-corridor correspondent lines." },
  { name: "IDBI Bank", licence: "AD-I / MUM / 0013", swift: "IBKLINBB", giftBranch: false, note: "Project-finance-linked overseas commitments and guarantee remittances." },
  { name: "YES Bank", licence: "AD-I / MUM / 0021", swift: "YESBINBB", giftBranch: true, note: "API-first corporate banking stack; suits machine-to-machine filing." },
  { name: "Federal Bank", licence: "AD-I / KOC / 0016", swift: "FDRLINBB", giftBranch: true, note: "GIFT IFSC unit with dollar lending; heavy Gulf correspondent traffic." },
  { name: "IDFC FIRST Bank", licence: "AD-I / MUM / 0024", swift: "IDFBINBB", giftBranch: false, note: "Digital-native documentation flow; strong on new-economy filers." },
  { name: "Standard Chartered Bank (India)", licence: "AD-I / MUM / 0031", swift: "SCBLINBB", giftBranch: true, note: "Foreign AD bank in India; single-group settlement into most hub jurisdictions." },
];

/** Domestic banking champions per hub jurisdiction. */
const DOMESTIC: Record<string, string[]> = {
  Singapore: ["DBS Bank", "OCBC Bank", "United Overseas Bank (UOB)", "Bank of Singapore", "Maybank Singapore"],
  UAE: ["First Abu Dhabi Bank", "Emirates NBD", "Abu Dhabi Commercial Bank", "Mashreq Bank", "Dubai Islamic Bank"],
  "United Kingdom": ["Barclays Bank", "HSBC UK", "Lloyds Bank", "NatWest", "Santander UK"],
  "United States": ["JPMorgan Chase", "Bank of America", "Citibank N.A.", "Wells Fargo", "BNY"],
  "Hong Kong SAR": ["HSBC Hong Kong", "Bank of China (Hong Kong)", "Hang Seng Bank", "Standard Chartered Hong Kong", "Bank of East Asia"],
  Switzerland: ["UBS", "Julius Baer", "Pictet & Cie", "Zürcher Kantonalbank", "Banque Lombard Odier"],
  Luxembourg: ["Banque et Caisse d'Épargne de l'État", "BGL BNP Paribas", "Banque Internationale à Luxembourg", "Quintet Private Bank", "Spuerkeess Invest"],
  Netherlands: ["ING Bank", "Rabobank", "ABN AMRO", "Van Lanschot Kempen", "de Volksbank"],
  Ireland: ["Bank of Ireland", "Allied Irish Banks", "Permanent TSB", "Citibank Europe plc", "Northern Trust Ireland"],
  Germany: ["Deutsche Bank", "Commerzbank", "DZ Bank", "KfW IPEX-Bank", "LBBW"],
  France: ["BNP Paribas", "Société Générale", "Crédit Agricole CIB", "Natixis", "BPCE"],
  Japan: ["MUFG Bank", "Sumitomo Mitsui Banking Corporation", "Mizuho Bank", "Resona Bank", "Norinchukin Bank"],
  China: ["Industrial and Commercial Bank of China", "China Construction Bank", "Bank of China", "Agricultural Bank of China", "Bank of Communications"],
  "South Korea": ["KEB Hana Bank", "Shinhan Bank", "Kookmin Bank", "Woori Bank", "Industrial Bank of Korea"],
  Australia: ["Commonwealth Bank of Australia", "Westpac", "ANZ", "National Australia Bank", "Macquarie Bank"],
  Canada: ["Royal Bank of Canada", "TD Bank", "Scotiabank", "BMO", "CIBC"],
  Mauritius: ["Mauritius Commercial Bank", "SBM Bank (Mauritius)", "AfrAsia Bank", "Absa Bank Mauritius", "Bank One"],
  Malaysia: ["Maybank", "CIMB Bank", "Public Bank Berhad", "RHB Bank", "Hong Leong Bank"],
  Qatar: ["Qatar National Bank", "Commercial Bank of Qatar", "Doha Bank", "Qatar Islamic Bank", "Masraf Al Rayan"],
  "Saudi Arabia": ["Saudi National Bank", "Al Rajhi Bank", "Riyad Bank", "Banque Saudi Fransi", "Arab National Bank"],
  Bahrain: ["National Bank of Bahrain", "Ahli United Bank", "Bank ABC", "Gulf International Bank", "Al Salam Bank"],
  Oman: ["Bank Muscat", "Sohar International", "National Bank of Oman", "Oman Arab Bank", "Ahli Bank Oman"],
  "South Africa": ["Standard Bank", "FirstRand Bank", "Absa Bank", "Nedbank", "Investec Bank"],
  Kenya: ["KCB Bank Kenya", "Equity Bank", "Co-operative Bank of Kenya", "NCBA Bank", "Absa Bank Kenya"],
  Nigeria: ["Zenith Bank", "Guaranty Trust Bank", "Access Bank", "United Bank for Africa", "First Bank of Nigeria"],
  Egypt: ["National Bank of Egypt", "Banque Misr", "Commercial International Bank", "QNB Alahli", "Banque du Caire"],
  Brazil: ["Itaú Unibanco", "Banco do Brasil", "Bradesco", "Banco Santander Brasil", "BTG Pactual"],
  Mexico: ["BBVA México", "Banorte", "Banamex", "Santander México", "Scotiabank México"],
  Chile: ["Banco de Chile", "Banco Santander Chile", "BCI", "Banco Estado", "Itaú Chile"],
  Colombia: ["Bancolombia", "Banco de Bogotá", "Davivienda", "BBVA Colombia", "Banco de Occidente"],
  Spain: ["Banco Santander", "BBVA", "CaixaBank", "Banco Sabadell", "Bankinter"],
  Italy: ["Intesa Sanpaolo", "UniCredit", "Banco BPM", "BPER Banca", "Mediobanca"],
  Portugal: ["Caixa Geral de Depósitos", "Millennium BCP", "Novo Banco", "Banco BPI", "Santander Totta"],
  Belgium: ["KBC Bank", "Belfius", "BNP Paribas Fortis", "ING Belgium", "Argenta"],
  Austria: ["Erste Group Bank", "Raiffeisen Bank International", "BAWAG P.S.K.", "UniCredit Bank Austria", "Oberbank"],
  Denmark: ["Danske Bank", "Nykredit", "Jyske Bank", "Sydbank", "Spar Nord Bank"],
  Sweden: ["SEB", "Svenska Handelsbanken", "Swedbank", "Nordea Sweden", "Länsförsäkringar Bank"],
  Norway: ["DNB Bank", "SpareBank 1 SR-Bank", "Nordea Norway", "Sparebanken Vest", "Santander Consumer Norway"],
  Finland: ["Nordea Bank", "OP Financial Group", "Danske Bank Finland", "Aktia Bank", "S-Bank"],
  Poland: ["PKO Bank Polski", "Bank Pekao", "Santander Bank Polska", "mBank", "ING Bank Śląski"],
  Israel: ["Bank Hapoalim", "Bank Leumi", "Israel Discount Bank", "Mizrahi Tefahot", "First International Bank of Israel"],
  Thailand: ["Bangkok Bank", "Kasikornbank", "Siam Commercial Bank", "Krungthai Bank", "Bank of Ayudhya"],
  Indonesia: ["Bank Mandiri", "Bank Central Asia", "Bank Rakyat Indonesia", "Bank Negara Indonesia", "CIMB Niaga"],
  Philippines: ["BDO Unibank", "Metrobank", "Bank of the Philippine Islands", "Landbank", "Security Bank"],
  Vietnam: ["Vietcombank", "BIDV", "VietinBank", "Techcombank", "MB Bank"],
  "Sri Lanka": ["Bank of Ceylon", "Commercial Bank of Ceylon", "Hatton National Bank", "Sampath Bank", "People's Bank"],
  India: ["State Bank of India (IBU, GIFT)", "HDFC Bank (IBU, GIFT)", "ICICI Bank (IBU, GIFT)", "Axis Bank (IBU, GIFT)", "Standard Chartered (IBU, GIFT)"],
};

/** Global correspondent banks used to complete a jurisdiction's list of fifteen. */
const GLOBAL = [
  "HSBC", "Citibank", "Standard Chartered", "BNP Paribas", "Deutsche Bank",
  "JPMorgan Chase", "UBS", "Barclays", "Société Générale", "MUFG Bank",
  "Mizuho Bank", "BNY", "State Street Bank", "Northern Trust", "Crédit Agricole CIB",
];

/** Top 15 banks a remittance can land in, for the selected hub jurisdiction. */
export function banksForCountry(country: string, city: string): string[] {
  const domestic = DOMESTIC[country] ?? [];
  const out = [...domestic];
  for (const g of GLOBAL) {
    if (out.length >= 15) break;
    if (out.some((n) => n.startsWith(g))) continue;
    out.push(`${g} — ${city} branch`);
  }
  return out.slice(0, 15);
}
