"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseDob } from "@/lib/dateOfBirth";

export type UnassignedBird = { id: string; ring: string; name: string | null };

type Mode = "new" | "existing";

const inputClass =
  "w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm";
const labelClass = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5";

export default function AddBirdToLoftButton({
  loftId,
  loftName,
  unassignedBirds,
}: {
  loftId: string;
  loftName: string;
  unassignedBirds: UnassignedBird[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("new");
  const [ring, setRing] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [existingId, setExistingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setMode("new");
    setRing("");
    setName("");
    setDob("");
    setExistingId("");
    setError(null);
    setOpen(true);
  }

  function close() {
    if (!saving) setOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let request: Promise<Response>;
    if (mode === "new") {
      if (!ring.trim()) return setError("Please enter a ring number.");
      if (!dob.trim()) return setError("Please enter a date of birth.");
      const dobCheck = parseDob(dob);
      if (dobCheck.error !== null) return setError(dobCheck.error);

      request = fetch("/api/birds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ring: ring.trim(),
          name: name.trim() || null,
          dateOfBirth: dob.trim(),
          loftId,
        }),
      });
    } else {
      if (!existingId) return setError("Please choose a bird.");
      request = fetch("/api/birds/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birdId: existingId, loftId }),
      });
    }

    try {
      setSaving(true);
      const res = await request;
      if (!res.ok) {
        // /api/birds returns plain text errors, /api/birds/move returns { error }.
        const text = (await res.text()).trim();
        let msg = text;
        try {
          msg = (JSON.parse(text) as { error?: string }).error ?? text;
        } catch {}
        setError(msg || "Failed to add bird.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 text-xs font-medium px-3 py-1.5 rounded-full transition ${
      active
        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm"
        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition whitespace-nowrap"
      >
        Add a bird
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={close} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-2xl shadow-black/10 dark:shadow-black/50">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">Add a bird</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Add a bird to <span className="font-medium text-slate-700 dark:text-slate-200">{loftName}</span>.
            </p>

            <div className="flex gap-1 p-1 mb-5 rounded-full bg-slate-100 dark:bg-slate-900">
              <button type="button" className={tabClass(mode === "new")} onClick={() => { setMode("new"); setError(null); }}>
                New bird
              </button>
              <button type="button" className={tabClass(mode === "existing")} onClick={() => { setMode("existing"); setError(null); }}>
                Existing bird ({unassignedBirds.length})
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "new" ? (
                <>
                  <div>
                    <label className={labelClass}>Ring number</label>
                    <input
                      value={ring}
                      onChange={(e) => setRing(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. GB 23 A12345"
                      maxLength={30}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Name (optional)</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Newey"
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date of birth</label>
                    <input
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className={inputClass}
                      placeholder="dd/mm/yyyy"
                      maxLength={10}
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Required — format dd/mm/yyyy.</p>
                  </div>
                </>
              ) : unassignedBirds.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                  You have no unassigned birds. Birds already in another loft can be moved from their own page.
                </p>
              ) : (
                <div>
                  <label className={labelClass}>Unassigned bird</label>
                  <select value={existingId} onChange={(e) => setExistingId(e.target.value)} className={inputClass}>
                    <option value="">Choose a bird…</option>
                    {unassignedBirds.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.ring}
                        {b.name ? ` – ${b.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {error ? (
                <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={saving}
                  className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (mode === "existing" && unassignedBirds.length === 0)}
                  className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add to loft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
