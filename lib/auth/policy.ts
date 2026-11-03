/** Shared, side-effect-free authorization rules. Dates are school-local dates. */
export function schoolDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
}

export function isEffective(record: {
  status?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}, today = schoolDate()): boolean {
  return record.status === "active" &&
    (!(record.valid_from || record.start_date) || (record.valid_from || record.start_date)! <= today) &&
    (!(record.valid_to || record.end_date) || (record.valid_to || record.end_date)! >= today);
}

export function isVerifiedGuardian(record: {
  verification_status?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
}, today = schoolDate()): boolean {
  return record.verification_status === "verified" &&
    (!record.valid_from || record.valid_from <= today) &&
    (!record.valid_to || record.valid_to >= today);
}
