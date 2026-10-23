// Dates of birth are entered as dd/mm/yyyy and stored as UTC midnight,
// so the calendar date never shifts with the server's time zone.

export const DOB_FORMAT_HINT = "dd/mm/yyyy";

export function parseDob(
  input: string,
  now: Date = new Date()
): { date: Date; error: null } | { date: null; error: string } {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return { date: null, error: "Date of birth must be in dd/mm/yyyy format." };

  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Reject dates that rolled over, e.g. 31/02 becoming 3 March.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { date: null, error: "That date of birth doesn't exist." };
  }

  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (date.getTime() > todayUtc) {
    return { date: null, error: "Date of birth can't be in the future." };
  }

  return { date, error: null };
}

export function formatDob(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

// e.g. "12 days old", "7 months old", "2 years, 3 months old"
export function formatAge(dob: Date, now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  let months = (y - dob.getUTCFullYear()) * 12 + (m - dob.getUTCMonth());
  if (d < dob.getUTCDate()) months -= 1;
  if (months < 0) months = 0;

  if (months === 0) {
    const days = Math.max(
      0,
      Math.round((Date.UTC(y, m, d) - dob.getTime()) / 86_400_000)
    );
    return `${plural(days, "day")} old`;
  }

  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${plural(rem, "month")} old`;
  if (rem === 0) return `${plural(years, "year")} old`;
  return `${plural(years, "year")}, ${plural(rem, "month")} old`;
}
