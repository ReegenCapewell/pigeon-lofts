import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/auth";
import { requireUser } from "@/lib/apiAuth";
import { parseMedicalInput, type MedicalInput } from "@/lib/medical";

type Body = MedicalInput & { birdIds?: string[]; loftId?: string };

// POST /api/medical { birdIds?: string[], loftId?: string, ...record }
// Logs one record for one bird, a selection of birds, or every bird in a loft.
// Each bird gets its own copy; copies made together share a batchId.
export async function POST(req: Request) {
  const { user, res } = await requireUser();
  if (!user) return res!;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const parsed = parseMedicalInput(body);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const data = parsed.data;

  let birds: { id: string; ring: string; dateOfBirth: Date | null }[] = [];
  if (body.loftId) {
    const loft = await prisma.loft.findFirst({
      where: { id: body.loftId, ownerId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!loft) return NextResponse.json({ error: "Loft not found." }, { status: 404 });
    birds = await prisma.bird.findMany({
      where: { loftId: loft.id, ownerId: user.id, deletedAt: null },
      select: { id: true, ring: true, dateOfBirth: true },
    });
  } else if (Array.isArray(body.birdIds) && body.birdIds.length) {
    const ids = [...new Set(body.birdIds.filter((x): x is string => typeof x === "string"))].slice(0, 500);
    birds = await prisma.bird.findMany({
      where: { id: { in: ids }, ownerId: user.id, deletedAt: null },
      select: { id: true, ring: true, dateOfBirth: true },
    });
    if (birds.length !== ids.length) return NextResponse.json({ error: "Bird not found." }, { status: 404 });
  }
  if (!birds.length) return NextResponse.json({ error: "Choose at least one bird." }, { status: 400 });

  // A bird can't be treated before it hatched: leave those birds out.
  const eligible = birds.filter((b) => !b.dateOfBirth || b.dateOfBirth <= data.date);
  const skipped = birds.filter((b) => !eligible.includes(b)).map((b) => b.ring);
  if (!eligible.length) {
    return NextResponse.json(
      { error: birds.length === 1 ? "That date is before this bird was born." : "All of those birds were born after that date." },
      { status: 400 }
    );
  }

  const batchId = eligible.length > 1 ? randomBytes(12).toString("base64url") : null;
  await prisma.medicalRecord.createMany({
    data: eligible.map((b) => ({ ...data, ownerId: user.id, birdId: b.id, batchId })),
  });

  // A new vaccination/treatment of the same kind clears older reminders for it.
  if (data.category) {
    await prisma.medicalRecord.updateMany({
      where: {
        ownerId: user.id,
        birdId: { in: eligible.map((b) => b.id) },
        type: data.type,
        category: data.category,
        ...(data.category === "OTHER" ? { title: data.title } : {}),
        reminderDone: false,
        nextDueDate: { not: null },
        date: { lt: data.date },
      },
      data: { reminderDone: true },
    });
  }

  return NextResponse.json({ ok: true, created: eligible.length, skipped }, { status: 201 });
}
