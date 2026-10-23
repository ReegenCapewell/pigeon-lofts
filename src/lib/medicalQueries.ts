// Prisma selects for medical records, kept apart from medical.ts so that file
// stays free of server-only imports.
export const medicalRecordSelect = {
  id: true,
  birdId: true,
  type: true,
  date: true,
  endDate: true,
  nextDueDate: true,
  reminderDone: true,
  category: true,
  title: true,
  product: true,
  batchNumber: true,
  dose: true,
  method: true,
  vet: true,
  outcome: true,
  weightGrams: true,
  condition: true,
  notes: true,
  batchId: true,
} as const;

// Just what's needed to work out a bird's PMV status.
export const pmvSelect = {
  where: { type: "VACCINATION", category: "PMV" },
  select: { type: true, category: true, date: true, nextDueDate: true },
  orderBy: { date: "desc" },
} as const;

type PmvRow = { type: "VACCINATION" | "TREATMENT" | "ILLNESS" | "HEALTH_CHECK"; category: string | null; date: Date; nextDueDate: Date | null };

// Converts rows from `pmvSelect` into the dd/mm/yyyy shape `pmvStatus` expects.
export function pmvRowsToInput(rows: PmvRow[]) {
  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  return rows.map((r) => ({ type: r.type, category: r.category, date: fmt(r.date), nextDueDate: r.nextDueDate ? fmt(r.nextDueDate) : null }));
}
