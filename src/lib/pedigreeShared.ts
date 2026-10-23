// Pedigree types and constants shared by server and client code.
import type { BirdSex } from "@/lib/sex";

// Generations shown on a pedigree sheet, not counting the bird itself:
// parents, grandparents, great-grandparents, great-great-grandparents (31 birds).
export const PEDIGREE_GENERATIONS = 4;

export type ParentRole = "sire" | "dam";

export type PedNode = {
  id: string;
  birdId: string | null; // set when this is one of the owner's own birds
  ring: string | null;
  name: string | null;
  sex: BirdSex | null;
  dateOfBirth: string | null; // dd/mm/yyyy, loft birds only
  colour: string | null;
  strain: string | null;
  breeder: string | null;
  notes: string | null;
  sireId: string | null;
  damId: string | null;
};

export type PedTree = {
  rootId: string;
  nodes: Record<string, PedNode>;
};

export type LoftBirdOption = {
  id: string;
  ring: string;
  name: string | null;
  sex: BirdSex | null;
  loftName: string | null;
  dateOfBirth: string | null; // dd/mm/yyyy
};

// dd/mm/yyyy -> sortable number (yyyymmdd), or null if missing/invalid
export function dobValue(dob: string | null | undefined): number | null {
  const m = dob?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? Number(m[3] + m[2] + m[1]) : null;
}

// Common racing pigeon colours, offered as suggestions (free text is allowed).
export const PIGEON_COLOURS = [
  "Blue",
  "Blue Bar",
  "Blue Chequer",
  "Dark Chequer",
  "Velvet",
  "Black",
  "Red",
  "Red Chequer",
  "Mealy",
  "Silver",
  "Grizzle",
  "Blue Pied",
  "Chequer Pied",
  "Dark Pied",
  "Red Pied",
  "Mosaic",
  "Dun",
  "White",
];

export function birdLabel(n: { ring: string | null; name: string | null }): string {
  const ring = n.ring || "Unknown ring";
  return n.name ? `${ring} – ${n.name}` : ring;
}

// Entries that can't be right biologically: a hen as a sire (or cock as a
// dam), one bird as both a sire and a dam, or a parent born on or after its
// offspring. New links are blocked by the server; this catches anything
// entered before those checks existed.
export function findProblems(tree: PedTree): string[] {
  const problems = new Set<string>();
  const roles = new Map<string, Set<ParentRole>>();
  for (const child of Object.values(tree.nodes)) {
    for (const role of ["sire", "dam"] as const) {
      const parentId = role === "sire" ? child.sireId : child.damId;
      const parent = parentId ? tree.nodes[parentId] : null;
      if (!parent) continue;
      const p = birdLabel(parent);
      const c = birdLabel(child);
      roles.set(parent.id, (roles.get(parent.id) ?? new Set<ParentRole>()).add(role));
      if (role === "sire" && parent.sex === "FEMALE") problems.add(`${p} is a hen but is listed as the sire of ${c}.`);
      if (role === "dam" && parent.sex === "MALE") problems.add(`${p} is a cock but is listed as the dam of ${c}.`);
      const pd = dobValue(parent.dateOfBirth);
      const cd = dobValue(child.dateOfBirth);
      if (pd !== null && cd !== null && pd >= cd) {
        problems.add(`${p} (born ${parent.dateOfBirth}) is listed as a parent of ${c} (born ${child.dateOfBirth}), but a parent must be older.`);
      }
    }
  }
  for (const [id, r] of roles) {
    if (r.size > 1) problems.add(`${birdLabel(tree.nodes[id])} is listed as both a sire and a dam.`);
  }
  return [...problems];
}
