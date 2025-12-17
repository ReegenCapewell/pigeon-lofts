import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { isValidRing, normaliseRing } from "@/lib/validation";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, email: true },
  });

  return user;
}

// GET /api/birds -> list birds for current user (excluding deleted)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const birds = await prisma.bird.findMany({
    where: { ownerId: user.id, deletedAt: null },
    include: { loft: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ birds });
}

// POST /api/birds -> create bird for current user (optional loft)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { ring, name, loftId } = (await req.json()) as {
    ring?: string;
    name?: string;
    loftId?: string | null;
  };

  if (!ring) return new NextResponse("Missing ring", { status: 400 });

  const normalisedRing = normaliseRing(ring);

  if (!isValidRing(normalisedRing)) {
    return new NextResponse("Invalid ring format", { status: 400 });
  }

  // If loftId provided, make sure it belongs to this user AND isn't deleted
  let connectLoftId: string | undefined;
  if (loftId) {
    const loft = await prisma.loft.findFirst({
      where: { id: loftId, ownerId: user.id, deletedAt: null },
      select: { id: true },
    });

    if (!loft) return new NextResponse("Invalid loft", { status: 403 });
    connectLoftId = loft.id;
  }

  try {
    const bird = await prisma.bird.create({
      data: {
        ring: normalisedRing,
        name: name?.trim() ? name.trim() : null,
        ownerId: user.id,
        loftId: connectLoftId,
      },
    });

    return NextResponse.json({ bird }, { status: 201 });
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

// DELETE /api/birds?id=... -> soft delete bird for current user
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new NextResponse("Missing id", { status: 400 });

  // Only allow deleting your own, non-deleted bird
  const bird = await prisma.bird.findFirst({
    where: { id, ownerId: user.id, deletedAt: null },
    select: { id: true },
  });

  if (!bird) {
    // 404 avoids leaking whether the ID exists
    return new NextResponse("Not found", { status: 404 });
  }

  await prisma.bird.update({
    where: { id },
    data: { deletedAt: new Date(), loftId: null },
  });

  return NextResponse.json({ ok: true });
}
