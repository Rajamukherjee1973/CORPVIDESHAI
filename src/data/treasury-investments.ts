import { ODI_PURPOSES, OPI_PURPOSES } from "./purposes";
export const TREASURY_INVESTMENTS = [
  ...ODI_PURPOSES.map((p) => ({ ...p, kind: "ODI" as const })),
  ...OPI_PURPOSES.map((p) => ({ ...p, kind: "OPI" as const })),
  ...["Overseas industrial automation subsidiary", "Overseas grid storage operating subsidiary", "Foreign medical diagnostics operating acquisition", "Overseas circular-economy manufacturing joint venture", "Foreign precision agriculture operating subsidiary", "Overseas marine engineering operating acquisition"].map((label, i) => ({ code: `ODI-EXT-${i + 1}`, kind: "ODI" as const, label, basis: "OI Rules 2022, Schedule I · eligibility review required", plain: "Strategic operating investment scenario; confirm sector, instrument, ownership and financial commitment before selecting a route." })),
  ...["Foreign listed global quality equity ETF", "Foreign listed minimum-volatility equity ETF", "Foreign listed investment-grade bond ETF", "Foreign listed short-maturity government bond ETF", "Foreign listed broad-market dividend ETF", "Foreign listed infrastructure equity ETF"].map((label, i) => ({ code: `OPI-EXT-${i + 1}`, kind: "OPI" as const, label, basis: "OI Rules 2022, Schedule II · eligibility review required", plain: "Non-controlling listed fund scenario; verify instrument eligibility, investor category, limits and applicable reporting." })),
];
export const FEMA_REFERENCES = [
  { title: "FEMA, 1999", scope: "Parent Act · powers, regulated capital-account transactions and enforcement", url: "https://www.rbi.org.in/Scripts/FEMA.aspx" },
  { title: "Overseas Investment Rules, 2022", scope: "G.S.R. 646(E), 22 August 2022 · definitions, investor eligibility, restrictions and schedules", url: "https://www.rbi.org.in/Scripts/bs_viewcontent.aspx?Id=5087" },
  { title: "Overseas Investment Regulations, 2022", scope: "FEMA 400/2022-RB · debt, guarantees, financial commitment and reporting obligations", url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12380" },
  { title: "RBI Master Direction — Overseas Investment", scope: "Operational directions · designated AD bank, evidence and reporting. Check the source update date.", url: "https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12710" },
];