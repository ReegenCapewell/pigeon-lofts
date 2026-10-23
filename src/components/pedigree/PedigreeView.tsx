"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import SexIcon from "@/components/SexIcon";
import PedigreeGrid, { buildSlots, pathToPos, repeatCounts, type Slot } from "./PedigreeGrid";
import { DetailsForm, Modal, ParentForm, sendJson } from "./PedigreeForms";
import { SEX_LABELS } from "@/lib/sex";
import { PEDIGREE_GENERATIONS, birdLabel, findProblems, type LoftBirdOption, type ParentRole, type PedNode, type PedTree } from "@/lib/pedigreeShared";

type AddTarget = { childNode: PedNode; role: ParentRole; replacing: boolean };

// Phones show 2 generations at a time (use → to go further back); larger
// screens show the full 4.
const PHONE_QUERY = "(max-width: 640px)";
function useIsPhone() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(PHONE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false
  );
}

const pillButton =
  "text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition";

export default function PedigreeView({
  tree,
  editable,
  loftBirds = [],
  subjectBirdId,
  initialShareToken = null,
  sheetOwner,
}: {
  tree: PedTree;
  editable: boolean;
  loftBirds?: LoftBirdOption[];
  subjectBirdId?: string;
  initialShareToken?: string | null;
  sheetOwner?: string | null;
}) {
  const router = useRouter();
  const subjectId = tree.rootId;
  const subject = tree.nodes[subjectId];

  // Breadcrumb from the subject bird to whichever ancestor the tree is centred on.
  const [rawPath, setRawPath] = useState<string[]>([subjectId]);
  const path = useMemo(() => {
    // After an edit an ancestor in the trail may be gone; keep the valid prefix.
    const valid = [subjectId];
    for (const id of rawPath.slice(1)) {
      const prev = tree.nodes[valid[valid.length - 1]];
      if (!prev || (prev.sireId !== id && prev.damId !== id)) break;
      valid.push(id);
    }
    return valid;
  }, [rawPath, tree, subjectId]);
  const rootId = path[path.length - 1];

  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [editNode, setEditNode] = useState<PedNode | null>(null);
  const [removeSlot, setRemoveSlot] = useState<Slot | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const isPhone = useIsPhone();
  const generations = isPhone ? 2 : PEDIGREE_GENERATIONS;
  const slots = useMemo(() => buildSlots(tree, rootId, generations), [tree, rootId, generations]);
  const selected = selectedPos ? slots.find((s) => s.pos === selectedPos && s.node) ?? null : null;
  const counts = useMemo(() => repeatCounts(tree, rootId), [tree, rootId]);
  const problems = useMemo(() => (editable ? findProblems(tree) : []), [tree, editable]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hasRepeats = [...counts.values()].some((n) => n > 1);

  const subjectHasPedigree = !!(subject?.sireId || subject?.damId);

  function refresh() {
    setAddTarget(null);
    setEditNode(null);
    router.refresh();
  }

  function explore(slot: Slot) {
    setSelectedPos(null);
    setRawPath([...path, ...pathToPos(tree, rootId, slot.pos)]);
  }

  function openAdd(slot: Slot, replacing: boolean) {
    const childNode = slot.childId ? tree.nodes[slot.childId] : null;
    if (!childNode || !slot.role) return;
    setSelectedPos(null);
    setAddTarget({ childNode, role: slot.role, replacing });
  }

  async function confirmRemove() {
    const slot = removeSlot;
    setRemoveSlot(null);
    if (!slot?.childId || !slot.role) return;
    setActionError(null);
    const err = await sendJson(`/api/pedigree/nodes/${slot.childId}/parents?role=${slot.role}`, "DELETE");
    if (err) return setActionError(err);
    setSelectedPos(null);
    router.refresh();
  }

  if (!subject) return null;

  return (
    <>
      {/* Interactive tree (hidden when printing) */}
      <div className="print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
          <nav aria-label="Pedigree trail" className="flex flex-wrap items-center gap-1.5 text-xs">
            {path.map((id, i) => {
              const n = tree.nodes[id];
              const last = i === path.length - 1;
              return (
                <span key={id} className="flex items-center gap-1.5">
                  {i > 0 ? <span className="text-slate-300 dark:text-slate-600">›</span> : null}
                  {last ? (
                    <span className="font-medium text-slate-800 dark:text-slate-100">{n ? birdLabel(n) : "?"}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setSelectedPos(null); setRawPath(path.slice(0, i + 1)); }}
                      className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                      {n ? birdLabel(n) : "?"}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
          <div className="flex flex-wrap gap-2">
            {path.length > 1 ? (
              <button type="button" onClick={() => { setSelectedPos(null); setRawPath([subjectId]); }} className={pillButton}>
                Back to {subject.ring || "bird"}
              </button>
            ) : null}
            <button type="button" onClick={() => window.print()} className={pillButton}>
              Print / Save PDF
            </button>
            {editable && subjectBirdId ? (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
              >
                Share
              </button>
            ) : null}
          </div>
        </div>

        {editable && !subjectHasPedigree ? (
          <div className="mb-5 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            This bird doesn&apos;t have a pedigree yet. Start by adding its sire and dam below.
          </div>
        ) : null}

        {problems.length ? (
          <div className="mb-5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
            <p className="font-medium mb-1">Some entries in this pedigree look wrong. Please check them:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {actionError ? (
          <p className="mb-4 text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
            {actionError}
          </p>
        ) : null}

        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <PedigreeGrid
            tree={tree}
            rootId={rootId}
            generations={generations}
            editable={editable}
            selectedPos={selectedPos}
            highlightId={hoverId ?? selected?.node?.id ?? null}
            onHover={setHoverId}
            onSelect={(s) => setSelectedPos(s.pos)}
            onAdd={(s) => openAdd(s, false)}
            onExplore={explore}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><SexIcon sex="MALE" /> Sire line / male</span>
          <span className="inline-flex items-center gap-1.5"><SexIcon sex="FEMALE" /> Dam line / female</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Loft</span>
            In your lofts
          </span>
          {hasRepeats ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded-full bg-violet-100 dark:bg-violet-900/50 px-1.5 py-px text-[10px] font-semibold text-violet-800 dark:text-violet-200">×2</span>
              Appears more than once (line breeding){isPhone ? "" : ": hover to highlight"}
            </span>
          ) : null}
          {isPhone ? (
            <span>Tap a bird for details{editable ? ", editing" : ""} and its own pedigree</span>
          ) : (
            <>
              <span>→ shows that bird&apos;s own ancestors</span>
              <span>Click a bird for details{editable ? " and editing" : ""}</span>
            </>
          )}
        </div>
      </div>

      {/* Printable A4 sheet (only visible when printing) */}
      <PrintSheet tree={tree} sheetOwner={sheetOwner} />

      {selected?.node ? (
        <NodeDetails
          slot={selected}
          editable={editable}
          isRoot={selected.pos === 1}
          repeats={counts.get(selected.node.id) ?? 1}
          onClose={() => setSelectedPos(null)}
          onEdit={() => { setEditNode(selected.node); setSelectedPos(null); }}
          onReplace={() => openAdd(selected, true)}
          onRemove={() => { setRemoveSlot(selected); setSelectedPos(null); }}
          onExplore={() => explore(selected)}
        />
      ) : null}

      {addTarget ? (
        <ParentForm
          childNode={addTarget.childNode}
          role={addTarget.role}
          replacing={addTarget.replacing}
          loftBirds={loftBirds}
          onClose={() => setAddTarget(null)}
          onSaved={refresh}
        />
      ) : null}

      {editNode ? <DetailsForm node={editNode} onClose={() => setEditNode(null)} onSaved={refresh} /> : null}

      <ConfirmModal
        open={!!removeSlot}
        title={`Remove ${removeSlot?.role ?? "bird"}?`}
        message={
          removeSlot?.node?.birdId
            ? "The bird stays in your loft with its own pedigree; it's just no longer listed here."
            : "This removes the bird from this pedigree, along with any ancestors entered for it."
        }
        confirmLabel="Remove"
        onCancel={() => setRemoveSlot(null)}
        onConfirm={() => void confirmRemove()}
      />

      {shareOpen && subjectBirdId ? (
        <ShareDialog birdId={subjectBirdId} initialToken={initialShareToken} onClose={() => setShareOpen(false)} />
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-line">{value}</dd>
    </div>
  );
}

function NodeDetails({
  slot,
  editable,
  isRoot,
  repeats,
  onClose,
  onEdit,
  onReplace,
  onRemove,
  onExplore,
}: {
  slot: Slot;
  editable: boolean;
  isRoot: boolean;
  repeats: number;
  onClose: () => void;
  onEdit: () => void;
  onReplace: () => void;
  onRemove: () => void;
  onExplore: () => void;
}) {
  const n = slot.node!;
  const relation = slot.role === "sire" ? "Sire" : slot.role === "dam" ? "Dam" : null;
  const hasParents = !!(n.sireId || n.damId);

  return (
    <Modal title={birdLabel(n)} subtitle={relation ? `${relation}${n.birdId ? " · in your lofts" : ""}` : n.birdId ? "In your lofts" : undefined} onClose={onClose}>
      {repeats > 1 ? (
        <p className="mb-4 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 px-3 py-2 text-xs text-violet-800 dark:text-violet-200">
          This bird appears {repeats} times in this pedigree. That&apos;s normal with line breeding; if it&apos;s a mistake, use &ldquo;Change&rdquo; on the wrong copy.
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-4 mb-5">
        <Detail label="Ring" value={n.ring} />
        <Detail label="Name" value={n.name} />
        <Detail label="Sex" value={n.sex ? SEX_LABELS[n.sex] : null} />
        <Detail label="Born" value={n.dateOfBirth} />
        <Detail label="Colour" value={n.colour} />
        <Detail label="Strain" value={n.strain} />
        <Detail label="Breeder" value={n.breeder} />
        <div className="col-span-2">
          <Detail label="Performance / notes" value={n.notes} />
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {!isRoot && hasParents ? (
          <button type="button" onClick={onExplore} className={pillButton}>Show its pedigree →</button>
        ) : null}
        {editable && n.birdId ? (
          <Link href={`/birds/${n.birdId}`} className={pillButton}>Open bird page</Link>
        ) : null}
        {editable ? (
          <button type="button" onClick={onEdit} className={pillButton}>Edit details</button>
        ) : null}
        {editable && !isRoot && slot.childId ? (
          <>
            <button type="button" onClick={onReplace} className={pillButton}>Change {slot.role}</button>
            <button
              type="button"
              onClick={onRemove}
              className="text-sm px-4 py-2 rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            >
              Remove
            </button>
          </>
        ) : null}
      </div>
    </Modal>
  );
}

function ShareDialog({
  birdId,
  initialToken,
  onClose,
}: {
  birdId: string;
  initialToken: string | null;
  onClose: () => void;
}) {
  const [token, setToken] = useState(initialToken);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/p/${token}` : null;

  async function setEnabled(enabled: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pedigree/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birdId, enabled }),
      });
      const data = (await res.json().catch(() => null)) as { shareToken?: string | null; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Could not update the share link.");
      setToken(data?.shareToken ?? null);
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the share link.");
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it instead.");
    }
  }

  return (
    <Modal
      title="Share pedigree"
      subtitle="Anyone with the link can view (not edit) this pedigree without logging in. You can turn the link off at any time."
      onClose={() => !saving && onClose()}
    >
      {url ? (
        <div className="space-y-3">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition">
              {copied ? "Copied!" : "Copy link"}
            </button>
            {typeof navigator !== "undefined" && "share" in navigator ? (
              <button
                type="button"
                onClick={() => void navigator.share({ title: "Pigeon pedigree", url }).catch(() => {})}
                className={pillButton}
              >
                Send…
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => void setEnabled(false)}
              className="text-sm px-4 py-2 rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition disabled:opacity-50"
            >
              Turn off link
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={saving}
          onClick={() => void setEnabled(true)}
          className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create share link"}
        </button>
      )}
      {error ? <p className="mt-3 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
      <div className="flex justify-end pt-5">
        <button type="button" onClick={onClose} className={pillButton}>Done</button>
      </div>
    </Modal>
  );
}

function PrintSheet({ tree, sheetOwner }: { tree: PedTree; sheetOwner?: string | null }) {
  const s = tree.nodes[tree.rootId];
  if (!s) return null;
  const facts = [s.sex ? SEX_LABELS[s.sex] : null, s.colour, s.dateOfBirth ? `Born ${s.dateOfBirth}` : null, s.strain]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="hidden print:flex flex-col h-[190mm] text-black bg-white">
      <div className="flex items-end justify-between border-b-2 border-black pb-[2mm] mb-[3mm]">
        <div>
          <p className="text-[8pt] uppercase tracking-[0.2em]">Pedigree</p>
          <p className="text-[16pt] font-bold leading-tight">
            {s.ring || "Unknown ring"}
            {s.name ? <span className="font-normal italic"> – {s.name}</span> : null}
          </p>
          {facts ? <p className="text-[9pt]">{facts}</p> : null}
        </div>
        <div className="text-right text-[8pt]">
          {sheetOwner ? <p className="font-semibold text-[10pt]">{sheetOwner}</p> : null}
          {s.breeder ? <p>Bred by {s.breeder}</p> : null}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <PedigreeGrid tree={tree} rootId={tree.rootId} mode="print" />
      </div>
      <p className="mt-[2mm] text-[6.5pt] text-slate-600" suppressHydrationWarning>
        Upper branches: sire&apos;s line · Lower branches: dam&apos;s line · Printed {new Date().toLocaleDateString("en-GB")}
      </p>
    </div>
  );
}
