"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";

export type LoftBird = {
  id: string;
  ring: string;
  name: string | null;
  createdAt: string; // ISO string
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

  // local view so the list updates instantly without a page refresh
  const [localBirds, setLocalBirds] = useState<LoftBird[]>(birds);

  // per-row action menu + delete modal
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Close ⋯ menu on outside click + Escape
  useEffect(() => {
    if (!menuOpenId) return;

    function onPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as HTMLElement | null;
      // If click is inside any menu wrapper, ignore
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
        const ring = b.ring?.toLowerCase() ?? "";
        const name = b.name?.toLowerCase() ?? "";
        return ring.includes(q) || name.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "ring") return a.ring.localeCompare(b.ring);

        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [localBirds, query, sortBy]);

  const reset = () => {
    setQuery("");
    setSortBy("newest");
  };

  async function moveBird(birdId: string, loftId: string | null) {
    // close any open menus for a clean UX
    setMenuOpenId(null);

    // Optimistic UI: if moving away or unassigning, remove from this list immediately
    setLocalBirds((prev) => prev.filter((b) => b.id !== birdId));

    const res = await fetch("/api/birds/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birdId, loftId }),
    });

    if (!res.ok) {
      // rollback if it failed
      setLocalBirds((prev) => {
        const original = birds.find((b) => b.id === birdId);
        return original ? [original, ...prev] : prev;
      });
      alert("Failed to move/unassign bird.");
    }
  }

  async function deleteBird(birdId: string) {
    const res = await fetch(`/api/birds?id=${encodeURIComponent(birdId)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to delete bird.");
      return;
    }

    setLocalBirds((prev) => prev.filter((b) => b.id !== birdId));
  }

  return (
    <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Birds in this loft
          </h2>
          <p className="text-xs text-slate-400">
            Search by ring/name, click a bird to open its dashboard, or
            move/unassign it inline.
          </p>
        </div>

        {(query.trim() || sortBy !== "newest") ? (
          <button
            type="button"
            onClick={reset}
            className="text-xs px-3 py-1 rounded-full border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition"
          >
            Reset
          </button>
        ) : null}
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-6 gap-3">
        <div className="md:col-span-5">
          <label className="block text-xs text-slate-400 mb-1">
            Search (ring or name)
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. GB 23… or Newey"
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs text-slate-400 mb-1">Sort</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "ring")}
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="newest">Newest</option>
            <option value="ring">Ring (A→Z)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Showing{" "}
          <span className="text-slate-100 font-semibold">{filtered.length}</span>{" "}
          of{" "}
          <span className="text-slate-100 font-semibold">
            {localBirds.length}
          </span>{" "}
          birds
        </span>
      </div>

      {/* List */}
      {localBirds.length === 0 ? (
        <p className="text-xs text-slate-400">No birds assigned yet.</p>
      ) : filtered.length === 0 ? (
        <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 text-sm text-slate-300">
          <p className="mb-1">No birds match your search.</p>
          <p className="text-xs text-slate-500">Try clearing the search box.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((b) => (
            <li key={b.id}>
              <div className="flex items-center justify-between gap-3 border border-slate-700 bg-slate-950 rounded-xl px-3 py-2">
                <Link
                  href={`/birds/${b.id}`}
                  className="flex-1 hover:text-sky-300 transition"
                >
                  <div className="text-sm text-slate-100">
                    {b.ring}
                    {b.name ? (
                      <span className="text-slate-400"> – {b.name}</span>
                    ) : null}
                  </div>
                </Link>

                {/* Move / Unassign (primary action on this screen) */}
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;

                    if (v === "__unassign__") {
                      void moveBird(b.id, null);
                    } else if (v !== currentLoftId) {
                      void moveBird(b.id, v);
                    }

                    e.currentTarget.value = "";
                  }}
                  className="text-xs rounded-xl bg-slate-900 border border-slate-700 px-2 py-2 text-slate-100 outline-none focus:border-sky-500"
                  title="Move bird"
                >
                  <option value="">Move…</option>
                  <option value="__unassign__">Unassign</option>
                  {loftOptions
                    .filter((l) => l.id !== currentLoftId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>

                {/* Secondary actions live in a ⋯ menu to reduce clutter */}
                <div className="relative" data-loftbird-menu="true">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuOpenId(menuOpenId === b.id ? null : b.id)
                    }
                    className="px-2 py-1 text-slate-400 hover:text-slate-100"
                    aria-label="More actions"
                  >
                    ⋯
                  </button>

                  {menuOpenId === b.id && (
                    <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-slate-700 bg-slate-950 shadow">
                      <Link
                        href={`/birds/${b.id}/edit`}
                        className="block px-3 py-2 text-sm hover:bg-slate-900"
                        onClick={() => setMenuOpenId(null)}
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpenId(null);
                          setDeleteId(b.id);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-950/40"
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
        onConfirm={() => {
          if (!deleteId) return;
          void deleteBird(deleteId);
          setDeleteId(null);
        }}
      />
    </section>
  );
}
