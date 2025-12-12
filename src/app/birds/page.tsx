"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Loft = {
  id: string;
  name: string;
};

type Bird = {
  id: string;
  ring: string;
  name: string | null;
  loftId: string | null;
  loft?: Loft | null;
};

export default function BirdsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [birds, setBirds] = useState<Bird[]>([]);
  const [lofts, setLofts] = useState<Loft[]>([]);
  const [ring, setRing] = useState("");
  const [name, setName] = useState("");
  const [selectedLoftId, setSelectedLoftId] = useState<string | "">("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [status, router]);

  useEffect(() => {
    async function fetchLoftsAndBirds() {
      setMessage("");
      try {
        const [loftsRes, birdsRes] = await Promise.all([
          fetch("/api/lofts"),
          fetch("/api/birds"),
        ]);

        const loftsText = await loftsRes.text();
        const birdsText = await birdsRes.text();

        if (!loftsRes.ok) {
          setMessage(`Error loading lofts: ${loftsRes.status} ${loftsText}`);
          return;
        }
        if (!birdsRes.ok) {
          setMessage(`Error loading birds: ${birdsRes.status} ${birdsText}`);
          return;
        }

        setLofts(JSON.parse(loftsText) as Loft[]);
        setBirds(JSON.parse(birdsText) as Bird[]);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load birds/lofts.");
      }
    }

    if (status === "authenticated") fetchLoftsAndBirds();
  }, [status]);

  if (status === "loading") {
    return (
      <main className="space-y-6">
        <p className="text-sm text-slate-300">Checking your session...</p>
      </main>
    );
  }

  async function refresh() {
    const [loftsRes, birdsRes] = await Promise.all([
      fetch("/api/lofts"),
      fetch("/api/birds"),
    ]);
    const loftsText = await loftsRes.text();
    const birdsText = await birdsRes.text();
    if (loftsRes.ok) setLofts(JSON.parse(loftsText) as Loft[]);
    if (birdsRes.ok) setBirds(JSON.parse(birdsText) as Bird[]);
  }

  async function handleCreateBird(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/birds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ring,
          name: name || null,
          loftId: selectedLoftId || null,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        setMessage(`Error creating bird: ${res.status} ${text}`);
        return;
      }

      setMessage("Bird created!");
      setRing("");
      setName("");
      setSelectedLoftId("");
      await refresh();
    } catch (err) {
      console.error(err);
      setMessage("Failed to create bird.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(birdId: string, newLoftId: string | "") {
    setMessage("");
    try {
      const res = await fetch("/api/birds/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birdId, loftId: newLoftId || null }),
      });

      const text = await res.text();
      if (!res.ok) {
        setMessage(`Error assigning bird: ${res.status} ${text}`);
        return;
      }

      await refresh();
    } catch (err) {
      console.error(err);
      setMessage("Failed to assign bird.");
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-50">My Birds</h1>

      <div className="grid md:grid-cols-[1.1fr_1.2fr] gap-6">
        <form
          onSubmit={handleCreateBird}
          className="space-y-3 bg-slate-900/80 border border-slate-700 rounded-2xl p-4"
        >
          <h2 className="text-sm font-semibold mb-1 text-slate-100">
            Add a new bird
          </h2>

          <div>
            <label className="block text-xs mb-1 text-slate-300">
              Ring (unique)
            </label>
            <input
              className="w-full border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={ring}
              onChange={(e) => setRing(e.target.value.toUpperCase())}
              required
              pattern="[A-Z]{2}[0-9]{2}[A-Z]?[0-9]{4}"
              title="Format: 2 letters, 2 digits, optional letter, 4 digits (e.g. GB24A1234)"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Example: <code className="font-mono">GB24A1234</code>
            </p>
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-300">
              Name (optional)
            </label>
            <input
              className="w-full border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-slate-300">
              Assign to loft (optional)
            </label>
            <select
              className="w-full border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={selectedLoftId}
              onChange={(e) => setSelectedLoftId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {lofts.map((loft) => (
                <option key={loft.id} value={loft.id}>
                  {loft.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="py-2 px-4 rounded-full border border-sky-500 bg-sky-500 text-white text-sm font-medium hover:bg-sky-400 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create bird"}
          </button>

          {message && (
            <p className="mt-2 text-xs text-slate-300 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2">
              {message}
            </p>
          )}
        </form>

        <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3 text-slate-100">
            Existing birds
          </h2>

          {birds.length === 0 ? (
            <p className="text-xs text-slate-400">No birds yet.</p>
          ) : (
            <ul className="space-y-2">
              {birds.map((bird) => (
                <li
                  key={bird.id}
                  className="border border-slate-700 bg-slate-950 rounded-xl px-3 py-2 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/birds/${bird.id}`}
                      className="flex-1 hover:text-sky-300 transition"
                    >
                      <p className="text-sm text-slate-100">
                        {bird.ring}
                        {bird.name ? (
                          <span className="text-slate-400"> – {bird.name}</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {bird.loft ? `Loft: ${bird.loft.name}` : "Unassigned"}
                      </p>
                    </Link>
                  </div>

                  <div>
                    <label className="block text-[11px] mb-1 text-slate-400">
                      Change loft assignment
                    </label>
                    <select
                      className="border border-slate-700 bg-slate-950 rounded-lg px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      value={bird.loftId ?? ""}
                      onChange={(e) => handleAssign(bird.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {lofts.map((loft) => (
                        <option key={loft.id} value={loft.id}>
                          {loft.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
