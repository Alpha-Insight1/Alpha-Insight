/** Default fee types for Alpha Insight (admin can add more) */
export const DEFAULT_FEE_TYPES = [
  { name: "School Fees", description: "Term school fees" },
  { name: "NECO", description: "NECO examination" },
  { name: "JAMB", description: "JAMB / UTME" },
  { name: "Uniform", description: "School uniform" },
  { name: "School Bus", description: "School bus fee" },
] as const;

/** Show every fee type from the database to secretary */
export function isAllowedFeeTypeName(name?: string | null): boolean {
  return Boolean(name && String(name).trim().length > 0);
}

export function isExamRegistrationFeeName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return ["jamb", "waec", "neco", "gce", "bece", "ssce", "utme"].some((h) =>
    n.includes(h)
  );
}
