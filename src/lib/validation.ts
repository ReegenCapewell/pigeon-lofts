// src/lib/validation.ts

// 2 letters, 2 digits, optional 1 letter, 4 digits
export const ringRegex = /^[A-Z]{2}[0-9]{2}[A-Z]?[0-9]{4}$/;

export function isValidRing(ring: string): boolean {
  if (!ring) return false;
  const normalised = ring.toUpperCase().replace(/\s+/g, "");
  return ringRegex.test(normalised);
}

export function normaliseRing(ring: string): string {
  return ring.toUpperCase().replace(/\s+/g, "");
}
