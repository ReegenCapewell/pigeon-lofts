"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import RaceForm from "./RaceForm";
import {
  LEVELS,
  RACE_STATUS_LABELS,
  RACE_TYPE_LABELS,
  bestPosition,
  dateKey,
  flyingSeconds,
  formatDistance,
  formatDuration,
  formatPrize,
  formatVelocity,
  ordinal,
  velocityYpm,
  type RaceResultDTO,
} from "@/lib/races";

const statusStyle: Record<RaceResultDTO["status"], string> = {
  PLACED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  CLOCKED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  NOT_CLOCKED: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  LATE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  LOST: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
};

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</p>
      {sub ? <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p> : null}
    </div>
  );
}

export default function RaceResultsView({
  birdId,
  birdLabel,
  results,
}: {
  birdId: string;
  birdLabel: string;
  results: RaceResultDTO[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<RaceResultDTO | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => [...results].sort((a, b) => dateKey(b.raceDate) - dateKey(a.raceDate)), [results]);

  const summary = useMemo(() => {
    let best: { pos: number; level: string; race: RaceResultDTO } | null = null;
    let bestV: { ypm: number; race: RaceResultDTO } | null = null;
    let wins = 0;
    let top10 = 0;
    let prize = 0;
    for (const r of results) {
      for (const level of LEVELS) {
        const pos = r[`${level.key}Position`];
        if (pos && (!best || pos < best.pos)) best = { pos, level: level.label, race: r };
      }
      const b = bestPosition(r);
      if (b === 1) wins++;
      if (b !== null && b <= 10) top10++;
      const ypm = velocityYpm(r);
      if (ypm && (!bestV || ypm > bestV.ypm)) bestV = { ypm, race: r };
      prize += r.prizePence ?? 0;
    }
    return { best, bestV, wins, top10, prize };
  }, [results]);

  async function togglePedigree(r: RaceResultDTO) {
    setError(null);
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/races/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnPedigree: !r.showOnPedigree }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Couldn't update that result. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    const id = deleteId;
    setDeleteId(null);
    if (!id) return;
    setError(null);
    const res = await fetch(`/api/races/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return setError("Couldn't delete that result. Please try again.");
    router.refresh();
  }

  return (
    <>
      {/* Summary */}
      <div className="py-8 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-8">
        <Stat label="Races" value={results.length} />
        <Stat label="Wins" value={summary.wins} sub="1st at any level" />
        <Stat label="Top 10s" value={summary.top10} />
        <Stat
          label="Best placing"
          value={summary.best ? `${ordinal(summary.best.pos)} ${summary.best.level}` : "—"}
          sub={summary.best ? `${summary.best.race.raceName} ${summary.best.race.raceDate.slice(-4)}` : null}
        />
        <Stat
          label="Best velocity"
          value={summary.bestV ? <span className="text-lg">{formatVelocity(summary.bestV.ypm)}</span> : "—"}
          sub={summary.bestV ? `${summary.bestV.race.raceName} ${summary.bestV.race.raceDate.slice(-4)}` : null}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-8 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Results</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ticked results appear on this bird&apos;s pedigree.
            {summary.prize ? ` Total prize money ${formatPrize(summary.prize)}.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
        >
          + Add result
        </button>
      </div>

      {error ? (
        <p className="mb-4 text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">
          {error}
        </p>
      ) : null}

      {sorted.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No race results logged yet.</p>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
          >
            + Add the first result
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((r) => {
            const secs = flyingSeconds(r);
            const ypm = velocityYpm(r);
            const placings = LEVELS.flatMap((level) => {
              const pos = r[`${level.key}Position`];
              if (!pos) return [];
              const birds = r[`${level.key}Birds`];
              const lofts = r[`${level.key}Lofts`];
              const field = [birds ? `${birds.toLocaleString("en-GB")} birds` : null, lofts ? `${lofts} lofts` : null]
                .filter(Boolean)
                .join(", ");
              return [{ key: level.key, text: `${ordinal(pos)} ${level.label}`, field }];
            });
            return (
              <li key={r.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                      {r.raceName}
                      <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">{r.raceDate}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {[r.organisation, r.raceType ? RACE_TYPE_LABELS[r.raceType] : null, r.distanceYards ? formatDistance(r.distanceYards) : null]
                        .filter(Boolean)
                        .join(" · ") || " "}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle[r.status]}`}>
                      {RACE_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                </div>

                {placings.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {placings.map((p) => (
                      <span key={p.key} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-100">
                        <span className="font-semibold">{p.text}</span>
                        {p.field ? <span className="text-slate-500 dark:text-slate-400"> of {p.field}</span> : null}
                      </span>
                    ))}
                  </div>
                ) : null}

                <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                  {r.liberationTime ? <Item label="Liberated" value={r.liberationTime} /> : null}
                  {r.clockTime ? <Item label="Clocked" value={`${r.clockTime}${r.clockDayOffset ? ` (+${r.clockDayOffset} day${r.clockDayOffset > 1 ? "s" : ""})` : ""}`} /> : null}
                  {secs ? <Item label="Flying time" value={formatDuration(secs)} /> : null}
                  {ypm ? <Item label="Velocity" value={formatVelocity(ypm)} strong /> : null}
                  {r.points !== null ? <Item label="Points" value={String(r.points)} /> : null}
                  {r.prizePence !== null ? <Item label="Prize" value={formatPrize(r.prizePence)} /> : null}
                  {r.weather ? <Item label="Weather" value={r.weather} /> : null}
                  {r.wind ? <Item label="Wind" value={r.wind} /> : null}
                </dl>
                {r.notes ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">{r.notes}</p> : null}

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.showOnPedigree}
                      disabled={busyId === r.id}
                      onChange={() => void togglePedigree(r)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    Show on pedigree
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(r.id)}
                      className="text-xs px-3 py-1.5 rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <RaceForm
          birdId={birdId}
          birdLabel={birdLabel}
          result={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      <ConfirmModal
        open={!!deleteId}
        title="Delete race result?"
        message="This removes the result from this bird's stats and pedigree."
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

function Item({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className={strong ? "font-semibold text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-200"}>{value}</dd>
    </div>
  );
}
