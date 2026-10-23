// Mirrors the Prisma `Sex` enum. Kept as plain strings so client components
// can use it without importing @prisma/client.
export type BirdSex = "MALE" | "FEMALE";

export const SEX_LABELS: Record<BirdSex, string> = {
  MALE: "Male",
  FEMALE: "Female",
};

// Accepts "MALE" / "FEMALE" (any case); anything else, including "" and
// "UNKNOWN", means not yet sexed.
export function parseSex(input: unknown): BirdSex | null {
  if (typeof input !== "string") return null;
  const v = input.trim().toUpperCase();
  return v === "MALE" || v === "FEMALE" ? v : null;
}
