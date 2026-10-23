// src/lib/validation.ts

// UK ring numbers, e.g. RPRA "GB22T12345": a 2–4 letter union prefix,
// a 2-digit year, an optional letter, then 4–6 digits (RPRA rings normally
// have 5; GB17N/GB17Z rings were made with 6).
export const ringRegex = /^[A-Z]{2,4}[0-9]{2}[A-Z]?[0-9]{4,6}$/;

export function isValidRing(ring: string): boolean {
  if (!ring) return false;
  return ringRegex.test(normaliseRing(ring));
}

export function normaliseRing(ring: string): string {
  return ring.toUpperCase().replace(/[\s-]+/g, "");
}
