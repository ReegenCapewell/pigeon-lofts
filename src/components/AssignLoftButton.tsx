"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Loft = { id: string; name: string };

export default function AssignLoftButton({
  birdId,
  lofts,
  currentLoftId,
}: {
  birdId: string;
  lofts: Loft[];
  currentLoftId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loftId, setLoftId] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLoft = useMemo(() => lofts[0]?.id ?? "none", [lofts]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoftId(currentLoftId ?? defaultLoft);
  }, [open, currentLoftId, defaultLoft]);

  async function assign() {
    setError(null);

    const isValid = loftId === "none" || lofts.some((l) => l.id === loftId);

    if (!isValid) {
      setError("Please choose a valid loft (or Unassigned).");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/birds/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birdId,
          loftId: loftId === "none" ? null : loftId,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to assign loft");
      }

      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign loft");
    } finally {
      setSaving(false);
    }
  }

  const label = currentLoftId ? "Change loft" : "Assign loft";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => {
              if (!saving) setOpen(false);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-5 shadow-xl shadow-black/10 dark:shadow-black/50">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {label}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose which loft this bird belongs to.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Loft
                </label>
                <select
                  value={loftId}
                  onChange={(e) => setLoftId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
                >
                  <option value="none">Unassigned</option>
                  {lofts.length === 0 ? (
                    <option value="none" disabled>
                      No lofts found
                    </option>
                  ) : (
                    lofts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {error ? (
                <p className="text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={assign}
                  className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
