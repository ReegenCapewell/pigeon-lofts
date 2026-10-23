"use client";

import { useMemo, useState } from "react";
import SharedModal from "@/components/Modal";
import { PIGEON_COLOURS, birdLabel, dobValue, type LoftBirdOption, type ParentRole, type PedNode } from "@/lib/pedigreeShared";

const inputClass =
  "w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm";
const labelClass = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5";

export type DetailsValues = {
  ring: string;
  name: string;
  colour: string;
  strain: string;
  breeder: string;
  notes: string;
};

const emptyDetails: DetailsValues = { ring: "", name: "", colour: "", strain: "", breeder: "", notes: "" };

async function sendJson(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return data?.error || "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

// Kept for existing imports; `wide` maps to the larger dialog size.
export function Modal({ wide = false, ...props }: Omit<React.ComponentProps<typeof SharedModal>, "size"> & { wide?: boolean }) {
  return <SharedModal {...props} size={wide ? "lg" : "md"} />;
}

function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">
      {error}
    </p>
  );
}

function Buttons({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex gap-2 justify-end pt-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition disabled:opacity-50"
      >
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

// Ring/name (manual birds only) plus the pedigree detail fields.
function DetailFields({
  values,
  onChange,
  includeIdentity,
}: {
  values: DetailsValues;
  onChange: (v: DetailsValues) => void;
  includeIdentity: boolean;
}) {
  const set = (k: keyof DetailsValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...values, [k]: e.target.value });

  return (
    <>
      {includeIdentity ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ring number</label>
            <input value={values.ring} onChange={set("ring")} className={inputClass} placeholder="e.g. GB19N12345" maxLength={30} autoFocus />
          </div>
          <div>
            <label className={labelClass}>Name (optional)</label>
            <input value={values.name} onChange={set("name")} className={inputClass} placeholder="e.g. Golden Boy" maxLength={60} />
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Colour</label>
          <input value={values.colour} onChange={set("colour")} className={inputClass} placeholder="e.g. Blue Chequer" maxLength={40} list="pigeon-colours" />
          <datalist id="pigeon-colours">
            {PIGEON_COLOURS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>Strain / bloodline</label>
          <input value={values.strain} onChange={set("strain")} className={inputClass} placeholder="e.g. Janssen" maxLength={80} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Breeder</label>
        <input value={values.breeder} onChange={set("breeder")} className={inputClass} placeholder="e.g. J. Smith, Barnsley" maxLength={80} />
      </div>
      <div>
        <label className={labelClass}>Performance / notes</label>
        <textarea
          value={values.notes}
          onChange={set("notes")}
          className={`${inputClass} min-h-[5rem]`}
          placeholder={"e.g. 1st Club Bourges 2023\nSire of 3 x 1st prize winners"}
          maxLength={500}
        />
      </div>
    </>
  );
}

// Asks whether the parent is one of the user's birds, then either picks it from
// a dropdown or takes the details by hand.
export function ParentForm({
  childNode,
  role,
  loftBirds,
  replacing,
  onClose,
  onSaved,
}: {
  childNode: PedNode;
  role: ParentRole;
  loftBirds: LoftBirdOption[];
  replacing: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [source, setSource] = useState<"loft" | "manual" | null>(null);
  const [birdId, setBirdId] = useState("");
  const [details, setDetails] = useState<DetailsValues>(emptyDetails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wanted = role === "sire" ? "MALE" : "FEMALE";
  const childDob = dobValue(childNode.dateOfBirth);
  const roleLabel = role === "sire" ? "sire (father)" : "dam (mother)";

  // Only birds of the right sex (or not yet sexed), excluding the child itself.
  const groups = useMemo(() => {
    const options = loftBirds.filter(
      (b) => b.id !== childNode.birdId && (b.sex === null || b.sex === wanted)
    );
    const byLoft = new Map<string, LoftBirdOption[]>();
    for (const b of options) {
      const key = b.loftName ?? "Unassigned";
      byLoft.set(key, [...(byLoft.get(key) ?? []), b]);
    }
    return [...byLoft.entries()].sort(([a], [b]) =>
      a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)
    );
  }, [loftBirds, childNode.birdId, wanted]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (source === "loft" && !birdId) return setError("Choose a bird from your lofts.");
    if (source === "manual" && !details.ring.trim() && !details.name.trim()) {
      return setError("Enter a ring number or a name.");
    }
    setSaving(true);
    const err = await sendJson(
      `/api/pedigree/nodes/${childNode.id}/parents`,
      "POST",
      source === "loft" ? { role, birdId } : { role, manual: details }
    );
    setSaving(false);
    if (err) return setError(err);
    onSaved();
  }

  const title = `${replacing ? "Change" : "Add"} ${role}`;
  const subtitle = (
    <>
      The {roleLabel} of <span className="font-medium text-slate-700 dark:text-slate-200">{birdLabel(childNode)}</span>.
    </>
  );

  if (source === null) {
    return (
      <Modal title={title} subtitle={subtitle} onClose={onClose}>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-3">Is this bird in your loft?</p>
        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setSource("loft")}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 hover:border-emerald-500 transition"
          >
            <span className="block text-sm font-medium text-slate-900 dark:text-slate-50">Yes, choose from my birds</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Its own pedigree is included automatically.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSource("manual")}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 hover:border-emerald-500 transition"
          >
            <span className="block text-sm font-medium text-slate-900 dark:text-slate-50">No, enter its details</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              For birds bred elsewhere or no longer in your loft.
            </span>
          </button>
        </div>
        <div className="flex justify-end pt-5">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            Cancel
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} subtitle={subtitle} onClose={() => !saving && onClose()} wide={source === "manual"}>
      <form onSubmit={submit} className="space-y-4">
        <button
          type="button"
          onClick={() => { setSource(null); setError(null); }}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
        >
          ← {source === "loft" ? "Not in my loft?" : "In my loft?"} Go back
        </button>

        {source === "loft" ? (
          groups.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You have no {role === "sire" ? "male" : "female"} (or unsexed) birds to choose from. Go back and enter the details instead.
            </p>
          ) : (
            <div>
              <label className={labelClass}>Bird</label>
              <select value={birdId} onChange={(e) => setBirdId(e.target.value)} className={inputClass} autoFocus>
                <option value="">Choose a bird…</option>
                {groups.map(([loft, birds]) => (
                  <optgroup key={loft} label={loft}>
                    {birds.map((b) => {
                      // A parent must be born before the bird it's being added to.
                      const tooYoung = childDob !== null && dobValue(b.dateOfBirth) !== null && dobValue(b.dateOfBirth)! >= childDob;
                      return (
                        <option key={b.id} value={b.id} disabled={tooYoung}>
                          {birdLabel(b)}
                          {tooYoung ? ` (too young, born ${b.dateOfBirth})` : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                Showing {role === "sire" ? "males" : "females"} and birds with no sex set. Choosing a bird with no sex
                set records it as {role === "sire" ? "male" : "female"}.
              </p>
            </div>
          )
        ) : (
          <DetailFields values={details} onChange={setDetails} includeIdentity />
        )}

        <ErrorText error={error} />
        <Buttons onCancel={onClose} saving={saving} label={replacing ? "Save" : `Add ${role}`} />
      </form>
    </Modal>
  );
}

export function DetailsForm({
  node,
  onClose,
  onSaved,
}: {
  node: PedNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<DetailsValues>({
    ring: node.ring ?? "",
    name: node.name ?? "",
    colour: node.colour ?? "",
    strain: node.strain ?? "",
    breeder: node.breeder ?? "",
    notes: node.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoftBird = !!node.birdId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isLoftBird && !values.ring.trim() && !values.name.trim()) {
      return setError("Enter a ring number or a name.");
    }
    setSaving(true);
    const err = await sendJson(`/api/pedigree/nodes/${node.id}`, "PATCH", values);
    setSaving(false);
    if (err) return setError(err);
    onSaved();
  }

  return (
    <Modal
      title="Edit pedigree details"
      subtitle={
        isLoftBird ? (
          <>Ring number, name, sex and date of birth come from the bird&apos;s own page.</>
        ) : (
          birdLabel(node)
        )
      }
      onClose={() => !saving && onClose()}
      wide
    >
      <form onSubmit={submit} className="space-y-4">
        <DetailFields values={values} onChange={setValues} includeIdentity={!isLoftBird} />
        <ErrorText error={error} />
        <Buttons onCancel={onClose} saving={saving} label="Save" />
      </form>
    </Modal>
  );
}

export { sendJson };
