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
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") setMenuOpenId(null); }
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
        return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
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
    <main>
      <div className="flex items-end justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
            Manage
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">Lofts</h1>
        </div>
        <button
          type="button"
          onClick={() => { setError(null); setNewName(""); setShowAdd(true); }}
          className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
        >
          + New loft
        </button>
      </div>

      <div className="py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lofts…"
          className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500 transition"
        />
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "az")}
            className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
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
              Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 py-3 border-b border-slate-100 dark:border-slate-800">
        {loading ? "Loading…" : <>{filtered.length} of {lofts.length} loft{lofts.length !== 1 ? "s" : ""}</>}
      </p>

      {!loading && lofts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">No lofts yet. Create one to get started.</p>
          <button
            type="button"
            onClick={() => { setError(null); setNewName(""); setShowAdd(true); }}
            className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
          >
            + New loft
          </button>
        </div>
      ) : !loading && filtered.length === 0 ? (
        <p className="py-8 text-sm text-slate-400 dark:text-slate-500">No lofts match your search.</p>
      ) : (
        <ul>
          {filtered.map((l) => (
            <li key={l.id} className="group border-b border-slate-100 dark:border-slate-800 last:border-0 relative">
              <div className="flex items-center gap-3 py-3.5 -mx-1 px-1">
                <Link
                  href={`/lofts/${l.id}`}
                  className="flex-1 flex items-center justify-between gap-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 -mx-2 px-2 py-1.5 transition"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    {l.name}
                  </span>
                  {l.createdAt ? (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </Link>

                <div className="relative" data-row-menu="true">
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(menuOpenId === l.id ? null : l.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    aria-label="Loft actions"
                  >
                    ⋯
                  </button>

                  {menuOpenId === l.id && (
                    <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-black/10 dark:shadow-slate-950/60 py-1">
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

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={() => { if (!saving) setShowAdd(false); }} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-2xl shadow-black/10 dark:shadow-black/50">
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
                  className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition disabled:opacity-50">
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
