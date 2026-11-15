
/** Common fee types (exact or contains match) */
export const ALLOWED_FEE_TYPE_NAMES = [
  "WAEC",
  "NECO",
  "GCE",
  "BECE",
  "Primary 6 Leaving Certificate",
  "WAEC Result",
  "Testimonial",
  "School Fees",
  "Tuition (Monthly)",
  "JAMB",
  "NECO GCE",
  "WAEC GCE",
  "Uniform",
  "Bus Fee",
  "School Bus",
] as const;

export function isAllowedFeeTypeName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  // Show all fee types that match known names OR any active type in DB
  // Prefer allowlist; if name is custom from admin, still allow (secretary needs it)
  if (ALLOWED_FEE_TYPE_NAMES.some((a) => a.toLowerCase() === n || n.includes(a.toLowerCase()) || a.toLowerCase().includes(n))) {
    return true;
  }
  // Allow any fee type created by admin (not empty)
  return n.length > 0;
}

export function isExamRegistrationFeeName(name?: string | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return ["jamb", "waec", "neco", "gce", "bece", "ssce", "utme"].some((h) =>
    n.includes(h)
  );
}
