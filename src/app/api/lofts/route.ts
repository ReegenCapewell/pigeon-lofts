import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";

// GET /api/lofts  -> list lofts for logged-in user
export async function GET() {
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

  const lofts = await prisma.loft.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ lofts });
}

// POST /api/lofts  -> create loft
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

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name = (body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const loft = await prisma.loft.create({
    data: {
      name,
      ownerId: user.id,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ loft }, { status: 201 });
}

// DELETE /api/lofts?id=...  -> delete loft (birds inside become unassigned)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing loft id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loft = await prisma.loft.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });

  if (!loft || loft.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ✅ Unassign birds first (do NOT delete them)
  await prisma.bird.updateMany({
    where: { ownerId: user.id, loftId: id },
    data: { loftId: null },
  });

  // ✅ Now delete the loft
  await prisma.loft.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
