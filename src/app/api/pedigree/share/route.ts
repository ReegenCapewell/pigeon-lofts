import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/auth";
import { requireUser } from "@/lib/apiAuth";
import { ensureBirdNode } from "@/lib/pedigree";

// POST /api/pedigree/share { birdId, enabled } -> turn a bird's read-only
// pedigree link on (new random token) or off.
export async function POST(req: Request) {
  const { user, res } = await requireUser();
  if (!user) return res!;

  const body = (await req.json().catch(() => null)) as { birdId?: string; enabled?: boolean } | null;
  if (!body?.birdId || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const bird = await prisma.bird.findFirst({
    where: { id: body.birdId, ownerId: user.id, deletedAt: null },
    select: { id: true },
  });
  if (!bird) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const node = await ensureBirdNode(user.id, bird.id);
  const shareToken = body.enabled ? (node.shareToken ?? randomBytes(18).toString("base64url")) : null;

  await prisma.pedigreeNode.update({ where: { id: node.id }, data: { shareToken } });
  return NextResponse.json({ shareToken });
}
