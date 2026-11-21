/** Display linkage only: never use this relaxed match to authorize a filing. */
export function companyDisplayKey(name: string) {
  return name.toLowerCase().replace(/\b(limited|ltd)\b/g, "").replace(/[^a-z0-9]/g, "");
}

export function matchDisplayCompany<T>(name: string, rows: T[], label: (row: T) => string): T | undefined {
  const key = companyDisplayKey(name);
  return key ? rows.find((row) => companyDisplayKey(label(row)) === key) : undefined;
}