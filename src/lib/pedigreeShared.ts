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
};

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
