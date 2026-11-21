import { validateSecureFiling } from "@/lib/regulator-filing-schema";
import { canSubmitCompany } from "@/lib/corporate-access";
import { appendFilingSnapshot, type FilingContext, type CleanFiling } from "./filing-store.server";

/** One membership lookup shared by read and append, so both enforce the same company scope. */
async function assignedCompanies(context: FilingContext) {
  const { data, error } = await context.supabase.from("filing_company_memberships").select("company").eq("user_id", context.userId);
  if (error) throw new Error("Company access could not be checked. Please retry.");
  return (data ?? []).map((m) => m.company);
}

export async function readCompanyFilings(context: FilingContext) {
  const companies = await assignedCompanies(context);
  if (!companies.length) return { companies, records: [] };
  const { data: records, error } = await context.supabase.from("form_fc_records").select("*").in("company", companies).order("recorded_at", { ascending: true });
  if (error) throw new Error("Company filings could not be loaded. Please retry.");
  return { companies, records: records ?? [] };
}

export async function appendCompanyFiling(data: CleanFiling, context: FilingContext) {
  const clean = validateSecureFiling(data);
  if (!canSubmitCompany(clean.company, await assignedCompanies(context))) throw new Error("This account is not assigned to that company.");
  return appendFilingSnapshot(clean, context);
}
