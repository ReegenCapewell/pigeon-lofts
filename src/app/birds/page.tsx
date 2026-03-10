"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
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
      const birdsList: Bird[] = Array.isArray(birdsData) ? birdsData : birdsData.birds ?? [];
      setBirds(birdsList);
    } catch { setBirds([]); }

    try {
      const loftsRes = await fetch("/api/lofts", { cache: "no-store" });
      const loftsData = await loftsRes.json();
      const loftsList: Loft[] = Array.isArray(loftsData) ? loftsData : loftsData.lofts ?? [];
      setLofts(loftsList);
    } catch { setLofts([]); }

    setLoading(false);
  }

  async function deleteBird(id: string) {
    try {
      setPageError(null);
      const res = await fetch(`/api/birds?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Failed to delete bird");
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
      if (!res.ok) throw new Error((await res.text()) || "Failed to assign loft");

      const loft = lofts.find((l) => l.id === loftId) || null;
      setBirds((prev) =>
        prev.map((b) =>
          b.id === birdId ? { ...b, loftId, loft: loft ? { id: loft.id, name: loft.name } : null } : b
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
    (async () => { if (!alive) return; await load(); })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!menuOpenId) return;
    function onPointerDown(e: MouseEvent | PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest('[data-row-menu="true"]')) return;
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
    return birds
      .filter((b) => {
        if (loftFilter === "all") return true;
        if (loftFilter === "unassigned") return !b.loftId;
        return b.loftId === loftFilter;
      })
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
  }, [birds, query, loftFilter, sortBy]);

  const clearFilters = () => { setQuery(""); setLoftFilter("all"); setSortBy("newest"); };

  async function submitNewBird(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ring = newRing.trim();
    const name = newName.trim();
    const loftId = newLoftId === "none" ? null : newLoftId;

    if (!ring) { setError("Please enter a ring number."); return; }

    try {
      setSaving(true);
      const res = await fetch("/api/birds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ring, name: name || null, loftId }),
      });

      if (!res.ok) {
        const msg = (await res.text()).trim();
        if (res.status === 409) { setError(msg || "That ring number already exists."); return; }
        if (res.status === 400) { setError(msg || "Please check the ring format."); return; }
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
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Birds</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Search, filter, and manage your birds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setError(null); setNewRing(""); setNewName(""); setNewLoftId("none"); setShowAdd(true); }}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition"
        >
          <span className="text-base leading-none">+</span> Add bird
        </button>
      </div>

      {pageError ? <InlineError message={pageError} /> : null}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ring or name…"
          className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500 shadow-sm transition"
        />
        <div className="flex items-center gap-3">
          <select
            value={loftFilter}
            onChange={(e) => setLoftFilter(e.target.value)}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-sm transition"
          >
            <option value="all">All lofts</option>
            <option value="unassigned">Unassigned</option>
            {lofts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "ring")}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-sm transition"
          >
            <option value="newest">Newest first</option>
            <option value="ring">Ring (A→Z)</option>
          </select>
          {(query.trim() || loftFilter !== "all" || sortBy !== "newest") && (
            <button type="button" onClick={clearFilters}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition whitespace-nowrap">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {!loading && birds.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
          <div className="text-4xl mb-4">🐦</div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">No birds yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Add your first bird to start tracking rings, lofts, and profiles.</p>
          <button
            type="button"
            onClick={() => { setError(null); setNewRing(""); setNewName(""); setNewLoftId("none"); setShowAdd(true); }}
            className="text-sm px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition"
          >
            + Add bird
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No birds match your search or filter.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((b) => (
                <li key={b.id} className="group relative">
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
                      <p className="text-[11px] mt-0.5">
                        {b.loft?.name ? (
                          <span className="text-slate-400 dark:text-slate-500">{b.loft.name}</span>
                        ) : (
                          <span className="text-amber-500 dark:text-amber-400">Unassigned</span>
                        )}
                      </p>
                    </Link>

                    {/* Assign loft if needed */}
                    {!b.loftId && (
                      <button
                        type="button"
                        onClick={() => { setAssignError(null); setAssignLoftId(lofts[0]?.id ?? "none"); setAssignId(b.id); setMenuOpenId(null); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition opacity-0 group-hover:opacity-100"
                      >
                        Assign loft
                      </button>
                    )}

                    {/* Inline actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <Link
                        href={`/birds/${b.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/birds/${b.id}/edit`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        Edit
                      </Link>
                    </div>

                    {/* More menu */}
                    <div className="relative" data-row-menu="true">
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(menuOpenId === b.id ? null : b.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        aria-label="More options"
                      >
                        ⋯
                      </button>

                      {menuOpenId === b.id && (
                        <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-black/10 dark:shadow-black/40 py-1">
                          {!b.loftId && (
                            <button
                              type="button"
                              onClick={() => { setMenuOpenId(null); setAssignError(null); setAssignLoftId(lofts[0]?.id ?? "none"); setAssignId(b.id); }}
                              className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                              Assign loft
                            </button>
                          )}
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

          {!loading && (
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {filtered.length} of {birds.length} bird{birds.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Bird Modal */}
      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) setShowAdd(false); }} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">Add bird</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Add a bird and optionally assign it to a loft.</p>

            <form onSubmit={submitNewBird} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Ring number</label>
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
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Name (optional)</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="e.g. Newey"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Loft</label>
                <select
                  value={newLoftId}
                  onChange={(e) => setNewLoftId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
                >
                  <option value="none">Unassigned</option>
                  {lofts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {error ? (
                <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">{error}</p>
              ) : null}

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowAdd(false)} disabled={saving}
                  className="text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="text-sm px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition disabled:opacity-50">
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
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => { if (!assignSaving) setAssignId(null); }} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">Assign loft</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Choose which loft this bird belongs to.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Loft</label>
                <select
                  value={assignLoftId}
                  onChange={(e) => setAssignLoftId(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
                >
                  {lofts.length === 0 ? (
                    <option value="none">No lofts found</option>
                  ) : (
                    lofts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)
                  )}
                </select>
              </div>

              {assignError ? (
                <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">{assignError}</p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setAssignId(null)} disabled={assignSaving}
                  className="text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition disabled:opacity-50">
                  Cancel
                </button>
                <button type="button"
                  disabled={assignSaving || lofts.length === 0 || assignLoftId === "none"}
                  onClick={() => assignBirdToLoft(assignId, assignLoftId)}
                  className="text-sm px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition disabled:opacity-50">
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
