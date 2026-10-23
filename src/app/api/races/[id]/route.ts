import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { requireUser } from "@/lib/apiAuth";
import { parseRaceInput, type RaceInput } from "@/lib/races";

async function findResult(ownerId: string, id: string) {
  return prisma.raceResult.findFirst({
    where: { id, ownerId },
    select: { id: true, bird: { select: { dateOfBirth: true } } },
  });
}

// PATCH /api/races/:id -> edit a result. Sending only { showOnPedigree } just
// toggles whether it appears on the pedigree.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireUser();
  if (!user) return res!;
  const { id } = await params;

  const existing = await findResult(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as RaceInput | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const keys = Object.keys(body);
  if (keys.length === 1 && keys[0] === "showOnPedigree") {
    if (typeof body.showOnPedigree !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    await prisma.raceResult.update({ where: { id }, data: { showOnPedigree: body.showOnPedigree } });
    return NextResponse.json({ ok: true });
  }

  const parsed = parseRaceInput(body, existing.bird.dateOfBirth);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });

  await prisma.raceResult.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

// DELETE /api/races/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireUser();
  if (!user) return res!;
  const { id } = await params;

  const existing = await findResult(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.raceResult.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
