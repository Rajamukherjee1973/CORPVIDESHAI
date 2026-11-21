export function canSubmitCompany(company: string, assigned: string[]) {
  return assigned.includes(company);
}

export function reportingStatus(due: string, filed: boolean, today: string) {
  if (filed) return "Recorded (simulation)";
  return due < today ? "Past estimated deadline · verify" : "Upcoming · verify deadline";
}