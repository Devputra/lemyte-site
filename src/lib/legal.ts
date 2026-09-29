// Single source of truth for the business details shown on the legal pages
// (/terms, /privacy, /refund-policy, /shipping-policy, /contact). Razorpay's website review
// checks that these match the merchant account, so keep them identical to the KYC details.
export const LEGAL = {
  brand: "Lemyte",
  company: "DXOCTAGON (OPC) Private Limited",
  website: "https://lemyte.com",
  email: "team@lemyte.com",
  phone: "+91 63824 89221",
  // Registered office address exactly as on the Certificate of Incorporation.
  address: "",
  // City whose courts have jurisdiction (usually the registered office city).
  jurisdictionCity: "",
  // Grievance Officer (IT Rules 2011 / DPDP Act 2023): a named person.
  grievanceOfficer: "",
  supportHours: "Monday to Saturday, 10:00 AM to 6:00 PM IST",
  effectiveDate: "29 September 2026",
  refundWindowDays: 7,
  refundMaxAttempts: 2,
} as const;

/** Placeholder text for a detail that still has to be filled in above. */
export function fill(value: string, label: string): string {
  return value || `[${label}]`;
}
