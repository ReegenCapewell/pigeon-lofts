"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";

export type LoftBird = {
  id: string;
  ring: string;
  name: string | null;
  createdAt: string;
};

export type LoftOption = {
  id: string;
  name: string;
};

export default function LoftBirdsList({
  birds,
  currentLoftId,
  loftOptions,
}: {
  birds: LoftBird[];
  currentLoftId: string;
  loftOptions: LoftOption[];
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "ring">("newest");
  const [localBirds, setLocalBirds] = useState<LoftBird[]>(birds);

  useEffect(() => { setLocalBirds(birds); }, [birds]);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpenId) return;

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-loftbird-menu="true"]')) return;
      setMenuOpenId(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpenId(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpenId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return localBirds
      .filter((b) => {
        if (!q) return true;
        return (b.ring?.toLowerCase() ?? "").includes(q) || (b.name?.toLowerCase() ?? "").includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "ring") return a.ring.localeCompare(b.ring);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [localBirds, query, sortBy]);

  const reset = () => { setQuery(""); setSortBy("newest"); setError(null); };

  async function moveBird(birdId: string, loftId: string | null) {
    setMenuOpenId(null);
    setError(null);
    const original = localBirds.find((b) => b.id === birdId) ?? null;
    setLocalBirds((prev) => prev.filter((b) => b.id !== birdId));
    try {
      const res = await fetch("/api/birds/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birdId, loftId }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to move/unassign bird.");
    } catch (e) {
      if (original) setLocalBirds((prev) => [original, ...prev]);
      setError(e instanceof Error ? e.message : "Failed to move/unassign bird.");
    }
  }

  async function deleteBird(birdId: string) {
    setError(null);
    const original = localBirds.find((b) => b.id === birdId) ?? null;
    setLocalBirds((prev) => prev.filter((b) => b.id !== birdId));
    try {
      const res = await fetch(`/api/birds?id=${encodeURIComponent(birdId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Failed to delete bird.");
    } catch (e) {
      if (original) setLocalBirds((prev) => [original, ...prev]);
      setError(e instanceof Error ? e.message : "Failed to delete bird.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            Birds
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click a bird to open its dashboard, or move/unassign inline.
          </p>
        </div>
        {(query.trim() || sortBy !== "newest" || error) ? (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition whitespace-nowrap"
          >
            Reset
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ring or name…"
          className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500 transition"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "ring")}
          className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
        >
          <option value="newest">Newest first</option>
          <option value="ring">Ring (A→Z)</option>
        </select>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 py-3 border-b border-slate-100 dark:border-slate-800">
        {filtered.length} of {localBirds.length} bird{localBirds.length !== 1 ? "s" : ""}
      </p>

      {localBirds.length === 0 ? (
        <p className="py-8 text-sm text-slate-400 dark:text-slate-500">No birds assigned yet.</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-sm text-slate-400 dark:text-slate-500">No birds match your search.</p>
      ) : (
        <ul>
          {filtered.map((b) => (
            <li key={b.id} className="group border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="flex items-center gap-3 py-3.5 -mx-1 px-1">
                <Link
                  href={`/birds/${b.id}`}
                  className="flex-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 -mx-2 px-2 py-1.5 transition"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    {b.ring}
                    {b.name ? (
                      <span className="text-slate-400 dark:text-slate-500 font-normal"> – {b.name}</span>
                    ) : null}
                  </span>
                </Link>

                <select
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    if (v === "__unassign__") void moveBird(b.id, null);
                    else if (v !== currentLoftId) void moveBird(b.id, v);
                    e.currentTarget.value = "";
                  }}
                  className="text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-slate-700 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
                  title="Move bird"
                >
                  <option value="">Move…</option>
                  <option value="__unassign__">Unassign</option>
                  {loftOptions
                    .filter((l) => l.id !== currentLoftId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>

                <div className="relative" data-loftbird-menu="true">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === b.id ? null : b.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    aria-label="More actions"
                  >
                    ⋯
                  </button>

                  {menuOpenId === b.id && (
                    <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-black/10 dark:shadow-slate-950/50 py-1">
                      <Link
                        href={`/birds/${b.id}/edit`}
                        className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        onClick={() => setMenuOpenId(null)}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setMenuOpenId(null); setDeleteId(b.id); }}
                        className="block w-full text-left px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Delete bird?"
        message="This action cannot be undone."
        confirmLabel="Delete bird"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => { if (!deleteId) return; void deleteBird(deleteId); setDeleteId(null); }}
      />
    </div>
  );
}
