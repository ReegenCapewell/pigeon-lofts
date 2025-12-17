import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { isValidRing, normaliseRing } from "@/lib/validation";
import { Prisma } from "@prisma/client";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
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
} catch (e) {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002"
  ) {
    return new NextResponse(
      "That ring number already exists. Please use a unique ring.",
      { status: 409 }
    );
  }

  console.error(e);
  return new NextResponse("Failed to create bird", { status: 500 });
}
}

// DELETE /api/birds?id=... -> delete bird for current user
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return new NextResponse("Missing id", { status: 400 });
  }

  const bird = await prisma.bird.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });

  if (!bird || bird.ownerId !== user.id) {
    // 404 avoids leaking whether the ID exists
    return new NextResponse("Not found", { status: 404 });
  }

  await prisma.bird.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

