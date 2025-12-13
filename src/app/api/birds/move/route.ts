import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { birdId?: string; loftId?: string | null }
    | null;

  const birdId = body?.birdId;
  const loftId = body?.loftId ?? null;

  if (!birdId) {
    return NextResponse.json({ error: "Missing birdId" }, { status: 400 });
  }

  const bird = await prisma.bird.findUnique({
    where: { id: birdId },
    select: { id: true, ownerId: true },
  });

  if (!bird || bird.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If loftId is provided, ensure that loft belongs to the same user
  if (loftId) {
    const loft = await prisma.loft.findUnique({
      where: { id: loftId },
      select: { id: true, ownerId: true },
    });

    if (!loft || loft.ownerId !== user.id) {
      return NextResponse.json({ error: "Invalid loft" }, { status: 400 });
    }
  }

  const updated = await prisma.bird.update({
    where: { id: birdId },
    data: { loftId },
    select: { id: true, loftId: true },
  });

  return NextResponse.json({ bird: updated });
}
