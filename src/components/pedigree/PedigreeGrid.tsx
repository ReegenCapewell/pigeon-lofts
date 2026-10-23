"use client";

import SexIcon from "@/components/SexIcon";
import { PEDIGREE_GENERATIONS, type ParentRole, type PedNode, type PedTree } from "@/lib/pedigreeShared";

// A slot is one box position in the bracket, numbered like an ahnentafel:
// 1 is the root bird, 2p is p's sire and 2p+1 is p's dam.
export type Slot = {
  pos: number;
  gen: number;
  node: PedNode | null;
  childId: string | null; // the bird this slot is a parent of
  role: ParentRole | null;
};

export function buildSlots(tree: PedTree, rootId: string, generations = PEDIGREE_GENERATIONS): Slot[] {
  const slots: Slot[] = [];
  const root = tree.nodes[rootId] ?? null;
  slots[1] = { pos: 1, gen: 0, node: root, childId: null, role: null };
  const lastPos = 2 ** (generations + 1) - 1;
  for (let p = 1; p <= lastPos; p++) {
    const s = slots[p];
    if (!s?.node || s.gen >= generations) continue;
    const n = s.node;
    slots[2 * p] = { pos: 2 * p, gen: s.gen + 1, node: n.sireId ? tree.nodes[n.sireId] ?? null : null, childId: n.id, role: "sire" };
    slots[2 * p + 1] = { pos: 2 * p + 1, gen: s.gen + 1, node: n.damId ? tree.nodes[n.damId] ?? null : null, childId: n.id, role: "dam" };
  }
  return slots.filter(Boolean);
}

// How many times each bird appears on the full sheet from `rootId`. A bird
// appearing more than once usually means line breeding (related parents).
export function repeatCounts(tree: PedTree, rootId: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of buildSlots(tree, rootId, PEDIGREE_GENERATIONS)) {
    if (s.node) counts.set(s.node.id, (counts.get(s.node.id) ?? 0) + 1);
  }
  return counts;
}

// Node ids walked from the root down to the slot at `pos` (excluding the root).
export function pathToPos(tree: PedTree, rootId: string, pos: number): string[] {
  const bits = pos.toString(2).slice(1); // after the leading 1: 0 = sire, 1 = dam
  const ids: string[] = [];
  let cur = tree.nodes[rootId];
  for (const b of bits) {
    const nextId = b === "0" ? cur?.sireId : cur?.damId;
    if (!nextId || !tree.nodes[nextId]) break;
    ids.push(nextId);
    cur = tree.nodes[nextId];
  }
  return ids;
}

type Mode = "screen" | "print";

export default function PedigreeGrid({
  tree,
  rootId,
  mode = "screen",
  generations = PEDIGREE_GENERATIONS,
  editable = false,
  selectedPos,
  highlightId = null,
  onHover,
  onSelect,
  onAdd,
  onExplore,
}: {
  tree: PedTree;
  rootId: string;
  mode?: Mode;
  generations?: number;
  editable?: boolean;
  selectedPos?: number | null;
  highlightId?: string | null; // a repeated bird whose copies should all be highlighted
  onHover?: (nodeId: string | null) => void;
  onSelect?: (slot: Slot) => void;
  onAdd?: (slot: Slot) => void;
  onExplore?: (slot: Slot) => void;
}) {
  const slots = buildSlots(tree, rootId, generations);
  const counts = repeatCounts(tree, rootId);
  const print = mode === "print";
  // Narrow (phone) view: fewer columns, so keep boxes minimal.
  const compact = !print && generations < PEDIGREE_GENERATIONS;
  const gap = print ? "3mm" : compact ? "0.375rem" : "0.75rem";
  const leafRows = 2 ** generations; // e.g. 16 rows in the outermost column for 4 generations

  return (
    <div
      className={print ? "grid w-full h-full" : generations >= 4 ? "grid min-w-[960px]" : "grid w-full"}
      style={{
        gridTemplateColumns: `repeat(${generations + 1}, minmax(0, 1fr))`,
        gridTemplateRows: print
          ? `repeat(${leafRows}, minmax(0, 1fr))`
          : `repeat(${leafRows}, minmax(3.5rem, auto))`,
      }}
    >
      {slots.map((slot) => {
        const span = leafRows / 2 ** slot.gen;
        const k = slot.pos - 2 ** slot.gen;
        const hasChildrenColumn = slot.gen < generations && !!slot.node;
        const lineColor = print ? "bg-slate-500" : "bg-slate-300 dark:bg-slate-700";

        return (
          <div
            key={slot.pos}
            className="relative flex items-center"
            style={{
              gridColumn: slot.gen + 1,
              gridRow: `${k * span + 1} / span ${span}`,
              paddingLeft: slot.gen > 0 ? gap : 0,
              paddingRight: hasChildrenColumn ? gap : 0,
            }}
          >
            {/* Bracket lines joining this box to its child on the left */}
            {slot.gen > 0 ? (
              <>
                <span
                  aria-hidden
                  className={`absolute left-0 w-px ${lineColor} ${slot.role === "sire" ? "top-1/2 bottom-0" : "top-0 bottom-1/2"}`}
                />
                <span aria-hidden className={`absolute left-0 top-1/2 h-px ${lineColor}`} style={{ width: gap }} />
              </>
            ) : null}
            {hasChildrenColumn ? (
              <span aria-hidden className={`absolute right-0 top-1/2 h-px ${lineColor}`} style={{ width: gap }} />
            ) : null}

            <div className="w-full py-1">
              {slot.node ? (
                <BirdBox
                  slot={slot}
                  node={slot.node}
                  print={print}
                  compact={compact}
                  repeats={counts.get(slot.node.id) ?? 1}
                  highlighted={highlightId === slot.node.id && (counts.get(slot.node.id) ?? 1) > 1}
                  onHover={onHover}
                  selected={selectedPos === slot.pos}
                  onSelect={onSelect}
                  onExplore={onExplore}
                  canExplore={!print && !compact && slot.gen > 0 && !!(slot.node.sireId || slot.node.damId)}
                />
              ) : editable && !print ? (
                <button
                  type="button"
                  onClick={() => onAdd?.(slot)}
                  className={`w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 ${compact ? "px-2 py-1.5" : "px-3 py-2"} text-left text-xs text-slate-500 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition`}
                >
                  + Add {slot.role}
                </button>
              ) : (
                <div
                  className={
                    print
                      ? "border border-slate-300 px-[2mm] py-[1mm] text-[7pt] text-slate-400"
                      : "rounded-xl border border-dashed border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-400 dark:text-slate-500"
                  }
                >
                  {slot.role === "sire" ? "Sire unknown" : "Dam unknown"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BirdBox({
  slot,
  node,
  print,
  compact,
  repeats,
  highlighted,
  onHover,
  selected,
  onSelect,
  onExplore,
  canExplore,
}: {
  slot: Slot;
  node: PedNode;
  print: boolean;
  compact: boolean;
  repeats: number;
  highlighted: boolean;
  onHover?: (nodeId: string | null) => void;
  selected: boolean;
  onSelect?: (slot: Slot) => void;
  onExplore?: (slot: Slot) => void;
  canExplore: boolean;
}) {
  const g = slot.gen;
  // Show less detail the further back the generation, as on printed sheets.
  // Compact (phone) boxes keep to ring, name and colour; tap for the rest.
  const showStrain = !compact && g <= 2;
  const showBreeder = !compact && g <= 1;
  const showNotes = !compact && g <= 1;
  const showDob = !compact && g === 0;

  const accent =
    node.sex === "MALE"
      ? "border-l-blue-500 dark:border-l-blue-400"
      : node.sex === "FEMALE"
        ? "border-l-pink-500 dark:border-l-pink-400"
        : "border-l-slate-300 dark:border-l-slate-600";

  if (print) {
    const size = g <= 1 ? "text-[8.5pt]" : g === 2 ? "text-[7.5pt]" : "text-[6.5pt]";
    return (
      <div className={`border border-slate-400 border-l-[3px] ${accent} px-[2mm] py-[1mm] leading-tight ${size} text-black bg-white`}>
        <p className="font-bold">
          {node.ring || "—"}
          {repeats > 1 ? <span> (×{repeats})</span> : null}
          {node.colour ? <span className="font-normal"> · {node.colour}</span> : null}
        </p>
        {node.name ? <p className="italic">{node.name}</p> : null}
        {showDob && node.dateOfBirth ? <p>Born {node.dateOfBirth}</p> : null}
        {showStrain && node.strain ? <p>{node.strain}</p> : null}
        {showBreeder && node.breeder ? <p>Bred by {node.breeder}</p> : null}
        {showNotes && node.notes ? <p className="whitespace-pre-line">{node.notes}</p> : null}
      </div>
    );
  }

  return (
    <div
      onMouseEnter={repeats > 1 ? () => onHover?.(node.id) : undefined}
      onMouseLeave={repeats > 1 ? () => onHover?.(null) : undefined}
      className={`group relative w-full rounded-xl border border-l-4 ${accent} transition ${
        selected
          ? "border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30"
          : highlighted
            ? "border-violet-400 dark:border-violet-400 ring-2 ring-violet-400/40 bg-violet-50 dark:bg-violet-950/40"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-emerald-400 dark:hover:border-emerald-500"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect?.(slot)}
        className={`w-full text-left rounded-xl ${compact ? "px-2 py-1.5" : canExplore ? "px-3 py-2 pr-8" : "px-3 py-2"}`}
      >
        <span className={`flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-50 ${compact ? "text-[11px]" : "text-xs"}`}>
          {compact ? null : <SexIcon sex={node.sex} />}
          <span className="break-all">{node.ring || "Unknown ring"}</span>
          {repeats > 1 ? (
            <span
              title={`Appears ${repeats} times in this pedigree`}
              className="shrink-0 rounded-full bg-violet-100 dark:bg-violet-900/50 px-1.5 py-px text-[10px] font-semibold text-violet-800 dark:text-violet-200"
            >
              ×{repeats}
            </span>
          ) : null}
        </span>
        {node.name || node.birdId ? (
          <span className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            {node.name ? <span className="truncate">{node.name}</span> : null}
            {node.birdId ? (
              <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Loft
              </span>
            ) : null}
          </span>
        ) : null}
        {node.colour || (showStrain && node.strain) ? (
          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
            {[node.colour, showStrain ? node.strain : null].filter(Boolean).join(" · ")}
          </span>
        ) : null}
        {showDob && node.dateOfBirth ? (
          <span className="block text-[11px] text-slate-500 dark:text-slate-400">Born {node.dateOfBirth}</span>
        ) : null}
        {showBreeder && node.breeder ? (
          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">Bred by {node.breeder}</span>
        ) : null}
        {showNotes && node.notes ? (
          <span className="block text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 whitespace-pre-line">{node.notes}</span>
        ) : null}
      </button>
      {canExplore ? (
        <button
          type="button"
          onClick={() => onExplore?.(slot)}
          title="Show this bird's pedigree"
          aria-label={`Show pedigree of ${node.ring || node.name || "this bird"}`}
          className="absolute right-1.5 top-1.5 w-6 h-6 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          →
        </button>
      ) : null}
    </div>
  );
}
