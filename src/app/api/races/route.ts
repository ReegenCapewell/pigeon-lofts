import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { requireUser } from "@/lib/apiAuth";
import { parseRaceInput, type RaceInput } from "@/lib/races";

// POST /api/races { birdId, ...result } -> log a race result for one of your birds
export async function POST(req: Request) {
  const { user, res } = await requireUser();
  if (!user) return res!;

  const body = (await req.json().catch(() => null)) as (RaceInput & { birdId?: string }) | null;
  if (!body?.birdId) return NextResponse.json({ error: "Choose a bird." }, { status: 400 });

  const bird = await prisma.bird.findFirst({
    where: { id: body.birdId, ownerId: user.id, deletedAt: null },
    select: { id: true, dateOfBirth: true },
  });
  if (!bird) return NextResponse.json({ error: "Bird not found." }, { status: 404 });

  const parsed = parseRaceInput(body, bird.dateOfBirth);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await prisma.raceResult.create({
    data: { ...parsed.data, ownerId: user.id, birdId: bird.id },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
