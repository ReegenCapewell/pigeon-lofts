// Medical record helpers shared by the API, pages and forms.
// Plain TypeScript (no Prisma imports) so client components can use it.
// The app only records what the owner enters; it never suggests medicines or doses.
import { addMonths, formatDob, parseDay, todayUtc } from "@/lib/dateOfBirth";

export type MedicalType = "VACCINATION" | "TREATMENT" | "ILLNESS" | "HEALTH_CHECK";

export const MEDICAL_TYPE_LABELS: Record<MedicalType, string> = {
  VACCINATION: "Vaccination",
  TREATMENT: "Treatment",
  ILLNESS: "Illness / vet visit",
  HEALTH_CHECK: "Health check",
};

export const VACCINES = {
  PMV: "PMV (paramyxovirus)",
  POX: "Pigeon pox",
  SALMONELLA: "Salmonella (paratyphoid)",
  ROTAVIRUS: "Rotavirus",
  OTHER: "Other",
} as const;

export const CONDITIONS = {
  CANKER: "Canker (trichomoniasis)",
  WORMS: "Worms",
  COCCI: "Coccidiosis",
  RESPIRATORY: "Respiratory / one-eye cold",
  OTHER: "Other",
} as const;

export const METHODS = {
  WATER: "In drinking water",
  TABLET: "Tablet / capsule",
  INJECTION: "Injection",
  DROPS: "Eye / nose drops",
  FEED: "In feed",
  OTHER: "Other",
} as const;

export const OUTCOMES = {
  ONGOING: "Ongoing",
  RECOVERED: "Recovered",
  DIED: "Died",
} as const;

export const CONDITION_SCORES = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
} as const;

// A PMV vaccination without its own "next due" date is treated as lasting this long.
export const PMV_DEFAULT_MONTHS = 12;
// Reminders show as "due soon" this many days before the due date.
export const DUE_SOON_DAYS = 14;

export type MedicalRecordDTO = {
  id: string;
  birdId: string;
  type: MedicalType;
  date: string; // dd/mm/yyyy
  endDate: string | null;
  nextDueDate: string | null;
  reminderDone: boolean;
  category: string | null;
  title: string | null;
  product: string | null;
  batchNumber: string | null;
  dose: string | null;
  method: string | null;
  vet: string | null;
  outcome: string | null;
  weightGrams: number | null;
  condition: string | null;
  notes: string | null;
  batchId: string | null;
  batchSize?: number; // how many birds share this batch (when known)
};

// "PMV (paramyxovirus)" / "Canker (trichomoniasis)" / custom title / diagnosis
export function recordHeading(r: Pick<MedicalRecordDTO, "type" | "category" | "title">): string {
  if (r.type === "VACCINATION") {
    if (r.category && r.category !== "OTHER") return VACCINES[r.category as keyof typeof VACCINES] ?? r.category;
    return r.title || "Vaccination";
  }
  if (r.type === "TREATMENT") {
    if (r.category && r.category !== "OTHER") return CONDITIONS[r.category as keyof typeof CONDITIONS] ?? r.category;
    return r.title || "Treatment";
  }
  if (r.type === "ILLNESS") return r.title || "Illness / vet visit";
  return "Health check";
}

export function label<T extends Record<string, string>>(map: T, key: string | null): string | null {
  return key ? (map[key as keyof T] ?? key) : null;
}

// ---- Dates as comparable numbers (yyyymmdd) for client-side checks ----
export function dayKey(ddmmyyyy: string | null | undefined): number | null {
  const m = ddmmyyyy?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? Number(m[3] + m[2] + m[1]) : null;
}

function keyOf(d: Date): number {
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

// ---- Reminders ----
export type DueState = "overdue" | "due-soon" | "upcoming";

export function dueState(nextDue: string | null, now: Date = new Date()): DueState | null {
  const due = dayKey(nextDue);
  if (due === null) return null;
  const today = todayUtc(now);
  const soon = new Date(today);
  soon.setUTCDate(soon.getUTCDate() + DUE_SOON_DAYS);
  if (due < keyOf(today)) return "overdue";
  if (due <= keyOf(soon)) return "due-soon";
  return "upcoming";
}

// ---- PMV status ----
export type PmvStatus = { state: "valid" | "due-soon" | "expired" | "none"; lastGiven: string | null; validUntil: string | null };

type PmvRecord = Pick<MedicalRecordDTO, "type" | "category" | "date" | "nextDueDate">;

export function pmvValidUntil(r: PmvRecord): string {
  if (r.nextDueDate) return r.nextDueDate;
  const [d, m, y] = r.date.split("/").map(Number);
  return formatDob(addMonths(new Date(Date.UTC(y, m - 1, d)), PMV_DEFAULT_MONTHS));
}

// Cover periods [given, valid until] for a bird's PMV vaccinations.
export function pmvPeriods(records: PmvRecord[]): { from: string; until: string }[] {
  return records
    .filter((r) => r.type === "VACCINATION" && r.category === "PMV")
    .map((r) => ({ from: r.date, until: pmvValidUntil(r) }));
}

// Is the bird covered by a PMV vaccination on `date` (dd/mm/yyyy)?
export function pmvCoveredOn(periods: { from: string; until: string }[], date: string): boolean {
  const k = dayKey(date);
  if (k === null) return true;
  return periods.some((p) => (dayKey(p.from) ?? 0) <= k && k <= (dayKey(p.until) ?? 0));
}

export function pmvStatus(records: PmvRecord[], now: Date = new Date()): PmvStatus {
  const pmv = records
    .filter((r) => r.type === "VACCINATION" && r.category === "PMV")
    .sort((a, b) => (dayKey(b.date) ?? 0) - (dayKey(a.date) ?? 0));
  const latest = pmv[0];
  if (!latest) return { state: "none", lastGiven: null, validUntil: null };
  const validUntil = pmvValidUntil(latest);
  const due = dueState(validUntil, now);
  const state = due === "overdue" ? "expired" : due === "due-soon" ? "due-soon" : "valid";
  return { state, lastGiven: latest.date, validUntil };
}

// ---- Input validation (used by the API; returns Prisma-ready data) ----

export type MedicalInput = Partial<Record<keyof MedicalRecordDTO, unknown>> & { weight?: unknown };

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

function code<T extends Record<string, string>>(map: T, v: unknown): string | null {
  return typeof v === "string" && v in map ? v : null;
}

export type MedicalData = {
  type: MedicalType;
  date: Date;
  endDate: Date | null;
  nextDueDate: Date | null;
  category: string | null;
  title: string | null;
  product: string | null;
  batchNumber: string | null;
  dose: string | null;
  method: string | null;
  vet: string | null;
  outcome: string | null;
  weightGrams: number | null;
  condition: string | null;
  notes: string | null;
};

export function parseMedicalInput(
  input: MedicalInput,
  now: Date = new Date()
): { data: MedicalData; error: null } | { data: null; error: string } {
  const fail = (error: string) => ({ data: null, error }) as const;

  const type = (["VACCINATION", "TREATMENT", "ILLNESS", "HEALTH_CHECK"] as const).find((t) => t === input.type);
  if (!type) return fail("Choose what kind of record this is.");

  const dateLabel = type === "TREATMENT" ? "Start date" : "Date";
  const dateRaw = typeof input.date === "string" ? input.date : "";
  if (!dateRaw.trim()) return fail(`Enter the ${dateLabel.toLowerCase()}.`);
  const date = parseDay(dateRaw, { label: dateLabel, now });
  if (date.error !== null) return fail(date.error);

  const optionalDate = (v: unknown, lbl: string) => {
    if (typeof v !== "string" || !v.trim()) return { date: null, error: null } as const;
    return parseDay(v, { label: lbl, allowFuture: true, now });
  };
  const end = optionalDate(input.endDate, "End date");
  if (end.error !== null) return fail(end.error);
  if (end.date && end.date < date.date) return fail("The end date is before the start date.");
  const next = optionalDate(input.nextDueDate, "Next due date");
  if (next.error !== null) return fail(next.error);
  if (next.date && next.date <= date.date) return fail("The next due date must be after the date given.");

  let category: string | null = null;
  if (type === "VACCINATION") {
    category = code(VACCINES, input.category);
    if (!category) return fail("Choose which vaccine.");
  } else if (type === "TREATMENT") {
    category = code(CONDITIONS, input.category);
    if (!category) return fail("Choose what the treatment was for.");
  }

  const title = text(input.title, 120);
  if (category === "OTHER" && !title) {
    return fail(type === "VACCINATION" ? "Enter the vaccine name." : "Enter what the treatment was for.");
  }
  if (type === "ILLNESS" && !title) return fail("Enter the symptoms or diagnosis.");

  let weightGrams: number | null = null;
  const weightRaw = input.weight ?? input.weightGrams;
  if (weightRaw !== undefined && weightRaw !== null && weightRaw !== "") {
    const w = Number(String(weightRaw).replace(/g$/i, "").trim());
    if (!Number.isInteger(w) || w < 50 || w > 2000) return fail("Weight must be a whole number of grams, e.g. 480.");
    weightGrams = w;
  }
  const condition = code(CONDITION_SCORES, input.condition);
  const notes = text(input.notes, 1000);
  if (type === "HEALTH_CHECK" && !weightGrams && !condition && !notes) {
    return fail("Add a weight, a condition or some notes for the health check.");
  }

  return {
    error: null,
    data: {
      type,
      date: date.date,
      endDate: type === "TREATMENT" ? end.date : null,
      nextDueDate: next.date,
      category,
      title: type === "HEALTH_CHECK" ? null : title,
      product: type === "VACCINATION" || type === "TREATMENT" || type === "ILLNESS" ? text(input.product, 120) : null,
      batchNumber: type === "VACCINATION" ? text(input.batchNumber, 60) : null,
      dose: type === "TREATMENT" || type === "VACCINATION" ? text(input.dose, 120) : null,
      method: type === "TREATMENT" || type === "VACCINATION" ? code(METHODS, input.method) : null,
      vet: type === "ILLNESS" || type === "VACCINATION" || type === "TREATMENT" ? text(input.vet, 120) : null,
      outcome: type === "ILLNESS" ? code(OUTCOMES, input.outcome) : null,
      weightGrams: type === "HEALTH_CHECK" ? weightGrams : null,
      condition: type === "HEALTH_CHECK" ? condition : null,
      notes,
    },
  };
}

type MedicalRow = Omit<MedicalData, "date" | "endDate" | "nextDueDate"> & {
  id: string;
  birdId: string;
  date: Date;
  endDate: Date | null;
  nextDueDate: Date | null;
  reminderDone: boolean;
  batchId: string | null;
};

export function toMedicalDTO(row: MedicalRow): MedicalRecordDTO {
  return {
    ...row,
    date: formatDob(row.date),
    endDate: row.endDate ? formatDob(row.endDate) : null,
    nextDueDate: row.nextDueDate ? formatDob(row.nextDueDate) : null,
  };
}
