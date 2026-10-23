import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/auth";
import { requireUser } from "@/lib/apiAuth";
import { checkParentLink, cleanText, deleteOrphanedManualNode, ensureBirdNode, wouldCreateCycle } from "@/lib/pedigree";
import { normaliseRing } from "@/lib/validation";
import type { ParentRole } from "@/lib/pedigreeShared";

type Body = {
  role?: ParentRole;
  // Either one of the user's own birds...
  birdId?: string;
  // ...or an ancestor entered by hand.
  manual?: {
    ring?: string;
    name?: string;
    colour?: string;
    strain?: string;
    breeder?: string;
    notes?: string;
  };
};

function isRole(v: unknown): v is ParentRole {
  return v === "sire" || v === "dam";
}

async function findChild(ownerId: string, id: string) {
  return prisma.pedigreeNode.findFirst({
    where: { id, ownerId },
    select: { id: true, sireId: true, damId: true },
  });
}

// POST /api/pedigree/nodes/:id/parents -> set (or replace) this entry's sire or dam
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireUser();
  if (!user) return res!;
  const { id } = await params;

  const child = await findChild(user.id, id);
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || !isRole(body.role)) {
    return NextResponse.json({ error: "Choose sire or dam." }, { status: 400 });
  }
  const role = body.role;
  const expectedSex = role === "sire" ? "MALE" : "FEMALE";

  let parentId: string;

  if (body.birdId) {
    const bird = await prisma.bird.findFirst({
      where: { id: body.birdId, ownerId: user.id, deletedAt: null },
      select: { id: true, ring: true, sex: true, dateOfBirth: true },
    });
    if (!bird) return NextResponse.json({ error: "Bird not found." }, { status: 404 });
    if (bird.sex && bird.sex !== expectedSex) {
      return NextResponse.json(
        { error: role === "sire" ? "A sire must be a male bird." : "A dam must be a female bird." },
        { status: 400 }
      );
    }

    const parent = await ensureBirdNode(user.id, bird.id);
    if (await wouldCreateCycle(user.id, child.id, parent.id)) {
      return NextResponse.json(
        { error: "That bird can't be added here: it would become its own ancestor." },
        { status: 400 }
      );
    }
    const problem = await checkParentLink(child.id, parent.id, bird, role);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    // An unsexed bird chosen as a sire is male (and a dam female): record it so
    // it can't later be picked for the opposite role.
    if (!bird.sex) {
      await prisma.bird.update({ where: { id: bird.id }, data: { sex: expectedSex } });
    }
    parentId = parent.id;
  } else if (body.manual) {
    const m = body.manual;
    const ring = cleanText(m.ring, 30);
    const name = cleanText(m.name, 60);
    if (!ring && !name) {
      return NextResponse.json({ error: "Enter a ring number or a name." }, { status: 400 });
    }
    const created = await prisma.pedigreeNode.create({
      data: {
        ownerId: user.id,
        ring: ring ? normaliseRing(ring) : null,
        name,
        sex: expectedSex,
        colour: cleanText(m.colour, 40),
        strain: cleanText(m.strain, 80),
        breeder: cleanText(m.breeder, 80),
        notes: cleanText(m.notes, 500),
      },
      select: { id: true },
    });
    parentId = created.id;
  } else {
    return NextResponse.json({ error: "Choose a bird or enter its details." }, { status: 400 });
  }

  const previousId = role === "sire" ? child.sireId : child.damId;
  await prisma.pedigreeNode.update({
    where: { id: child.id },
    data: role === "sire" ? { sireId: parentId } : { damId: parentId },
  });
  if (previousId && previousId !== parentId) await deleteOrphanedManualNode(previousId);

  return NextResponse.json({ ok: true, parentId });
}

// DELETE /api/pedigree/nodes/:id/parents?role=sire|dam -> remove that parent
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, res } = await requireUser();
  if (!user) return res!;
  const { id } = await params;

  const role = req.nextUrl.searchParams.get("role");
  if (!isRole(role)) return NextResponse.json({ error: "Choose sire or dam." }, { status: 400 });

  const child = await findChild(user.id, id);
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const previousId = role === "sire" ? child.sireId : child.damId;
  await prisma.pedigreeNode.update({
    where: { id: child.id },
    data: role === "sire" ? { sireId: null } : { damId: null },
  });
  await deleteOrphanedManualNode(previousId);

  return NextResponse.json({ ok: true });
}
