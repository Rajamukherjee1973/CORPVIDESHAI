/** Enterprise statutory corpus the Data Retriever Agent searches (client-safe). */
import { LEGAL_SOURCES } from "@/lib/services/legal-sources";

export type CorpusDoc = {
  id: string;
  title: string;
  source: string;
  tags: string[];
  text: string;
};

export const CORPUS: CorpusDoc[] = [
  {
    id: "fema-odi-rule-7",
    title: "Financial Commitment ceiling — 400% of audited net worth",
    source: "FEM (Overseas Investment) Rules, 2022 — Schedule I; check current RBI directions",
    tags: ["odi", "networth", "ceiling", "headroom", "400"],
    text: "Total financial commitment of an Indian entity in all overseas entities shall not exceed 400% of its net worth as on the date of the last audited balance sheet. Financial commitment includes equity, loan, and 100% of guarantees issued (50% for performance guarantees). Commitment beyond the ceiling requires prior Reserve Bank approval under the approval route.",
  },
  {
    id: "fema-opi-cap",
    title: "Overseas Portfolio Investment — 50% of net worth",
    source: "FEM (Overseas Investment) Rules, 2022 — Schedule II; check current amendments",
    tags: ["opi", "portfolio", "cap", "50", "listed"],
    text: "Schedule II sets a general 50% latest-audited-net-worth ceiling for OPI by an Indian entity, subject to eligibility, permitted modes and exceptions. Unlisted Indian entities have restricted permitted modes; do not import listed-company eligibility. Classify the instrument, listing and control under the statutory definitions before calling it OPI. A limit is not permission and an approval selector is not a waiver. Rule 19's specified foreign-entity activity restrictions must be assessed in their precise statutory scope, not blanket-applied to every OPI instrument.",
  },
  {
    id: "fema-approval-route",
    title: "Approval route triggers",
    source: "FEM (Overseas Investment) Directions, 2022 — Para 9",
    tags: ["approval", "rbi", "route", "trigger"],
    text: "Automatic route means no prior approval only where the applicable permission and all conditions are satisfied; it does not waive AD-bank checks or reporting. Prior approval depends on the actual rule, investor, jurisdiction, sector and thresholds. NPA, wilful-defaulter or investigation conditions invoke a specified NOC process, not a universal RBI approval trigger. Strategic-sector provisions may include distinct exceptions; do not infer that every strategic investment requires approval. FATF risk screening is not a standalone universal approval permission. Determine the applicable RBI or Central Government process through the designated AD bank and current directions.",
  },
  {
    id: "ita-195-royalty",
    title: "Chargeability — Royalty and Fee for Technical Services",
    source: "Income-tax Act, 1961 — Section 9(1)(vi)/(vii) read with Section 195",
    tags: ["195", "royalty", "fts", "withholding", "saas", "tds"],
    text: "Payment for the use of, or the right to use, any copyright, patent, process, or equipment is royalty. Consideration for managerial, technical, or consultancy services is fee for technical services. Standardised software-as-a-service without transfer of copyright is generally not royalty following Engineering Analysis (SC, 2021), but FTS may still arise where the service is bespoke or make-available conditions are satisfied under the applicable treaty.",
  },
  {
    id: "trc-10f",
    title: "Treaty relief documentation — TRC, Form 10F, no-PE",
    source: "Income-tax Act — Section 90(4)/(5), Rule 21AB",
    tags: ["trc", "10f", "treaty", "documents", "pe"],
    text: "Treaty relief requires the applicable Tax Residency Certificate under section 90(4) and prescribed information under section 90(5)/Rule 21AB, including Form 10F where applicable. No-PE and beneficial-ownership evidence may be relevant to the treaty claim, but a no-PE declaration is not a universal statutory form. PAN/section 206AA treatment and relief under Rule 37BC need fact-specific review. Documentation alone does not establish chargeability or entitlement to a treaty rate.",
  },
  {
    id: "rule-37bb",
    title: "Remittance filings — Form 15CA / 15CB",
    source: "Income-tax Rules, 1962 — Rule 37BB",
    tags: ["15ca", "15cb", "filing", "remittance", "form"],
    text: "Form 15CA Part A applies where the remittance is chargeable and aggregate remittances do not exceed five lakh rupees in the financial year. Part B applies where a lower-deduction order under Section 195(2)/(3) or 197 has been obtained. Part C requires an accountant certificate in Form 15CB. Part D applies where the remittance is not chargeable to tax. Specified payments in the Rule 37BB list are exempt from both forms.",
  },
  {
    id: "gift-ifsc",
    title: "GIFT IFSC route and IFSCA supervision",
    source: "IFSCA Act, 2019 — supervisory framework, GIFT City",
    tags: ["gift", "ifsca", "ifsc", "gujarat", "hub"],
    text: "FEMA treatment of IFSC units and investment permissions require the applicable regulations and OI Schedule V to be checked. IFSCA supervises specified IFSC regulated activities. The six-lane RBI, MoF, FIU-IND, DPIIT, CBDT and IFSCA shared-record view is this prototype's demonstration model, not a statutory requirement that all six approve every ODI/OPI payment, and no official regulator connection is provisioned.",
  },
  {
    id: "fiu-reporting",
    title: "Reporting obligations to FIU-IND",
    source: "Prevention of Money Laundering Act, 2002 — Section 12, PMLA Rules",
    tags: ["fiu", "aml", "reporting", "suspicious", "ctr"],
    text: "Reporting entities must furnish cross-border wire transfer reports for transfers exceeding five lakh rupees or equivalent, and suspicious transaction reports within seven working days of the reasoned belief being formed. Records must be preserved for five years from the date of the transaction.",
  },
  {
    id: "ad-bank-duty",
    title: "AD Category-I bank due diligence and UIN",
    source: "FEM (Overseas Investment) Directions, 2022 — Para 5 and 22",
    tags: ["ad bank", "uin", "designated", "fla", "apr"],
    text: "The designated AD Category-I bank verifies eligibility, the valuation certificate, the pricing guidelines and the net worth certificate before allotting a Unique Identification Number through the OID application. Annual Performance Reports and the FLA return follow the UIN for the life of the investment.",
  },
  {
    id: "lrs-boundary",
    title: "LRS boundary for resident individuals",
    source: "FEM (Overseas Investment) Rules, 2022 — Schedule III",
    tags: ["lrs", "individual", "250000", "resident"],
    text: "A resident individual may make overseas investment within the Liberalised Remittance Scheme limit of USD 250,000 per financial year. ODI by a resident individual in an operating foreign entity engaged in financial services activity is not permitted.",
  },
  {
    id: "sanctions-screening",
    title: "Counterparty and jurisdiction screening",
    source: "UNSC sanctions lists, MHA orders, FATF public statements",
    tags: ["sanctions", "fatf", "screening", "jurisdiction"],
    text: "Applicable KYC, beneficial-owner, sanctions and jurisdiction due diligence require verified list data and a reporting entity's compliance procedure. This prototype does not provide a certified real-time sanctions feed. A hit or FATF flag requires a hold and specialist assessment; RBI approval is not a universal remedy for prohibited activity. FIU reporting follows the reporting entity's statutory obligations, not an invented approval workflow or automatic parallel regulator clearance.",
  },
  {
    id: "valuation",
    title: "Pricing and valuation for overseas issue and transfer",
    source: "FEM (Overseas Investment) Rules, 2022 — Rule 16",
    tags: ["valuation", "pricing", "arm's length", "fair"],
    text: "The applicable overseas equity issue or transfer pricing must meet the arm's-length requirement under the OI Rules. Valuation methodology, documents and the AD bank's board-approved policy require fact-specific review; do not assume a universal valuation-certificate threshold. Confirm current rules and evidence with the designated AD bank.",
  },
  ...LEGAL_SOURCES.map((source) => ({ id: `legal-source-${source.id}`, title: source.title, source: `${source.provision} — ${source.url}`, tags: [source.id, "law", "statute", "odi", "opi", "source"], text: `${source.use} Reference summary only: independently verify current amendments, precise applicability and source wording. No statutory clearance, tax opinion or regulatory endorsement is granted by the prototype.` })),
  { id: "inr-denomination-boundary", title: "INR denomination versus INR-linked financial products", source: "OI Rules 2022, Rule 19 and current RBI OI directions", tags: ["inr", "rupee", "linked", "denomination", "settlement"], text: "INR denomination and dealing in financial products linked to INR are separate facts. Under Rule 19, ODI in a foreign entity dealing in INR-linked financial products requires specific RBI approval. An INR-denominated investment is not automatically such a product, nor automatically permitted. Verify instrument eligibility, payment mode, bank arrangement and applicable current directions." },
];

const STOP = new Set([
  "the","a","an","of","for","to","in","on","and","or","is","are","what","how","do","does","i","we","my",
  "can","should","need","with","from","be","this","that","it","as","at","by","if","when","which","its",
]);

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Deterministic BM25-flavoured lexical retriever over the enterprise corpus. */
export function retrieve(query: string, k = 4) {
  const terms = tokenize(query);
  const scored = CORPUS.map((doc) => {
    const hay = `${doc.title} ${doc.tags.join(" ")} ${doc.text}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (doc.tags.includes(t)) score += 3;
      const hits = hay.split(t).length - 1;
      score += Math.min(hits, 4) * 1.15;
    }
    return { doc, score: Number(score.toFixed(2)) };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const max = scored[0]?.score || 1;
  return scored.map(({ doc, score }) => ({
    id: doc.id,
    title: doc.title,
    source: doc.source,
    text: doc.text,
    score: Number((score / max).toFixed(2)),
    origin: "enterprise" as const,
  }));
}
