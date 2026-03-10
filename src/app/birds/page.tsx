"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import ListSkeleton from "@/components/ListSkeleton";
import InlineError from "@/components/InlineError";

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
  const [pageError, setPageError] = useState<string | null>(null);

  async function load() {
    setLoading(true);

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

    try {
      const loftsRes = await fetch("/api/lofts", { cache: "no-store" });
      const loftsData = await loftsRes.json();
      const loftsList: Loft[] = Array.isArray(loftsData)
        ? loftsData
        : loftsData.lofts ?? [];
      setLofts(loftsList);
    } catch {
      setLofts([]);
    }

    setLoading(false);
  }

  async function deleteBird(id: string) {
    try {
      setPageError(null);

      const res = await fetch(`/api/birds?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to delete bird");
      }

      setBirds((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setPageError("Failed to delete bird. Please try again.");
    } finally {
      setDeleteId(null);
    }
  }

  async function assignBirdToLoft(birdId: string, loftId: string) {
    setAssignError(null);

    try {
      setAssignSaving(true);

      const res = await fetch("/api/birds/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birdId, loftId }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to assign loft");
      }

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
      setAssignError(
        err instanceof Error ? err.message : "Failed to assign loft"
      );
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

        if (res.status === 409) {
          setError(
            msg || "That ring number already exists. Please use a unique ring."
          );
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
    <main>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Manage
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
            Birds
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setNewRing("");
            setNewName("");
            setNewLoftId("none");
            setShowAdd(true);
          }}
          className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
        >
          + Add bird
        </button>
      </div>

      {pageError ? (
        <div className="pt-4">
          <InlineError message={pageError} />
        </div>
      ) : null}

      {/* Filter bar */}
      <div className="py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ring or name…"
          className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500 transition"
        />
        <div className="flex items-center gap-3">
          <select
            value={loftFilter}
            onChange={(e) => setLoftFilter(e.target.value)}
            className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
          >
            <option value="all">All lofts</option>
            <option value="unassigned">Unassigned</option>
            {lofts.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "ring")}
            className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
          >
            <option value="newest">Newest first</option>
            <option value="ring">Ring (A→Z)</option>
          </select>
          {(query.trim() || loftFilter !== "all" || sortBy !== "newest") && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Counts */}
      <p className="text-xs text-slate-400 dark:text-slate-500 py-3 border-b border-slate-100 dark:border-slate-800">
        {loading ? "Loading…" : (
          <>{filtered.length} of {birds.length} bird{birds.length !== 1 ? "s" : ""}</>
        )}
      </p>

      {/* List */}
      {loading ? (
        <div className="pt-4">
          <ListSkeleton rows={6} />
        </div>
      ) : birds.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">No birds yet. Add one to get started.</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNewRing("");
              setNewName("");
              setNewLoftId("none");
              setShowAdd(true);
            }}
            className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
          >
            + Add bird
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-sm text-slate-400 dark:text-slate-500">No birds match your search.</p>
      ) : (
        <ul>
          {filtered.map((b) => (
            <li key={b.id} className="group border-b border-slate-100 dark:border-slate-800 last:border-0 relative">
              <div className="flex items-center gap-3 py-3.5 -mx-1 px-1">
                <Link
                  href={`/birds/${b.id}`}
                  className="flex-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 -mx-2 px-2 py-1.5 transition"
                >
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    {b.ring}
                    {b.name ? (
                      <span className="text-slate-400 dark:text-slate-500 font-normal">
                        {" "}– {b.name}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {b.loft?.name ? (
                      <span className="text-slate-400 dark:text-slate-500">
                        {b.loft.name}
                      </span>
                    ) : (
                      <span className="text-amber-500 dark:text-amber-400">
                        Unassigned
                      </span>
                    )}
                  </div>
                </Link>

                {!b.loftId && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssignError(null);
                      setAssignLoftId(lofts[0]?.id ?? "none");
                      setAssignId(b.id);
                      setMenuOpenId(null);
                    }}
                    className="text-xs px-3 py-1 rounded-full border border-amber-300/60 dark:border-amber-400/40 text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition"
                  >
                    Assign loft
                  </button>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === b.id ? null : b.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    aria-label="Bird actions"
                  >
                    ⋯
                  </button>

                  {menuOpenId === b.id && (
                    <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-black/10 dark:shadow-slate-950/60 py-1">
                      <Link
                        href={`/birds/${b.id}/edit`}
                        className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
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

      {/* Add Bird Modal */}
      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => { if (!saving) setShowAdd(false); }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-2xl shadow-black/10 dark:shadow-black/50">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">Add bird</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Add a bird and optionally assign it to a loft.</p>

            <form onSubmit={submitNewBird} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Ring number
                </label>
                <input
                  value={newRing}
                  onChange={(e) => setNewRing(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="e.g. GB 23 A12345"
                  maxLength={30}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Name (optional)
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="e.g. Newey"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Loft
                </label>
                <select
                  value={newLoftId}
                  onChange={(e) => setNewLoftId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
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
                <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
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
        message="This action cannot be undone."
        confirmLabel="Delete bird"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteBird(deleteId)}
      />

      {/* Assign Loft Modal */}
      {assignId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={() => { if (!assignSaving) setAssignId(null); }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-2xl shadow-black/10 dark:shadow-black/50">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">Assign loft</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Choose which loft this bird belongs to.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Loft
                </label>
                <select
                  value={assignLoftId}
                  onChange={(e) => setAssignLoftId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
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
                <p className="text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
                  {assignError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignId(null)}
                  disabled={assignSaving}
                  className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={assignSaving || lofts.length === 0 || assignLoftId === "none"}
                  onClick={() => assignBirdToLoft(assignId, assignLoftId)}
                  className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition disabled:opacity-50"
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
