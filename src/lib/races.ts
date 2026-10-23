// Race result helpers shared by the API, pages and pedigree.
// Plain TypeScript (no Prisma imports) so client components can use it.
import { formatDob, parseDob } from "@/lib/dateOfBirth";

export type RaceType = "OLD_BIRD" | "YOUNG_BIRD";
export type RaceStatus = "PLACED" | "CLOCKED" | "NOT_CLOCKED" | "LATE" | "LOST";

export const RACE_TYPE_LABELS: Record<RaceType, string> = {
  OLD_BIRD: "Old bird",
  YOUNG_BIRD: "Young bird",
};

export const RACE_STATUS_LABELS: Record<RaceStatus, string> = {
  PLACED: "Placed",
  CLOCKED: "Clocked, not placed",
  NOT_CLOCKED: "Not clocked",
  LATE: "Returned late",
  LOST: "Lost",
};

export const LEVELS = [
  { key: "club", label: "Club" },
  { key: "fed", label: "Fed" },
  { key: "open", label: "Open" },
] as const;
export type LevelKey = (typeof LEVELS)[number]["key"];

// Results with a placing this good or better are shown on the pedigree by default.
export const PEDIGREE_TOP_POSITION = 10;

export const YARDS_PER_MILE = 1760;

// The shape the client sends and the page receives (dates as dd/mm/yyyy).
export type RaceResultDTO = {
  id: string;
  raceName: string;
  raceDate: string;
  organisation: string | null;
  raceType: RaceType | null;
  status: RaceStatus;
  liberationTime: string | null;
  clockTime: string | null;
  clockDayOffset: number;
  distanceYards: number | null;
  clubPosition: number | null;
  clubBirds: number | null;
  clubLofts: number | null;
  fedPosition: number | null;
  fedBirds: number | null;
  fedLofts: number | null;
  openPosition: number | null;
  openBirds: number | null;
  openLofts: number | null;
  points: number | null;
  prizePence: number | null;
  weather: string | null;
  wind: string | null;
  notes: string | null;
  showOnPedigree: boolean;
};

// 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd"
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

// "14:05", "14:05:30" or "14.05.30" -> seconds since midnight, or null.
export function parseTime(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = input.trim().match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?$/);
  if (!m) return null;
  const [h, min, s] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  if (h > 23 || min > 59 || s > 59) return null;
  return h * 3600 + min * 60 + s;
}

export function normaliseTime(input: string | null | undefined): string | null {
  const secs = parseTime(input);
  if (secs === null) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return s ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`;
}

// Flying time in seconds, or null if the times are missing or don't make sense.
export function flyingSeconds(r: Pick<RaceResultDTO, "liberationTime" | "clockTime" | "clockDayOffset">): number | null {
  const lib = parseTime(r.liberationTime);
  const clock = parseTime(r.clockTime);
  if (lib === null || clock === null) return null;
  const secs = clock + (r.clockDayOffset || 0) * 86400 - lib;
  return secs > 0 ? secs : null;
}

export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

// Velocity in yards per minute, the usual UK ranking measure.
export function velocityYpm(r: Pick<RaceResultDTO, "liberationTime" | "clockTime" | "clockDayOffset" | "distanceYards">): number | null {
  const secs = flyingSeconds(r);
  if (!secs || !r.distanceYards) return null;
  return r.distanceYards / (secs / 60);
}

export function formatVelocity(ypm: number): string {
  return `${ypm.toLocaleString("en-GB", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ypm`;
}

export function formatDistance(yards: number): string {
  const miles = Math.floor(yards / YARDS_PER_MILE);
  const rest = yards % YARDS_PER_MILE;
  return rest ? `${miles} mi ${rest} yd` : `${miles} mi`;
}

export function formatPrize(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function bestPosition(r: Pick<RaceResultDTO, "clubPosition" | "fedPosition" | "openPosition">): number | null {
  const ps = [r.clubPosition, r.fedPosition, r.openPosition].filter((p): p is number => typeof p === "number");
  return ps.length ? Math.min(...ps) : null;
}

export function shouldShowOnPedigreeByDefault(r: Pick<RaceResultDTO, "clubPosition" | "fedPosition" | "openPosition">) {
  const best = bestPosition(r);
  return best !== null && best <= PEDIGREE_TOP_POSITION;
}

// e.g. "1st Club, 14th Fed Bourges 2023 (YB)"
export function pedigreeLine(r: Pick<RaceResultDTO, "raceName" | "raceDate" | "raceType" | "clubPosition" | "fedPosition" | "openPosition">): string {
  const parts: string[] = [];
  if (r.clubPosition) parts.push(`${ordinal(r.clubPosition)} Club`);
  if (r.fedPosition) parts.push(`${ordinal(r.fedPosition)} Fed`);
  if (r.openPosition) parts.push(`${ordinal(r.openPosition)} Open`);
  const year = r.raceDate.slice(-4);
  const yb = r.raceType === "YOUNG_BIRD" ? " (YB)" : "";
  return `${parts.length ? parts.join(", ") + " " : ""}${r.raceName} ${year}${yb}`.trim();
}

// Orders results best-first for the pedigree: best placing, then most recent.
type PedigreeSortable = Pick<RaceResultDTO, "raceDate" | "clubPosition" | "fedPosition" | "openPosition">;
export function compareForPedigree(a: PedigreeSortable, b: PedigreeSortable): number {
  const pa = bestPosition(a) ?? Infinity;
  const pb = bestPosition(b) ?? Infinity;
  if (pa !== pb) return pa - pb;
  return dateKey(b.raceDate) - dateKey(a.raceDate);
}

export function dateKey(ddmmyyyy: string): number {
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? Number(m[3] + m[2] + m[1]) : 0;
}

// ---- Input validation (used by the API; returns Prisma-ready data) ----

export type RaceInput = Partial<Record<keyof RaceResultDTO, unknown>> & {
  distanceMiles?: unknown;
  distanceExtraYards?: unknown;
  prize?: unknown; // "12.50" in pounds
};

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

function wholeNumber(v: unknown, label: string, max = 1_000_000): number | null | string {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  if (!Number.isInteger(n) || n < 0 || n > max) return `${label} must be a whole number.`;
  return n;
}

export type RaceData = {
  raceName: string;
  raceDate: Date;
  organisation: string | null;
  raceType: RaceType | null;
  status: RaceStatus;
  liberationTime: string | null;
  clockTime: string | null;
  clockDayOffset: number;
  distanceYards: number | null;
  clubPosition: number | null;
  clubBirds: number | null;
  clubLofts: number | null;
  fedPosition: number | null;
  fedBirds: number | null;
  fedLofts: number | null;
  openPosition: number | null;
  openBirds: number | null;
  openLofts: number | null;
  points: number | null;
  prizePence: number | null;
  weather: string | null;
  wind: string | null;
  notes: string | null;
  showOnPedigree: boolean;
};

// Validates a race result form. `birdDob` (if known) must be before the race.
export function parseRaceInput(
  input: RaceInput,
  birdDob: Date | null,
  now: Date = new Date()
): { data: RaceData; error: null } | { data: null; error: string } {
  const fail = (error: string) => ({ data: null, error }) as const;

  const raceName = text(input.raceName, 80);
  if (!raceName) return fail("Enter the race (e.g. the race point, like Bourges).");

  const dateRaw = typeof input.raceDate === "string" ? input.raceDate : "";
  if (!dateRaw.trim()) return fail("Enter the race date.");
  const parsed = parseDob(dateRaw, now);
  if (parsed.error !== null) {
    return fail(parsed.error.replace("Date of birth", "Race date").replace("date of birth", "race date"));
  }
  const raceDate = parsed.date;
  if (birdDob && raceDate < birdDob) {
    return fail(`The race date is before this bird was born (${formatDob(birdDob)}).`);
  }

  const raceType = input.raceType === "OLD_BIRD" || input.raceType === "YOUNG_BIRD" ? input.raceType : null;
  const status = (["PLACED", "CLOCKED", "NOT_CLOCKED", "LATE", "LOST"] as const).includes(input.status as RaceStatus)
    ? (input.status as RaceStatus)
    : "PLACED";

  const libText = text(input.liberationTime, 10);
  const clockText = text(input.clockTime, 10);
  const liberationTime = libText ? normaliseTime(libText) : null;
  const clockTime = clockText ? normaliseTime(clockText) : null;
  if (libText && !liberationTime) return fail("Liberation time must look like 07:30 or 07:30:15.");
  if (clockText && !clockTime) return fail("Clock time must look like 14:05 or 14:05:42.");
  const dayOffset = wholeNumber(input.clockDayOffset, "Days after liberation", 7);
  if (typeof dayOffset === "string") return fail(dayOffset);
  const clockDayOffset = dayOffset ?? 0;
  if (liberationTime && clockTime && flyingSeconds({ liberationTime, clockTime, clockDayOffset }) === null) {
    return fail("The clock time is before the liberation time. If the bird was clocked the next day, set that.");
  }

  let distanceYards: number | null = null;
  const miles = wholeNumber(input.distanceMiles, "Distance (miles)", 2000);
  const yards = wholeNumber(input.distanceExtraYards, "Distance (yards)", YARDS_PER_MILE - 1);
  if (typeof miles === "string") return fail(miles);
  if (typeof yards === "string") return fail(yards);
  if (miles !== null || yards !== null) distanceYards = (miles ?? 0) * YARDS_PER_MILE + (yards ?? 0);
  if (distanceYards === 0) distanceYards = null;

  const nums: Record<string, number | null> = {};
  for (const level of LEVELS) {
    for (const [field, label] of [
      ["Position", "position"],
      ["Birds", "birds competing"],
      ["Lofts", "lofts competing"],
    ] as const) {
      const key = `${level.key}${field}`;
      const v = wholeNumber((input as Record<string, unknown>)[key], `${level.label} ${label}`);
      if (typeof v === "string") return fail(v);
      if (v === 0 && field === "Position") return fail(`${level.label} position must be 1 or more.`);
      nums[key] = v;
    }
    const pos = nums[`${level.key}Position`];
    const birds = nums[`${level.key}Birds`];
    if (pos && birds && pos > birds) {
      return fail(`${level.label} position (${ordinal(pos)}) can't be more than the number of birds competing (${birds}).`);
    }
  }

  let points: number | null = null;
  if (input.points !== null && input.points !== undefined && input.points !== "") {
    const p = Number(String(input.points).trim());
    if (!Number.isFinite(p) || p < 0 || p > 100000) return fail("Points must be a number.");
    points = Math.round(p * 100) / 100;
  }

  let prizePence: number | null = null;
  if (input.prize !== null && input.prize !== undefined && input.prize !== "") {
    const p = Number(String(input.prize).replace(/[£,\s]/g, ""));
    if (!Number.isFinite(p) || p < 0 || p > 1_000_000) return fail("Prize money must be an amount like 12.50.");
    prizePence = Math.round(p * 100);
  }

  const positions = { clubPosition: nums.clubPosition, fedPosition: nums.fedPosition, openPosition: nums.openPosition };
  const showOnPedigree =
    typeof input.showOnPedigree === "boolean" ? input.showOnPedigree : shouldShowOnPedigreeByDefault(positions);

  return {
    error: null,
    data: {
      raceName,
      raceDate,
      organisation: text(input.organisation, 80),
      raceType,
      status,
      liberationTime,
      clockTime,
      clockDayOffset,
      distanceYards,
      clubPosition: nums.clubPosition,
      clubBirds: nums.clubBirds,
      clubLofts: nums.clubLofts,
      fedPosition: nums.fedPosition,
      fedBirds: nums.fedBirds,
      fedLofts: nums.fedLofts,
      openPosition: nums.openPosition,
      openBirds: nums.openBirds,
      openLofts: nums.openLofts,
      points,
      prizePence,
      weather: text(input.weather, 80),
      wind: text(input.wind, 80),
      notes: text(input.notes, 500),
      showOnPedigree,
    },
  };
}

// Converts a database row to the DTO the pages use.
export function toRaceDTO(row: Omit<RaceData, never> & { id: string }): RaceResultDTO {
  return { ...row, raceDate: formatDob(row.raceDate) };
}
