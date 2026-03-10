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
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [localBirds, query, sortBy]);

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
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Birds in this loft</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {localBirds.length} bird{localBirds.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ring or name…"
          className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500 shadow-sm transition"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "ring")}
          className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-sm transition"
        >
          <option value="newest">Newest first</option>
          <option value="ring">Ring (A→Z)</option>
        </select>
      </div>

      {/* List */}
      {localBirds.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-10 text-center">
          <div className="text-3xl mb-3">🐦</div>
          <p className="text-sm text-slate-500 dark:text-slate-400">No birds assigned to this loft yet.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Assign birds from the{" "}
            <Link href="/birds" className="text-emerald-600 dark:text-emerald-400 hover:underline">Birds page</Link>.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">No birds match your search.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((b) => (
              <li key={b.id} className="group">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">
                    🐦
                  </div>

                  {/* Info */}
                  <Link href={`/birds/${b.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      {b.ring}
                      {b.name ? (
                        <span className="font-normal text-slate-400 dark:text-slate-500"> – {b.name}</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Added {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </Link>

                  {/* Move / Unassign */}
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      if (v === "__unassign__") { void moveBird(b.id, null); }
                      else if (v !== currentLoftId) { void moveBird(b.id, v); }
                      e.currentTarget.value = "";
                    }}
                    className="text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 transition opacity-0 group-hover:opacity-100"
                    title="Move bird"
                  >
                    <option value="">Move…</option>
                    <option value="__unassign__">Unassign</option>
                    {loftOptions
                      .filter((l) => l.id !== currentLoftId)
                      .map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>

                  {/* Inline actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Link
                      href={`/birds/${b.id}/edit`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                      Edit
                    </Link>
                  </div>

                  {/* More menu */}
                  <div className="relative" data-loftbird-menu="true">
                    <button
                      type="button"
                      onClick={() => setMenuOpenId(menuOpenId === b.id ? null : b.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      aria-label="More actions"
                    >
                      ⋯
                    </button>

                    {menuOpenId === b.id && (
                      <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-black/10 dark:shadow-black/40 py-1">
                        <Link
                          href={`/birds/${b.id}`}
                          className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                          onClick={() => setMenuOpenId(null)}
                        >
                          Open
                        </Link>
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

          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {filtered.length} of {localBirds.length} bird{localBirds.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Delete bird?"
        message="This action cannot be undone."
        confirmLabel="Delete bird"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          void deleteBird(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
