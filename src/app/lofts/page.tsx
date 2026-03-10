"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DeleteLoftButton from "@/components/DeleteLoftButton";

type Loft = {
  id: string;
  name: string;
  createdAt?: string;
};

export default function LoftsPage() {
  const [lofts, setLofts] = useState<Loft[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "az">("newest");

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/lofts", { cache: "no-store" });
      const data = await res.json();
      const list: Loft[] = Array.isArray(data) ? data : data.lofts ?? [];
      setLofts(list);
    } catch {
      setLofts([]);
    } finally {
      setLoading(false);
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
    return lofts
      .filter((l) => (!q ? true : (l.name ?? "").toLowerCase().includes(q)))
      .sort((a, b) => {
        if (sortBy === "az") return a.name.localeCompare(b.name);
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [lofts, query, sortBy]);

  const clear = () => { setQuery(""); setSortBy("newest"); };

  async function submitNewLoft(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim();
    if (!name) { setError("Please enter a loft name."); return; }

    try {
      setSaving(true);
      const res = await fetch("/api/lofts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) { setError((await res.text()).trim() || "Failed to create loft"); return; }
      setShowAdd(false);
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create loft");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Lofts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your lofts and the birds in them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setError(null); setNewName(""); setShowAdd(true); }}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition"
        >
          <span className="text-base leading-none">+</span> New loft
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lofts…"
          className="flex-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500 shadow-sm transition"
        />
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "az")}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-sm transition"
          >
            <option value="newest">Newest first</option>
            <option value="az">A → Z</option>
          </select>
          {(query.trim() || sortBy !== "newest") && (
            <button
              type="button"
              onClick={clear}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {!loading && lofts.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-2xl mx-auto mb-4">
            🏠
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">No lofts yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Create a loft to start organising your birds.</p>
          <button
            type="button"
            onClick={() => { setError(null); setNewName(""); setShowAdd(true); }}
            className="text-sm px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition"
          >
            + New loft
          </button>
        </div>
      ) : !loading && filtered.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-6">No lofts match your search.</p>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((l) => (
                <li key={l.id} className="group relative">
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-bold shrink-0">
                      {l.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + date */}
                    <Link href={`/lofts/${l.id}`} className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {l.name}
                      </span>
                      {l.createdAt ? (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Created {new Date(l.createdAt).toLocaleDateString()}
                        </p>
                      ) : null}
                    </Link>

                    {/* Inline actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <Link
                        href={`/lofts/${l.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/lofts/${l.id}/edit`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        Edit
                      </Link>
                    </div>

                    {/* More menu */}
                    <div className="relative" data-row-menu="true">
                      <button
                        type="button"
                        onClick={() => setMenuOpenId(menuOpenId === l.id ? null : l.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        aria-label="More options"
                      >
                        ⋯
                      </button>

                      {menuOpenId === l.id && (
                        <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-black/10 dark:shadow-black/40 py-1">
                          <Link
                            href={`/lofts/${l.id}`}
                            className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            onClick={() => setMenuOpenId(null)}
                          >
                            Open
                          </Link>
                          <Link
                            href={`/lofts/${l.id}/edit`}
                            className="block px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            onClick={() => setMenuOpenId(null)}
                          >
                            Edit name
                          </Link>
                          <div className="px-3 py-1.5">
                            <DeleteLoftButton loftId={l.id} loftLabel={l.name} />
                          </div>
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
                {filtered.length} of {lofts.length} loft{lofts.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Loft Modal */}
      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) setShowAdd(false); }} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">New loft</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Give your loft a name.</p>

            <form onSubmit={submitNewLoft} className="space-y-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm"
                placeholder="e.g. Main Loft"
                maxLength={60}
                autoFocus
              />

              {error ? (
                <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAdd(false)} disabled={saving}
                  className="text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="text-sm px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm transition disabled:opacity-50">
                  {saving ? "Creating…" : "Create loft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
