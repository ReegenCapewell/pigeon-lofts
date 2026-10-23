import { prisma } from "@/lib/auth";
import { formatDob } from "@/lib/dateOfBirth";
import type { PedNode, PedTree } from "@/lib/pedigreeShared";

const nodeSelect = {
  id: true,
  birdId: true,
  ring: true,
  name: true,
  sex: true,
  colour: true,
  strain: true,
  breeder: true,
  notes: true,
  sireId: true,
  damId: true,
  bird: { select: { ring: true, name: true, sex: true, dateOfBirth: true } },
} as const;

type NodeRow = {
  id: string;
  birdId: string | null;
  ring: string | null;
  name: string | null;
  sex: "MALE" | "FEMALE" | null;
  colour: string | null;
  strain: string | null;
  breeder: string | null;
  notes: string | null;
  sireId: string | null;
  damId: string | null;
  bird: { ring: string; name: string | null; sex: "MALE" | "FEMALE" | null; dateOfBirth: Date | null } | null;
};

function toPedNode(row: NodeRow): PedNode {
  // Loft birds take ring/name/sex/DOB from the Bird so they never go stale.
  const b = row.bird;
  return {
    id: row.id,
    birdId: row.birdId,
    ring: b ? b.ring : row.ring,
    name: b ? b.name : row.name,
    sex: b ? b.sex : row.sex,
    dateOfBirth: b?.dateOfBirth ? formatDob(b.dateOfBirth) : null,
    colour: row.colour,
    strain: row.strain,
    breeder: row.breeder,
    notes: row.notes,
    sireId: row.sireId,
    damId: row.damId,
  };
}

// Returns the pedigree node for one of the owner's birds, creating an empty
// one the first time.
export async function ensureBirdNode(ownerId: string, birdId: string) {
  return prisma.pedigreeNode.upsert({
    where: { birdId },
    update: {},
    create: { ownerId, birdId },
    select: { id: true, ownerId: true, shareToken: true },
  });
}

async function loadOwnerNodes(ownerId: string): Promise<Map<string, NodeRow>> {
  const rows = await prisma.pedigreeNode.findMany({ where: { ownerId }, select: nodeSelect });
  return new Map(rows.map((r) => [r.id, r]));
}

// Every node reachable from rootId through sire/dam links, so the client can
// navigate the tree to any depth without another round trip.
export async function loadTree(ownerId: string, rootId: string): Promise<PedTree> {
  const all = await loadOwnerNodes(ownerId);
  const nodes: Record<string, PedNode> = {};
  const queue = [rootId];
  while (queue.length) {
    const id = queue.pop()!;
    if (nodes[id]) continue;
    const row = all.get(id);
    if (!row) continue;
    nodes[id] = toPedNode(row);
    if (row.sireId) queue.push(row.sireId);
    if (row.damId) queue.push(row.damId);
  }
  return { rootId, nodes };
}

// True if making `parentId` a parent of `childId` would make a bird its own
// ancestor.
export async function wouldCreateCycle(ownerId: string, childId: string, parentId: string) {
  if (childId === parentId) return true;
  const all = await loadOwnerNodes(ownerId);
  const seen = new Set<string>();
  const queue = [parentId];
  while (queue.length) {
    const id = queue.pop()!;
    if (id === childId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const row = all.get(id);
    if (row?.sireId) queue.push(row.sireId);
    if (row?.damId) queue.push(row.damId);
  }
  return false;
}

// Deletes a hand-entered ancestor once nothing points at it any more, then
// does the same for its own manual parents. Loft-bird nodes are never deleted.
export async function deleteOrphanedManualNode(nodeId: string | null): Promise<void> {
  if (!nodeId) return;
  const node = await prisma.pedigreeNode.findUnique({
    where: { id: nodeId },
    select: {
      id: true,
      birdId: true,
      sireId: true,
      damId: true,
      _count: { select: { sireOf: true, damOf: true } },
    },
  });
  if (!node || node.birdId) return;
  if (node._count.sireOf + node._count.damOf > 0) return;

  await prisma.pedigreeNode.delete({ where: { id: node.id } });
  await deleteOrphanedManualNode(node.sireId);
  await deleteOrphanedManualNode(node.damId);
}

type BirdFacts = { ring: string; sex: "MALE" | "FEMALE" | null; dateOfBirth: Date | null };

// Checks that `parent` (one of the owner's birds) can be the `role` of the
// child node, beyond the loop check: a parent must be born before its
// offspring, and an unsexed bird can't be a sire in one place and a dam in
// another. Returns an error message, or null if the link is fine.
export async function checkParentLink(
  childId: string,
  parentNodeId: string,
  parent: BirdFacts,
  role: "sire" | "dam"
): Promise<string | null> {
  const child = await prisma.pedigreeNode.findUnique({
    where: { id: childId },
    select: { bird: { select: { ring: true, dateOfBirth: true } } },
  });
  const childBird = child?.bird;
  if (childBird?.dateOfBirth && parent.dateOfBirth && parent.dateOfBirth >= childBird.dateOfBirth) {
    return `${parent.ring} (born ${formatDob(parent.dateOfBirth)}) can't be a parent of ${childBird.ring} (born ${formatDob(childBird.dateOfBirth)}): a parent must be older than its offspring.`;
  }

  if (!parent.sex) {
    const oppositeUses = await prisma.pedigreeNode.count({
      where: role === "sire" ? { damId: parentNodeId } : { sireId: parentNodeId },
    });
    if (oppositeUses > 0) {
      return `${parent.ring} is already a ${role === "sire" ? "dam" : "sire"} in a pedigree, so it can't also be a ${role}.`;
    }
  }
  return null;
}

// Checks a change to a bird's sex or date of birth against the pedigrees it
// appears in. Returns an error message, or null if the change is fine.
export async function checkBirdChange(
  birdId: string,
  next: { sex: "MALE" | "FEMALE" | null; dateOfBirth: Date | null }
): Promise<string | null> {
  const birdSel = { select: { ring: true, dateOfBirth: true } } as const;
  const node = await prisma.pedigreeNode.findUnique({
    where: { birdId },
    select: {
      sire: { select: { bird: birdSel } },
      dam: { select: { bird: birdSel } },
      sireOf: { select: { bird: birdSel } },
      damOf: { select: { bird: birdSel } },
    },
  });
  if (!node) return null;

  if (node.sireOf.length && next.sex !== "MALE") {
    return "This bird is a sire in a pedigree, so its sex must be Male. Change the pedigree first if this is wrong.";
  }
  if (node.damOf.length && next.sex !== "FEMALE") {
    return "This bird is a dam in a pedigree, so its sex must be Female. Change the pedigree first if this is wrong.";
  }

  const dob = next.dateOfBirth;
  if (dob) {
    for (const p of [node.sire?.bird, node.dam?.bird]) {
      if (p?.dateOfBirth && p.dateOfBirth >= dob) {
        return `Its parent ${p.ring} was born ${formatDob(p.dateOfBirth)}, so this bird must be born after that.`;
      }
    }
    for (const c of [...node.sireOf, ...node.damOf]) {
      if (c.bird?.dateOfBirth && c.bird.dateOfBirth <= dob) {
        return `It's a parent of ${c.bird.ring} (born ${formatDob(c.bird.dateOfBirth)}), so it must be born before that.`;
      }
    }
  }
  return null;
}

// Trims and caps free-text pedigree fields; empty strings become null.
export function cleanText(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, max);
  return v ? v : null;
}

export function hasPedigree(node: { sireId: string | null; damId: string | null } | null | undefined) {
  return !!(node && (node.sireId || node.damId));
}
