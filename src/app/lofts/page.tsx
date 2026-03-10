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

    (async () => {
      if (!alive) return;
      await load();
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close ⋯ menu on outside click / Escape
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

  const clear = () => {
    setQuery("");
    setSortBy("newest");
  };

  async function submitNewLoft(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = newName.trim();
    if (!name) {
      setError("Please enter a loft name.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/lofts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const msg = (await res.text()).trim();
        setError(msg || "Failed to create loft");
        return;
      }

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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Lofts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Search and sort your lofts.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNewName("");
              setShowAdd(true);
            }}
            className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
          >
            + Add loft
          </button>

          <Link
            href="/lofts"
            className="text-sm px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            onClick={(e) => {
              if (
                typeof window !== "undefined" &&
                window.location.pathname === "/lofts"
              ) {
                e.preventDefault();
                clear();
              }
            }}
          >
            Clear
          </Link>
        </div>
      </div>

      {/* Controls */}
      <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
        <div className="grid md:grid-cols-6 gap-3">
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Search (loft name)
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Main Loft"
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Sort
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "az")}
              className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
            >
              <option value="newest">Newest</option>
              <option value="az">A→Z</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing{" "}
            <span className="text-slate-900 dark:text-slate-100 font-semibold">
              {filtered.length}
            </span>{" "}
            of{" "}
            <span className="text-slate-900 dark:text-slate-100 font-semibold">
              {lofts.length}
            </span>{" "}
            lofts
          </span>

          {(query.trim() || sortBy !== "newest") && (
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              Reset
            </button>
          )}
        </div>
      </section>

      {/* List */}
      <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Loft list
        </h2>

        {loading ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Loading…
          </p>
        ) : lofts.length === 0 ? (
          <div className="border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-400">
            <p className="mb-1">No lofts yet.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Create a loft to organise your birds and track them more easily.
            </p>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setNewName("");
                setShowAdd(true);
              }}
              className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
            >
              + Add loft
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-400">
            <p className="mb-1">No lofts match your search.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Try clearing the search box.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((l) => (
              <li key={l.id} className="relative">
                <div className="flex items-center justify-between gap-3 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2.5 hover:border-emerald-400 dark:hover:border-emerald-700 transition">
                  <Link
                    href={`/lofts/${l.id}`}
                    className="flex-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-800 dark:text-slate-100">
                        {l.name}
                      </div>
                      {l.createdAt ? (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(l.createdAt).toLocaleDateString()}
                        </div>
                      ) : null}
                    </div>
                  </Link>

                  <div className="relative" data-row-menu="true">
                    <button
                      type="button"
                      onClick={() =>
                        setMenuOpenId(menuOpenId === l.id ? null : l.id)
                      }
                      className="px-2 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      aria-label="Loft actions"
                    >
                      ⋯
                    </button>

                    {menuOpenId === l.id && (
                      <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-black/10 dark:shadow-slate-950/50">
                        <Link
                          href={`/lofts/${l.id}/edit`}
                          className="block px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-t-xl transition"
                          onClick={() => setMenuOpenId(null)}
                        >
                          Edit
                        </Link>

                        <div className="px-3 py-2">
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
      </section>

      {/* Add Loft Modal */}
      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={() => {
              if (!saving) setShowAdd(false);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-5 shadow-xl shadow-black/10 dark:shadow-black/50">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Add loft
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create a new loft for your birds.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                disabled={saving}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitNewLoft} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Loft name
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition"
                  placeholder="e.g. Main Loft"
                  maxLength={60}
                  autoFocus
                />
              </div>

              {error ? (
                <p className="text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2 justify-end pt-1">
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
                  {saving ? "Saving…" : "Create loft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
