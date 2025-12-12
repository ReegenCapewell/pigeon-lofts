"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Loft = {
  id: string;
  name: string;
  createdAt: string;
};

export default function LoftsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [lofts, setLofts] = useState<Loft[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth");
  }, [status, router]);

  useEffect(() => {
    async function fetchLofts() {
      setMessage("");
      try {
        const res = await fetch("/api/lofts");
        const text = await res.text();
        if (!res.ok) {
          setMessage(`Error loading lofts: ${res.status} ${text}`);
          return;
        }
        setLofts(JSON.parse(text) as Loft[]);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load lofts.");
      }
    }

    if (status === "authenticated") fetchLofts();
  }, [status]);

  if (status === "loading") {
    return (
      <main className="space-y-6">
        <p className="text-sm text-slate-300">Checking your session...</p>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/lofts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const text = await res.text();
      if (!res.ok) {
        setMessage(`Error: ${res.status} ${text}`);
        return;
      }

      setMessage("Loft created!");
      setName("");

      const res2 = await fetch("/api/lofts");
      const text2 = await res2.text();
      if (res2.ok) setLofts(JSON.parse(text2) as Loft[]);
    } catch (err) {
      console.error(err);
      setMessage("Failed to create loft.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-50">My Lofts</h1>

      <div className="grid md:grid-cols-[1.1fr_1.2fr] gap-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-3 bg-slate-900/80 border border-slate-700 rounded-2xl p-4"
        >
          <h2 className="text-sm font-semibold mb-1 text-slate-100">
            Create a new loft
          </h2>

          <div>
            <label className="block text-xs mb-1 text-slate-300">
              Loft name
            </label>
            <input
              className="w-full border border-slate-700 bg-slate-950 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="py-2 px-4 rounded-full border border-sky-500 bg-sky-500 text-white text-sm font-medium hover:bg-sky-400 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create loft"}
          </button>

          {message && (
            <p className="mt-2 text-xs text-slate-300 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2">
              {message}
            </p>
          )}
        </form>

        <section className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-3 text-slate-100">
            Existing lofts
          </h2>

          {lofts.length === 0 ? (
            <p className="text-xs text-slate-400">No lofts yet.</p>
          ) : (
            <ul className="space-y-2">
              {lofts.map((loft) => (
                <li key={loft.id}>
                  <Link
                    href={`/lofts/${loft.id}`}
                    className="border border-slate-700 bg-slate-950 rounded-xl px-3 py-2 flex justify-between items-center hover:border-sky-500 hover:text-sky-300 transition"
                  >
                    <span className="text-sm text-slate-100">{loft.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(loft.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
