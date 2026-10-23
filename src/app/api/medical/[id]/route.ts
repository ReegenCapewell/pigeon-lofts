import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/auth";
import { requireUser } from "@/lib/apiAuth";
import { parseMedicalInput, type MedicalInput } from "@/lib/medical";

async function findRecord(ownerId: string, id: string) {
  return prisma.medicalRecord.findFirst({
    where: { id, ownerId },
    select: { id: true, batchId: true, bird: { select: { dateOfBirth: true } } },
  });
}

// PATCH /api/medical/:id -> edit this bird's copy of a record.
// Sending only { reminderDone } just marks its reminder done (or not);
// add ?batch=all to do that for every bird's copy logged with it.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireUser();
  if (!user) return res!;
  const { id } = await params;

  const existing = await findRecord(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as MedicalInput | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const keys = Object.keys(body);
  if (keys.length === 1 && keys[0] === "reminderDone") {
    if (typeof body.reminderDone !== "boolean") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    if (req.nextUrl.searchParams.get("batch") === "all" && existing.batchId) {
      const { count } = await prisma.medicalRecord.updateMany({
        where: { ownerId: user.id, batchId: existing.batchId },
        data: { reminderDone: body.reminderDone },
      });
      return NextResponse.json({ ok: true, updated: count });
    }
    await prisma.medicalRecord.update({ where: { id }, data: { reminderDone: body.reminderDone } });
    return NextResponse.json({ ok: true, updated: 1 });
  }

  const parsed = parseMedicalInput(body);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const dob = existing.bird.dateOfBirth;
  if (dob && parsed.data.date < dob) {
    return NextResponse.json({ error: "That date is before this bird was born." }, { status: 400 });
  }

  await prisma.medicalRecord.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

// DELETE /api/medical/:id            -> delete this bird's copy
// DELETE /api/medical/:id?batch=all  -> delete every bird's copy logged with it
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireUser();
  if (!user) return res!;
  const { id } = await params;

  const existing = await findRecord(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("batch") === "all" && existing.batchId) {
    const { count } = await prisma.medicalRecord.deleteMany({ where: { ownerId: user.id, batchId: existing.batchId } });
    return NextResponse.json({ ok: true, deleted: count });
  }
  await prisma.medicalRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: 1 });
}
