import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { isValidRing, normaliseRing } from "@/lib/validation";

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

// GET /api/birds -> list birds for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const birds = await prisma.bird.findMany({
    where: { ownerId: user.id },
    include: {
      loft: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(birds);
}

// POST /api/birds -> create bird for current user (optional loft)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { ring, name, loftId } = (await req.json()) as {
    ring?: string;
    name?: string;
    loftId?: string | null;
  };

  if (!ring) {
    return new NextResponse("Missing ring", { status: 400 });
  }

  const normalisedRing = normaliseRing(ring);

  if (!isValidRing(normalisedRing)) {
    return new NextResponse("Invalid ring format", { status: 400 });
  }

  // If loftId provided, make sure it belongs to this user
  let connectLoftId: string | undefined;
  if (loftId) {
    const loft = await prisma.loft.findUnique({
      where: { id: loftId },
    });
    if (!loft || loft.ownerId !== user.id) {
      return new NextResponse("Invalid loft", { status: 403 });
    }
    connectLoftId = loft.id;
  }

  try {
    const bird = await prisma.bird.create({
      data: {
        ring: normalisedRing,
        name: name ?? null,
        ownerId: user.id,
        loftId: connectLoftId,
      },
    });

    return NextResponse.json(bird, { status: 201 });
  } catch (err) {
    console.error("Error creating bird:", err);
    return new NextResponse("Error creating bird", { status: 500 });
  }
}
