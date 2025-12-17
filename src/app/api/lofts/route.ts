import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/auth";

// helper
async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });

  return user?.id ?? null;
}

// GET /api/lofts  -> list lofts for logged-in user (excluding deleted)
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lofts = await prisma.loft.findMany({
    where: { ownerId: userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json({ lofts });
}

// POST /api/lofts  -> create loft
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name = (body?.name ?? "").trim();

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const loft = await prisma.loft.create({
    data: { name, ownerId: userId },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json({ loft }, { status: 201 });
}

// DELETE /api/lofts?id=...  -> soft delete loft (birds inside become unassigned)
export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing loft id" }, { status: 400 });

  const loft = await prisma.loft.findFirst({
    where: { id, ownerId: userId, deletedAt: null },
    select: { id: true },
  });

  if (!loft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Unassign birds first (do NOT delete them)
  await prisma.bird.updateMany({
    where: { ownerId: userId, loftId: id, deletedAt: null },
    data: { loftId: null },
  });

  // Soft delete the loft
  await prisma.loft.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
