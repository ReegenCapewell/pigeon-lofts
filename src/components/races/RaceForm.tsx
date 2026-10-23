"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { dayKey, pmvCoveredOn } from "@/lib/medical";
import {
  LEVELS,
  PEDIGREE_TOP_POSITION,
  RACE_STATUS_LABELS,
  RACE_TYPE_LABELS,
  YARDS_PER_MILE,
  formatDuration,
  formatVelocity,
  flyingSeconds,
  normaliseTime,
  shouldShowOnPedigreeByDefault,
  velocityYpm,
  type RaceResultDTO,
  type RaceStatus,
} from "@/lib/races";

const inputClass =
  "w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm";
const labelClass = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5";
const sectionClass = "text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500";

type Values = Record<string, string>;

const LEVEL_FIELDS = ["Position", "Birds", "Lofts"] as const;

function initialValues(r: RaceResultDTO | null): Values {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const v: Values = {
    raceName: s(r?.raceName),
    raceDate: s(r?.raceDate),
    organisation: s(r?.organisation),
    raceType: s(r?.raceType),
    status: r?.status ?? "PLACED",
    liberationTime: s(r?.liberationTime),
    clockTime: s(r?.clockTime),
    clockDayOffset: s(r?.clockDayOffset ?? 0),
    distanceMiles: r?.distanceYards ? String(Math.floor(r.distanceYards / YARDS_PER_MILE)) : "",
    distanceExtraYards: r?.distanceYards ? s(r.distanceYards % YARDS_PER_MILE || "") : "",
    points: s(r?.points),
    prize: r?.prizePence !== null && r?.prizePence !== undefined ? (r.prizePence / 100).toFixed(2) : "",
    weather: s(r?.weather),
    wind: s(r?.wind),
    notes: s(r?.notes),
  };
  for (const level of LEVELS) {
    for (const f of LEVEL_FIELDS) {
      const key = `${level.key}${f}` as keyof RaceResultDTO;
      v[key] = s(r?.[key]);
    }
  }
  return v;
}

export default function RaceForm({
  birdId,
  birdLabel,
  result,
  pmvPeriods = [],
  onClose,
  onSaved,
}: {
  birdId: string;
  birdLabel: string;
  result: RaceResultDTO | null; // null = adding a new result
  pmvPeriods?: { from: string; until: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<Values>(() => initialValues(result));
  // Until the user ticks/unticks it themselves, the pedigree box follows the placing.
  const [pedigree, setPedigree] = useState<boolean | null>(result ? result.showOnPedigree : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  const num = (k: string) => (v[k].trim() && Number.isFinite(Number(v[k])) ? Number(v[k]) : null);
  const positions = { clubPosition: num("clubPosition"), fedPosition: num("fedPosition"), openPosition: num("openPosition") };
  const autoPedigree = shouldShowOnPedigreeByDefault(positions);
  const showOnPedigree = pedigree ?? autoPedigree;

  // Live preview of flying time and velocity
  const timing = {
    liberationTime: normaliseTime(v.liberationTime),
    clockTime: normaliseTime(v.clockTime),
    clockDayOffset: Number(v.clockDayOffset) || 0,
  };
  const yards = (num("distanceMiles") ?? 0) * YARDS_PER_MILE + (num("distanceExtraYards") ?? 0);
  const secs = flyingSeconds(timing);
  const ypm = velocityYpm({ ...timing, distanceYards: yards || null });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!v.raceName.trim()) return setError("Enter the race (e.g. the race point, like Bourges).");
    if (!v.raceDate.trim()) return setError("Enter the race date.");
    setSaving(true);
    try {
      const res = await fetch(result ? `/api/races/${result.id}` : "/api/races", {
        method: result ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, birdId, showOnPedigree }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Couldn't save the result. Please try again.");
        return;
      }
      onSaved();
    } catch {
      setError("Couldn't save the result. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={result ? "Edit race result" : "Add race result"}
      subtitle={birdLabel}
      onClose={() => !saving && onClose()}
      size="xl"
    >
      <form onSubmit={submit} className="space-y-6">
        <section className="space-y-4">
          <p className={sectionClass}>Race</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Race point *</label>
              <input value={v.raceName} onChange={set("raceName")} className={inputClass} placeholder="e.g. Bourges" maxLength={80} autoFocus />
            </div>
            <div>
              <label className={labelClass}>Race date *</label>
              <input value={v.raceDate} onChange={set("raceDate")} className={inputClass} placeholder="dd/mm/yyyy" maxLength={10} />
            </div>
            <div>
              <label className={labelClass}>Organisation</label>
              <input value={v.organisation} onChange={set("organisation")} className={inputClass} placeholder="e.g. Barnsley Central HS" maxLength={80} />
            </div>
            <div>
              <label className={labelClass}>Race type</label>
              <select value={v.raceType} onChange={set("raceType")} className={inputClass}>
                <option value="">Not set</option>
                {Object.entries(RACE_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {dayKey(v.raceDate.trim()) !== null && !pmvCoveredOn(pmvPeriods, v.raceDate.trim()) ? (
          <p className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            This bird has no PMV vaccination recorded that covers {v.raceDate.trim()}. A current PMV vaccination is needed for racing.
            You can still save the result.
          </p>
        ) : null}

        <section className="space-y-4">
          <p className={sectionClass}>Timing &amp; distance</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Liberation time</label>
              <input value={v.liberationTime} onChange={set("liberationTime")} className={inputClass} placeholder="e.g. 06:45" maxLength={8} inputMode="numeric" />
            </div>
            <div>
              <label className={labelClass}>Clock time</label>
              <input value={v.clockTime} onChange={set("clockTime")} className={inputClass} placeholder="e.g. 14:12:30" maxLength={8} inputMode="numeric" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>Clocked</label>
              <select value={v.clockDayOffset} onChange={set("clockDayOffset")} className={inputClass}>
                <option value="0">Same day</option>
                <option value="1">Next day</option>
                <option value="2">2 days later</option>
                <option value="3">3 days later</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Distance (miles)</label>
              <input value={v.distanceMiles} onChange={set("distanceMiles")} className={inputClass} placeholder="e.g. 456" inputMode="numeric" />
            </div>
            <div>
              <label className={labelClass}>+ yards</label>
              <input value={v.distanceExtraYards} onChange={set("distanceExtraYards")} className={inputClass} placeholder="e.g. 1234" inputMode="numeric" />
            </div>
          </div>
          {secs || ypm ? (
            <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">
              {secs ? <>Flying time {formatDuration(secs)}</> : null}
              {secs && ypm ? " · " : null}
              {ypm ? <>Velocity {formatVelocity(ypm)}</> : null}
              {timing.clockDayOffset ? " (overnight: no hours of darkness deducted)" : null}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Add liberation time, clock time and distance to work out the velocity.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <p className={sectionClass}>Placings</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 dark:text-slate-400">
                  <th className="text-left font-medium pb-1.5 pr-3 w-16"></th>
                  <th className="text-left font-medium pb-1.5 pr-3">Position</th>
                  <th className="text-left font-medium pb-1.5 pr-3">Birds competing</th>
                  <th className="text-left font-medium pb-1.5">Lofts</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map((level) => (
                  <tr key={level.key}>
                    <td className="pr-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">{level.label}</td>
                    {LEVEL_FIELDS.map((f) => (
                      <td key={f} className={f === "Lofts" ? "py-1" : "pr-3 py-1"}>
                        <input
                          value={v[`${level.key}${f}`]}
                          onChange={set(`${level.key}${f}`)}
                          className={`${inputClass} min-w-[4.5rem]`}
                          inputMode="numeric"
                          aria-label={`${level.label} ${f.toLowerCase()}`}
                          placeholder={f === "Position" ? "e.g. 3" : ""}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Open covers Combine, National or Open results.</p>
        </section>

        <section className="space-y-4">
          <p className={sectionClass}>Outcome</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select value={v.status} onChange={set("status")} className={inputClass}>
                {(Object.keys(RACE_STATUS_LABELS) as RaceStatus[]).map((k) => (
                  <option key={k} value={k}>{RACE_STATUS_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Points</label>
              <input value={v.points} onChange={set("points")} className={inputClass} placeholder="e.g. 25" inputMode="decimal" />
            </div>
            <div>
              <label className={labelClass}>Prize money (£)</label>
              <input value={v.prize} onChange={set("prize")} className={inputClass} placeholder="e.g. 12.50" inputMode="decimal" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <p className={sectionClass}>Conditions &amp; notes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Weather</label>
              <input value={v.weather} onChange={set("weather")} className={inputClass} placeholder="e.g. Sunny, 22°C" maxLength={80} />
            </div>
            <div>
              <label className={labelClass}>Wind</label>
              <input value={v.wind} onChange={set("wind")} className={inputClass} placeholder="e.g. Light SW" maxLength={80} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={v.notes} onChange={set("notes")} className={`${inputClass} min-h-[4.5rem]`} placeholder="e.g. Came in with the first drop" maxLength={500} />
          </div>
        </section>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnPedigree}
            onChange={(e) => setPedigree(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-emerald-500"
          />
          <span>
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">Show on pedigree</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {pedigree === null
                ? `Ticked automatically for top-${PEDIGREE_TOP_POSITION} placings. Untick to leave it off.`
                : "Shown in this bird's box on every pedigree it appears in."}
            </span>
          </span>
        </label>

        {error ? (
          <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
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
            {saving ? "Saving…" : result ? "Save" : "Add result"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
