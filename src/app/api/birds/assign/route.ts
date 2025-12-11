import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  return user;
}

// POST /api/birds/assign -> { birdId, loftId | null }
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { birdId, loftId } = (await req.json()) as {
    birdId?: string;
    loftId?: string | null;
  };

  if (!birdId) {
    return new NextResponse("Missing birdId", { status: 400 });
  }

  const bird = await prisma.bird.findUnique({
    where: { id: birdId },
  });

  if (!bird || bird.ownerId !== user.id) {
    return new NextResponse("Bird not found or not yours", { status: 404 });
  }

  let newLoftId: string | null = null;

  if (loftId) {
    const loft = await prisma.loft.findUnique({
      where: { id: loftId },
    });

    if (!loft || loft.ownerId !== user.id) {
      return new NextResponse("Invalid loft", { status: 403 });
    }
    newLoftId = loft.id;
  }

  const updated = await prisma.bird.update({
    where: { id: birdId },
    data: {
      loftId: newLoftId,
    },
  });

  return NextResponse.json(updated);
}
