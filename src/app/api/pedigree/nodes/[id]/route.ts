import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { requireUser } from "@/lib/apiAuth";
import { cleanText } from "@/lib/pedigree";
import { normaliseRing } from "@/lib/validation";

type Body = {
  ring?: string;
  name?: string;
  colour?: string;
  strain?: string;
  breeder?: string;
  notes?: string;
};

// PATCH /api/pedigree/nodes/:id -> edit a pedigree entry's details.
// Loft birds keep ring/name on the Bird itself, so only the pedigree fields
// (colour, strain, breeder, notes) are editable for them here.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireUser();
  if (!user) return res!;
  const { id } = await params;

  const node = await prisma.pedigreeNode.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, birdId: true },
  });
  if (!node) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const data: Record<string, string | null> = {
    colour: cleanText(body.colour, 40),
    strain: cleanText(body.strain, 80),
    breeder: cleanText(body.breeder, 80),
    notes: cleanText(body.notes, 500),
  };

  if (!node.birdId) {
    const ring = cleanText(body.ring, 30);
    const name = cleanText(body.name, 60);
    if (!ring && !name) {
      return NextResponse.json({ error: "Enter a ring number or a name." }, { status: 400 });
    }
    data.ring = ring ? normaliseRing(ring) : null;
    data.name = name;
  }

  await prisma.pedigreeNode.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
