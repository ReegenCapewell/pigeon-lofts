"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";

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
  const [deleteId, setDeleteId] = useState<string | null>(null);


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
  if (!menuOpenId) return;

  function onPointerDown(e: MouseEvent | PointerEvent) {
    const t = e.target as HTMLElement | null;
    if (t?.closest('[data-loft-row-menu="true"]')) return;
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
        const msg = await res.text();
        throw new Error(msg || "Failed to create loft");
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

async function deleteLoft(id: string) {
  const res = await fetch(`/api/lofts?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const msg = await res.text();
    alert(msg || "Failed to delete loft");
    return;
  }

  setLofts((prev) => prev.filter((l) => l.id !== id));
}
  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-50">Lofts</h1>
          <p className="text-sm text-slate-300">Search and sort your lofts.</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setNewName("");
              setShowAdd(true);
            }}
            className="text-sm px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium transition"
          >
            + Add loft
          </button>

          <Link
            href="/lofts"
            className="text-sm px-4 py-2 rounded-full border border-slate-600 hover:border-sky-500 hover:text-sky-300 transition"
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
      <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
        <div className="grid md:grid-cols-6 gap-3">
          <div className="md:col-span-5">
            <label className="block text-xs text-slate-400 mb-1">
              Search (loft name)
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Main Loft"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs text-slate-400 mb-1">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "az")}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
            >
              <option value="newest">Newest</option>
              <option value="az">A→Z</option>
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
            <span className="text-slate-100 font-semibold">{lofts.length}</span>{" "}
            lofts
          </span>

          {(query.trim() || sortBy !== "newest") && (
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1 rounded-full border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition"
            >
              Reset
            </button>
          )}
        </div>
      </section>

      {/* List */}
      <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-3">Loft list</h2>

        {loading ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 text-sm text-slate-300">
            <p className="mb-1">No lofts match your search.</p>
            <p className="text-xs text-slate-500">
              Try clearing the search box.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((l) => (
<li key={l.id}>
  <div className="relative flex items-center justify-between gap-3 border border-slate-700 bg-slate-950 rounded-xl px-3 py-2 hover:border-sky-500 transition">
    <Link
      href={`/lofts/${l.id}`}
      className="flex-1 hover:text-sky-300 transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-100">{l.name}</div>
        {l.createdAt ? (
          <div className="text-[11px] text-slate-500">
            {new Date(l.createdAt).toLocaleDateString()}
          </div>
        ) : null}
      </div>
    </Link>

    <div className="relative" data-loft-row-menu="true">
      <button
        type="button"
        onClick={() => setMenuOpenId(menuOpenId === l.id ? null : l.id)}
        className="px-2 py-1 text-slate-400 hover:text-slate-100"
        aria-label="More actions"
      >
        ⋯
      </button>

      {menuOpenId === l.id && (
        <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-slate-700 bg-slate-950 shadow">
          <Link
            href={`/lofts/${l.id}/edit`}
            className="block px-3 py-2 text-sm hover:bg-slate-900"
            onClick={() => setMenuOpenId(null)}
          >
            Edit
          </Link>

          <button
            type="button"
            onClick={() => {
              setMenuOpenId(null);
              setDeleteId(l.id);
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
      </section>

      {/* Add Loft Modal */}
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
                <h3 className="text-lg font-semibold text-slate-50">Add loft</h3>
                <p className="text-xs text-slate-400">
                  Create a new loft for your birds.
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

            <form onSubmit={submitNewLoft} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Loft name
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
                  placeholder="e.g. Main Loft"
                  maxLength={60}
                  autoFocus
                />
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
                  {saving ? "Saving…" : "Create loft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <ConfirmModal
  open={!!deleteId}
  title="Delete loft?"
  message="Birds in this loft will become unassigned. This action cannot be undone."
  confirmLabel="Delete loft"
  onCancel={() => setDeleteId(null)}
  onConfirm={() => {
    if (!deleteId) return;
    void deleteLoft(deleteId);
    setDeleteId(null);
  }}
/>
    </main>
  );
}
