import type { Answers } from "@/lib/section195";

/**
 * 52 natures of cross-border vendor payment an Indian treasury actually makes,
 * each pre-wired to the section 195 fact switches a Revenue officer would test.
 * Pure data: the engine still does the reasoning.
 */
export type Nature195 = {
  id: string;
  label: string;
  /** narrow family used for grouping in the picker */
  family: "Technology" | "Services" | "IP & content" | "Capital & finance" | "Trade & logistics" | "Group & people";
  purpose: string;
  expect: "Royalty" | "FTS" | "Equipment royalty" | "Business income";
  facts: Partial<Answers>;
};

const N = (
  id: string,
  label: string,
  family: Nature195["family"],
  purpose: string,
  expect: Nature195["expect"],
  facts: Partial<Answers>,
): Nature195 => ({ id, label, family, purpose, expect, facts });

export const NATURES_195: Nature195[] = [
  // ---------------------------------------------------------------- technology
  N("ai-api", "Frontier AI model API — token metered", "Technology", "Metered API access to a hosted generative model on standard online terms", "Business income", { standardisedProduct: true }),
  N("saas-seat", "Enterprise SaaS subscription — per seat", "Technology", "Annual per-seat subscription to hosted business software, no source code", "Business income", { standardisedProduct: true }),
  N("software-licence", "Shrink-wrap software licence", "Technology", "Perpetual licence to use a copyrighted software article", "Business income", { standardisedProduct: true }),
  N("source-code", "Source-code assignment with right to modify", "Technology", "Assignment of source code with rights to modify and commercially exploit", "Royalty", { copyrightTransferred: true, rightToExploit: true }),
  N("cloud-hosting", "Public cloud compute and storage", "Technology", "Pay-as-you-go shared cloud capacity, no dedicated hardware", "Business income", { standardisedProduct: true }),
  N("dedicated-server", "Dedicated server / colocation rack", "Technology", "Named servers and rack space placed at the payer's exclusive disposal", "Equipment royalty", { dedicatedEquipment: true }),
  N("data-centre-bandwidth", "International bandwidth / IPLC circuit", "Technology", "Dedicated international private leased circuit capacity", "Equipment royalty", { dedicatedEquipment: true, useOfProcessOrIP: true }),
  N("cdn", "Content delivery network usage", "Technology", "Standard automated edge-caching service billed on traffic", "Business income", { standardisedProduct: true }),
  N("api-integration", "Bespoke systems integration engineering", "Technology", "Foreign engineers integrate the vendor stack and hand over the method", "FTS", { humanServices: true, makeAvailable: true }),
  N("software-amc", "Software maintenance and support contract", "Technology", "Annual maintenance, patches and helpdesk on licensed software", "Business income", { humanServices: true }),
  N("cybersecurity-soc", "Managed security operations centre", "Technology", "Round-the-clock monitored SOC service on the vendor's platform", "Business income", { standardisedProduct: true, humanServices: true }),
  N("penetration-test", "Penetration test with remediation training", "Technology", "Security testing where the method and playbook are transferred in-house", "FTS", { humanServices: true, makeAvailable: true }),
  N("data-annotation", "Offshore data labelling and annotation", "Technology", "Routine human labelling of training data, no technology transferred", "Business income", { humanServices: true }),
  N("model-finetune", "Custom model fine-tuning engagement", "Technology", "Vendor fine-tunes a model and delivers weights with training method", "FTS", { humanServices: true, makeAvailable: true }),
  N("telemetry-analytics", "Product analytics platform", "Technology", "Standard multi-tenant analytics subscription", "Business income", { standardisedProduct: true }),

  // ---------------------------------------------------------------- services
  N("engineering", "Engineering consultancy with know-how transfer", "Services", "Foreign engineers train the Indian team and hand over the design method", "FTS", { humanServices: true, makeAvailable: true }),
  N("management-consult", "Strategy and management consultancy", "Services", "Advisory report and recommendations, no enabling technology transferred", "Business income", { humanServices: true }),
  N("legal-fees", "Overseas legal counsel fees", "Services", "Foreign law advice on an overseas acquisition", "Business income", { humanServices: true }),
  N("audit-fees", "Statutory audit of overseas subsidiary", "Services", "Audit of a step-down subsidiary by a local firm", "Business income", { humanServices: true }),
  N("tax-advisory", "Cross-border tax structuring advice", "Services", "Written opinion on treaty and withholding position", "Business income", { humanServices: true }),
  N("architecture-design", "Architectural and design services", "Services", "Design drawings for an overseas plant, with design method released", "FTS", { humanServices: true, makeAvailable: true }),
  N("clinical-trial", "Contract clinical research", "Services", "Trial conducted abroad with protocol and data transferred", "FTS", { humanServices: true, makeAvailable: true }),
  N("lab-testing", "Product testing and certification", "Services", "Routine sample testing against a published standard", "Business income", { humanServices: true }),
  N("recruitment", "Executive search fee", "Services", "Placement fee for hiring an overseas executive", "Business income", { humanServices: true }),
  N("training", "Technical training programme", "Services", "Classroom and hands-on training that enables the payer to work alone", "FTS", { humanServices: true, makeAvailable: true }),
  N("market-research", "Market research study", "Services", "Standard syndicated research report", "Business income", { standardisedProduct: true }),
  N("call-centre", "Outsourced customer support", "Services", "Routine offshore support desk operation", "Business income", { humanServices: true }),
  N("bpo-finance", "Finance and accounting BPO", "Services", "Transaction processing on the payer's own systems", "Business income", { humanServices: true }),

  // ---------------------------------------------------------------- IP & content
  N("patent-royalty", "Patent royalty on manufacture", "IP & content", "Running royalty for use of a patented process in Indian manufacture", "Royalty", { useOfProcessOrIP: true }),
  N("trademark-royalty", "Trademark and brand licence", "IP & content", "Licence to use a foreign brand in India", "Royalty", { useOfProcessOrIP: true }),
  N("knowhow", "Technical know-how transfer", "IP & content", "Secret formula and know-how documentation supplied", "Royalty", { useOfProcessOrIP: true, makeAvailable: true }),
  N("franchise", "Franchise fee", "IP & content", "Franchise rights including brand, system and manuals", "Royalty", { useOfProcessOrIP: true }),
  N("film-rights", "Film and broadcast rights", "IP & content", "Licence to exhibit and distribute audiovisual content in India", "Royalty", { copyrightTransferred: true, rightToExploit: true }),
  N("music-rights", "Music and publishing royalties", "IP & content", "Mechanical and performance royalties for recorded music", "Royalty", { copyrightTransferred: true, rightToExploit: true }),
  N("book-rights", "Publishing and translation rights", "IP & content", "Right to reproduce and translate a copyrighted work", "Royalty", { copyrightTransferred: true, rightToExploit: true }),
  N("database-access", "Subscription database / market data terminal", "IP & content", "Standard subscription to a market data terminal", "Business income", { standardisedProduct: true }),
  N("stock-images", "Stock media licence", "IP & content", "Licence to reproduce stock images in marketing collateral", "Royalty", { rightToExploit: true }),
  N("game-publishing", "Game publishing and distribution rights", "IP & content", "Right to publish and monetise a game title in India", "Royalty", { copyrightTransferred: true, rightToExploit: true }),

  // ---------------------------------------------------------------- capital & finance
  N("odi-equity", "ODI equity subscription in WOS", "Capital & finance", "Subscription to equity of a wholly owned overseas subsidiary", "Business income", {}),
  N("opi-listed", "OPI purchase of listed securities", "Capital & finance", "Portfolio purchase of listed shares abroad", "Business income", {}),
  N("share-buyback", "Consideration for share acquisition", "Capital & finance", "Purchase price for shares of an overseas target", "Business income", {}),
  N("ecb-interest", "Interest on external commercial borrowing", "Capital & finance", "Interest servicing on an ECB facility", "Business income", {}),
  N("guarantee-fee", "Corporate guarantee fee", "Capital & finance", "Fee for a guarantee issued by an overseas group entity", "Business income", {}),
  N("arranger-fee", "Loan arrangement and underwriting fee", "Capital & finance", "Arranger fee on an overseas debt raise", "Business income", { humanServices: true }),
  N("hedge-premium", "Derivative and hedging premium", "Capital & finance", "Premium on an overseas currency hedge", "Business income", {}),
  N("fund-mgmt-fee", "Fund management and carry fee", "Capital & finance", "Management fee to an offshore fund manager", "Business income", { humanServices: true }),

  // ---------------------------------------------------------------- trade & logistics
  N("goods-import", "Import of goods on principal-to-principal terms", "Trade & logistics", "Purchase price of imported goods, title passing abroad", "Business income", {}),
  N("commission-agent", "Overseas sales commission", "Trade & logistics", "Commission to a non-resident agent operating wholly abroad", "Business income", {}),
  N("freight", "Ocean and air freight charges", "Trade & logistics", "Carriage of goods by a non-resident shipping line", "Business income", {}),
  N("warehousing", "Overseas warehousing and fulfilment", "Trade & logistics", "Storage and fulfilment at a shared foreign warehouse", "Business income", {}),

  // ---------------------------------------------------------------- group & people
  N("cost-allocation", "Group cost allocation / management charge", "Group & people", "Allocated head-office management charge from the parent", "FTS", { humanServices: true, makeAvailable: true }),
  N("secondment", "Secondment of expatriate personnel", "Group & people", "Reimbursement for seconded staff working under Indian control", "FTS", { humanServices: true, makeAvailable: true, peInIndia: true }),
];

export const NATURE_FAMILIES: Nature195["family"][] = [
  "Technology",
  "Services",
  "IP & content",
  "Capital & finance",
  "Trade & logistics",
  "Group & people",
];
