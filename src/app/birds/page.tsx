"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";

type Loft = { id: string; name: string };

type Bird = {
  id: string;
  ring: string;
  name: string | null;
  loftId: string | null;
  createdAt?: string;
  loft?: { id: string; name: string } | null;
};

export default function BirdsPage() {
  const [birds, setBirds] = useState<Bird[]>([]);
  const [lofts, setLofts] = useState<Loft[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [loftFilter, setLoftFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "ring">("newest");

  const [showAdd, setShowAdd] = useState(false);
  const [newRing, setNewRing] = useState("");
  const [newName, setNewName] = useState("");
  const [newLoftId, setNewLoftId] = useState<string>("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [assignLoftId, setAssignLoftId] = useState<string>("none");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);


async function load() {
  setLoading(true);

  // Birds
  try {
    const birdsRes = await fetch("/api/birds", { cache: "no-store" });
    const birdsData = await birdsRes.json();
    const birdsList: Bird[] = Array.isArray(birdsData)
      ? birdsData
      : birdsData.birds ?? [];
    setBirds(birdsList);
  } catch {
    setBirds([]);
  }

  // Lofts
  try {
    const loftsRes = await fetch("/api/lofts", { cache: "no-store" });
    const loftsData = await loftsRes.json();
    const loftsList: Loft[] = Array.isArray(loftsData)
      ? loftsData
      : loftsData.lofts ?? [];
    setLofts(loftsList);
  } catch {
    // don’t wipe birds if lofts fails
    setLofts([]);
  }

  setLoading(false);
}


async function deleteBird(id: string) {
  try {
    const res = await fetch(`/api/birds?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const msg = (await res.text()).trim();
      throw new Error(msg || "Failed to delete bird");
    }

    setBirds((prev) => prev.filter((b) => b.id !== id));
  } catch (e) {
    setAssignError(e instanceof Error ? e.message : "Failed to delete bird");
  } finally {
    setDeleteId(null);
  }
}

async function assignBirdToLoft(birdId: string, loftId: string) {
  setAssignError(null);

  try {
    setAssignSaving(true);

    // ✅ Use your existing route that already exists: /api/birds/assign
    const res = await fetch("/api/birds/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birdId, loftId }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Failed to assign loft");
    }

    // Update UI locally so it feels instant
    const loft = lofts.find((l) => l.id === loftId) || null;

    setBirds((prev) =>
      prev.map((b) =>
        b.id === birdId
          ? {
              ...b,
              loftId,
              loft: loft ? { id: loft.id, name: loft.name } : null,
            }
          : b
      )
    );

    setAssignId(null);
    setAssignLoftId("none");
  } catch (err) {
    setAssignError(err instanceof Error ? err.message : "Failed to assign loft");
  } finally {
    setAssignSaving(false);
  }
}

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await load();
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return birds
      .filter((b) => {
        if (loftFilter === "all") return true;
        if (loftFilter === "unassigned") return !b.loftId;
        return b.loftId === loftFilter;
      })
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
  }, [birds, query, loftFilter, sortBy]);

  const clearFilters = () => {
    setQuery("");
    setLoftFilter("all");
    setSortBy("newest");
  };

  async function submitNewBird(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ring = newRing.trim();
    const name = newName.trim();
    const loftId = newLoftId === "none" ? null : newLoftId;

    if (!ring) {
      setError("Please enter a ring number.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/birds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ring, name: name || null, loftId }),
      });

if (!res.ok) {
  const msg = (await res.text()).trim();

  // Friendly messages based on status
  if (res.status === 409) {
    setError(msg || "That ring number already exists. Please use a unique ring.");
    return;
  }

  if (res.status === 400) {
    setError(msg || "Please check the ring format and try again.");
    return;
  }

  setError(msg || "Failed to create bird");
  return;
}

      setShowAdd(false);
      setNewRing("");
      setNewName("");
      setNewLoftId("none");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bird");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-50">Birds</h1>
          <p className="text-sm text-slate-300">
            Search by ring/name and filter by loft.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNewRing("");
              setNewName("");
              setNewLoftId("none");
              setShowAdd(true);
            }}
            className="text-sm px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium transition"
          >
            + Add bird
          </button>

          <Link
            href="/birds"
            className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
            onClick={(e) => {
              if (
                typeof window !== "undefined" &&
                window.location.pathname === "/birds"
              ) {
                e.preventDefault();
                clearFilters();
              }
            }}
          >
            Clear
          </Link>
        </div>
      </div>

      {/* Controls */}
      <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
        <div className="grid md:grid-cols-6 gap-3">
          <div className="md:col-span-3">
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

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Loft</label>
            <select
              value={loftFilter}
              onChange={(e) => setLoftFilter(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            >
              <option value="all">All lofts</option>
              <option value="unassigned">Unassigned</option>
              {lofts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
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

        <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
          <span>
            Showing{" "}
            <span className="text-slate-100 font-semibold">
              {filtered.length}
            </span>{" "}
            of{" "}
            <span className="text-slate-100 font-semibold">{birds.length}</span>{" "}
            birds
          </span>

          {(query.trim() || loftFilter !== "all" || sortBy !== "newest") && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1 rounded-full border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition"
            >
              Reset
            </button>
          )}
        </div>
      </section>

      {/* List */}
      {/* List */}
<section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
  <h2 className="text-sm font-semibold text-slate-100 mb-3">Bird list</h2>

  {loading ? (
    <p className="text-xs text-slate-400">Loading…</p>
  ) : birds.length === 0 ? (
    <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 text-sm text-slate-300">
      <p className="mb-1">No birds yet.</p>
      <p className="text-xs text-slate-500 mb-3">
        Add your first bird to start tracking rings, lofts, and profiles.
      </p>

      <button
        type="button"
        onClick={() => {
          setError(null);
          setNewRing("");
          setNewName("");
          setNewLoftId("none");
          setShowAdd(true);
        }}
        className="text-sm px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium transition"
      >
        + Add bird
      </button>
    </div>
  ) : filtered.length === 0 ? (
    <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 text-sm text-slate-300">
      <p className="mb-1">No birds match your search/filter.</p>
      <p className="text-xs text-slate-500">
        Try clearing filters or search by ring number.
      </p>
    </div>
  ) : (
    <ul className="space-y-2">
      {filtered.map((b) => (
        <li key={b.id} className="relative">
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

              <div className="text-[11px]">
                {b.loft?.name ? (
                  <span className="text-slate-500">Loft: {b.loft.name}</span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setAssignError(null);
                      setAssignLoftId(lofts[0]?.id ?? "none");
                      setAssignId(b.id);
                      setMenuOpenId(null);
                      setDeleteId(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 transition"
                  >
                    Unassigned
                    <span className="text-[10px] opacity-80">
                      Assign to loft
                    </span>
                  </button>
                )}
              </div>
            </Link>

            {/* Actions */}
            <button
              onClick={() => setMenuOpenId(menuOpenId === b.id ? null : b.id)}
              className="px-2 py-1 text-slate-400 hover:text-slate-100"
            >
              ⋯
            </button>

            {menuOpenId === b.id && (
              <div className="absolute right-2 top-10 z-20 w-40 rounded-xl border border-slate-700 bg-slate-950 shadow">
                {!b.loftId && (
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      setAssignError(null);
                      setAssignLoftId(lofts[0]?.id ?? "none");
                      setAssignId(b.id);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-900"
                  >
                    Assign loft
                  </button>
                )}

                <Link
                  href={`/birds/${b.id}/edit`}
                  className="block px-3 py-2 text-sm hover:bg-slate-900"
                >
                  Edit
                </Link>

                <button
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
        </li>
      ))}
    </ul>
  )}
</section>


      {/* Add Bird Modal */}
      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!saving) setShowAdd(false);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-50">Add bird</h3>
                <p className="text-xs text-slate-400">
                  Add a bird and optionally assign it to a loft.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                disabled={saving}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitNewBird} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Ring number
                </label>
                <input
                  value={newRing}
                  onChange={(e) => setNewRing(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                  placeholder="e.g. GB 23 A12345"
                  maxLength={30}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Name (optional)
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                  placeholder="e.g. Newey"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Loft</label>
                <select
                  value={newLoftId}
                  onChange={(e) => setNewLoftId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                >
                  <option value="none">Unassigned</option>
                  {lofts.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {error ? (
                <p className="text-xs text-red-300 border border-red-900/40 bg-red-950/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  disabled={saving}
                  className="text-sm px-4 py-2 rounded-full border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="text-sm px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium transition disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Create bird"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <ConfirmModal
  open={!!deleteId}
  title="Delete bird?"
  message={
  assignError
    ? `This action cannot be undone.\n\n${assignError}`
    : "This action cannot be undone."
  }
  confirmLabel="Delete bird"
  onCancel={() => setDeleteId(null)}
  onConfirm={() => deleteId && deleteBird(deleteId)}
/>
{/* Assign Loft Modal */}
{assignId ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-black/60"
      onClick={() => {
        if (!assignSaving) setAssignId(null);
      }}
    />
    <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-50">Assign loft</h3>
          <p className="text-xs text-slate-400">
            Choose which loft this bird belongs to.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAssignId(null)}
          disabled={assignSaving}
          className="text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Loft</label>
          <select
            value={assignLoftId}
            onChange={(e) => setAssignLoftId(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
          >
            {lofts.length === 0 ? (
              <option value="none">No lofts found</option>
            ) : (
              lofts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))
            )}
          </select>
        </div>

        {assignError ? (
          <p className="text-xs text-red-300 border border-red-900/40 bg-red-950/40 rounded-xl px-3 py-2">
            {assignError}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAssignId(null)}
            disabled={assignSaving}
            className="text-sm px-4 py-2 rounded-full border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={assignSaving || lofts.length === 0 || assignLoftId === "none"}
            onClick={() => assignBirdToLoft(assignId, assignLoftId)}
            className="text-sm px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium transition disabled:opacity-50"
          >
            {assignSaving ? "Saving…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  </div>
) : null}
    </main>
  );
}
