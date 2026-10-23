"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MedicalForm, { type BulkBird } from "./MedicalForm";
import PmvBadge from "./PmvBadge";
import { DUE_STYLE, DUE_TEXT } from "./MedicalRecordsView";
import { MEDICAL_TYPE_LABELS, recordHeading, type DueState, type MedicalRecordDTO, type PmvStatus } from "@/lib/medical";

export type Reminder = { record: MedicalRecordDTO; birdLabel: string; state: DueState };
export type PmvRow = { birdId: string; birdLabel: string; loftName: string | null; status: PmvStatus };
export type RecentRow = { record: MedicalRecordDTO; birdLabel: string };

export default function HealthOverview({
  lofts,
  birds,
  reminders,
  pmvRows,
  recent,
}: {
  lofts: { id: string; name: string }[];
  birds: BulkBird[];
  reminders: Reminder[];
  pmvRows: PmvRow[];
  recent: RecentRow[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = { valid: 0, "due-soon": 0, expired: 0, none: 0 } as Record<PmvStatus["state"], number>;
  for (const p of pmvRows) counts[p.status.state]++;
  const needsPmv = pmvRows.filter((p) => p.status.state !== "valid");

  // Reminders logged together (e.g. a whole-loft treatment) share one line.
  const grouped: { key: string; first: Reminder; birds: { id: string; label: string }[] }[] = [];
  for (const rem of reminders) {
    const key = rem.record.batchId ? `b:${rem.record.batchId}` : `r:${rem.record.id}`;
    const g = grouped.find((x) => x.key === key);
    if (g) g.birds.push({ id: rem.record.birdId, label: rem.birdLabel });
    else grouped.push({ key, first: rem, birds: [{ id: rem.record.birdId, label: rem.birdLabel }] });
  }

  async function markDone(id: string, wholeBatch: boolean) {
    setError(null);
    const res = await fetch(`/api/medical/${id}${wholeBatch ? "?batch=all" : ""}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderDone: true }),
    }).catch(() => null);
    if (!res?.ok) return setError("Couldn't update that reminder. Please try again.");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-8 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Loft health</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">Health</h1>
        </div>
        <button
          type="button"
          onClick={() => { setMessage(null); setAdding(true); }}
          disabled={!birds.length}
          className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition disabled:opacity-50"
        >
          + Add record
        </button>
      </div>

      {message ? (
        <p className="mt-6 text-xs text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-3 py-2">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-6 text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">{error}</p>
      ) : null}

      {/* Reminders */}
      <section className="py-8 border-b border-slate-100 dark:border-slate-800">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
          Reminders <span className="normal-case tracking-normal">(overdue and due in the next two weeks)</span>
        </p>
        {reminders.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nothing due. Records with a &ldquo;next due&rdquo; date show here when they&apos;re coming up.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
            {grouped.map(({ key, first: { record: r, state }, birds: who }) => (
              <li key={key} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className={`rounded-full px-2 py-px text-[11px] font-medium ${DUE_STYLE[state]}`}>{DUE_TEXT[state]} {r.nextDueDate}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{recordHeading(r)}</span>
                {who.length === 1 ? (
                  <Link href={`/birds/${who[0].id}/health`} className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">
                    {who[0].label}
                  </Link>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400" title={who.map((w) => w.label).join("\n")}>
                    {who.length} birds: {who.slice(0, 3).map((w) => w.label.split(" – ")[1] ?? w.label).join(", ")}
                    {who.length > 3 ? "…" : ""}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void markDone(r.id, who.length > 1)}
                  className="ml-auto text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  {who.length > 1 ? `Mark done for all ${who.length}` : "Mark done"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* PMV */}
      <section className="py-8 border-b border-slate-100 dark:border-slate-800">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">PMV vaccination</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-5">
          {([
            ["valid", "Covered"],
            ["due-soon", "Due soon"],
            ["expired", "Overdue"],
            ["none", "Not recorded"],
          ] as const).map(([k, lbl]) => (
            <div key={k}>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{counts[k]}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{lbl}</p>
            </div>
          ))}
        </div>
        {needsPmv.length ? (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Birds that need a PMV vaccination before racing:</p>
            <ul className="flex flex-wrap gap-2">
              {needsPmv.map((p) => (
                <li key={p.birdId}>
                  <Link
                    href={`/birds/${p.birdId}/health`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition"
                  >
                    {p.birdLabel}
                    <PmvBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : pmvRows.length ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Every bird has a current PMV vaccination.</p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Add some birds to track their vaccinations.</p>
        )}
      </section>

      {/* Recent */}
      <section className="pt-8">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Recent records</p>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No medical records yet. Use &ldquo;Add record&rdquo; to log one for a whole loft or a few birds at once.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map(({ record: r, birdLabel }) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                <span className="text-xs text-slate-400 dark:text-slate-500 w-20 shrink-0">{r.date}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{recordHeading(r)}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{MEDICAL_TYPE_LABELS[r.type]}</span>
                <Link href={`/birds/${r.birdId}/health`} className="ml-auto text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400">
                  {birdLabel}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {adding ? (
        <MedicalForm
          target={{ kind: "bulk", lofts, birds }}
          record={null}
          onClose={() => setAdding(false)}
          onSaved={(msg) => { setAdding(false); setMessage(msg ?? "Record added."); router.refresh(); }}
        />
      ) : null}
    </>
  );
}
