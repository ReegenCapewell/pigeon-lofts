import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

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

// GET /api/lofts -> list lofts for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const lofts = await prisma.loft.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(lofts);
}

// POST /api/lofts -> create loft for current user
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { name } = (await req.json()) as { name?: string };

  if (!name) {
    return new NextResponse("Missing loft name", { status: 400 });
  }

  const loft = await prisma.loft.create({
    data: {
      name,
      ownerId: user.id,
    },
  });

  return NextResponse.json(loft, { status: 201 });
}
