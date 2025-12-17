import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });

  return user;
}

// POST /api/birds/assign -> { birdId, loftId | null }
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { birdId?: string; loftId?: string | null }
    | null;

  const birdId = body?.birdId;
  const loftId = body?.loftId ?? null;

  if (!birdId) return new NextResponse("Missing birdId", { status: 400 });

  // Bird must belong to user AND not be deleted
  const bird = await prisma.bird.findFirst({
    where: { id: birdId, ownerId: user.id, deletedAt: null },
    select: { id: true },
  });

  if (!bird) return new NextResponse("Not found", { status: 404 });

  // If loftId provided, loft must belong to user AND not be deleted
  let newLoftId: string | null = null;

  if (loftId) {
    const loft = await prisma.loft.findFirst({
      where: { id: loftId, ownerId: user.id, deletedAt: null },
      select: { id: true },
    });

    if (!loft) return new NextResponse("Invalid loft", { status: 403 });
    newLoftId = loft.id;
  }

  const updated = await prisma.bird.update({
    where: { id: birdId },
    data: { loftId: newLoftId },
    select: { id: true, loftId: true },
  });

  return NextResponse.json({ bird: updated });
}
