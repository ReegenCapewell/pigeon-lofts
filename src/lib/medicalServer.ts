import { prisma } from "@/lib/auth";
import { toMedicalDTO, type MedicalRecordDTO } from "@/lib/medical";

type Row = Parameters<typeof toMedicalDTO>[0];

// Converts rows to DTOs and fills in how many birds share each batch.
export async function withBatchSizes(ownerId: string, rows: Row[]): Promise<MedicalRecordDTO[]> {
  const batchIds = [...new Set(rows.map((r) => r.batchId).filter((b): b is string => !!b))];
  const sizes = new Map<string, number>();
  if (batchIds.length) {
    const groups = await prisma.medicalRecord.groupBy({
      by: ["batchId"],
      where: { ownerId, batchId: { in: batchIds } },
      _count: { _all: true },
    });
    for (const g of groups) if (g.batchId) sizes.set(g.batchId, g._count._all);
  }
  return rows.map((r) => ({ ...toMedicalDTO(r), batchSize: r.batchId ? sizes.get(r.batchId) ?? 1 : 1 }));
}
