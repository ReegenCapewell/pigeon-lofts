"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MedicalForm from "./MedicalForm";
import Modal from "@/components/Modal";
import {
  CONDITION_SCORES,
  MEDICAL_TYPE_LABELS,
  METHODS,
  OUTCOMES,
  dayKey,
  dueState,
  label,
  pmvStatus,
  recordHeading,
  type MedicalRecordDTO,
  type MedicalType,
} from "@/lib/medical";

const TYPE_STYLE: Record<MedicalType, string> = {
  VACCINATION: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  TREATMENT: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  ILLNESS: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  HEALTH_CHECK: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export const DUE_STYLE = {
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  "due-soon": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  upcoming: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
} as const;
export const DUE_TEXT = { overdue: "Overdue", "due-soon": "Due soon", upcoming: "Due" } as const;

const pill = "text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition";

export default function MedicalRecordsView({
  birdId,
  birdLabel,
  records,
}: {
  birdId: string;
  birdLabel: string;
  records: MedicalRecordDTO[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<MedicalType | "ALL">("ALL");
  const [editing, setEditing] = useState<MedicalRecordDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<MedicalRecordDTO | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => [...records].sort((a, b) => (dayKey(b.date) ?? 0) - (dayKey(a.date) ?? 0)), [records]);
  const shown = filter === "ALL" ? sorted : sorted.filter((r) => r.type === filter);
  const pmv = pmvStatus(records);
  const reminders = sorted
    .filter((r) => r.nextDueDate && !r.reminderDone)
    .map((r) => ({ r, state: dueState(r.nextDueDate)! }))
    .filter((x) => x.state !== "upcoming")
    .sort((a, b) => (dayKey(a.r.nextDueDate) ?? 0) - (dayKey(b.r.nextDueDate) ?? 0));

  async function patch(id: string, body: object) {
    setError(null);
    const res = await fetch(`/api/medical/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res?.ok) return setError("Couldn't update that record. Please try again.");
    router.refresh();
  }

  async function remove(r: MedicalRecordDTO, all: boolean) {
    setDeleting(null);
    setError(null);
    const res = await fetch(`/api/medical/${r.id}${all ? "?batch=all" : ""}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return setError("Couldn't delete that record. Please try again.");
    const data = (await res.json().catch(() => null)) as { deleted?: number } | null;
    setMessage(all && data?.deleted ? `Deleted for ${data.deleted} birds.` : null);
    router.refresh();
  }

  const pmvText =
    pmv.state === "none"
      ? "No PMV vaccination recorded"
      : pmv.state === "expired"
        ? `Expired ${pmv.validUntil} (last given ${pmv.lastGiven})`
        : pmv.state === "due-soon"
          ? `Booster due ${pmv.validUntil}`
          : `Covered until ${pmv.validUntil}`;
  const pmvStyle =
    pmv.state === "valid"
      ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
      : pmv.state === "due-soon"
        ? "border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
        : "border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200";

  return (
    <>
      <div className="py-8 border-b border-slate-100 dark:border-slate-800 grid gap-4 md:grid-cols-2">
        <div className={`rounded-2xl border px-4 py-3 ${pmvStyle}`}>
          <p className="text-[11px] font-medium uppercase tracking-widest opacity-80 mb-1">PMV vaccination</p>
          <p className="text-sm font-semibold">{pmvText}</p>
          {pmv.state !== "valid" ? <p className="text-xs mt-1 opacity-90">A current PMV vaccination is needed for racing.</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Reminders</p>
          {reminders.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Nothing due in the next two weeks.</p>
          ) : (
            <ul className="space-y-1.5">
              {reminders.map(({ r, state }) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-px text-[11px] font-medium ${DUE_STYLE[state]}`}>{DUE_TEXT[state]}</span>
                  <span className="text-slate-800 dark:text-slate-100">{recordHeading(r)}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{r.nextDueDate}</span>
                  <button type="button" onClick={() => void patch(r.id, { reminderDone: true })} className="ml-auto text-xs text-emerald-700 dark:text-emerald-300 hover:underline">
                    Mark done
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-8 pb-4">
        <div className="flex flex-wrap gap-1">
          {(["ALL", "VACCINATION", "TREATMENT", "ILLNESS", "HEALTH_CHECK"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-full transition ${
                filter === t
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
              }`}
            >
              {t === "ALL" ? `All (${records.length})` : `${MEDICAL_TYPE_LABELS[t]} (${records.filter((r) => r.type === t).length})`}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { setMessage(null); setEditing("new"); }}
          className="text-sm px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition"
        >
          + Add record
        </button>
      </div>

      {message ? (
        <p className="mb-4 text-xs text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-3 py-2">{message}</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-xs text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2">{error}</p>
      ) : null}

      {shown.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {records.length ? "No records of this kind." : "No medical records yet."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => {
            const state = r.nextDueDate && !r.reminderDone ? dueState(r.nextDueDate) : null;
            const facts: [string, string | null][] = [
              ["Product", r.product],
              ["Batch no.", r.batchNumber],
              ["Dose", r.dose],
              ["How given", label(METHODS, r.method)],
              ["Vet / clinic", r.vet],
              ["Outcome", label(OUTCOMES, r.outcome)],
              ["Weight", r.weightGrams ? `${r.weightGrams} g` : null],
              ["Condition", label(CONDITION_SCORES, r.condition)],
            ];
            return (
              <li key={r.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                      {recordHeading(r)}
                      <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                        {r.date}
                        {r.endDate ? ` – ${r.endDate}` : ""}
                      </span>
                    </p>
                    {r.type === "ILLNESS" || r.category === "OTHER" ? null : r.title ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{r.title}</p>
                    ) : null}
                    {r.batchSize && r.batchSize > 1 ? (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">Logged for {r.batchSize} birds at once</p>
                    ) : null}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_STYLE[r.type]}`}>{MEDICAL_TYPE_LABELS[r.type]}</span>
                </div>

                <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                  {facts.filter(([, val]) => val).map(([k, val]) => (
                    <div key={k}>
                      <dt className="text-slate-400 dark:text-slate-500">{k}</dt>
                      <dd className="text-slate-700 dark:text-slate-200">{val}</dd>
                    </div>
                  ))}
                </dl>
                {r.notes ? <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">{r.notes}</p> : null}

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                    {r.nextDueDate ? (
                      r.reminderDone ? (
                        <>
                          <span>Next due {r.nextDueDate} · done</span>
                          <button type="button" onClick={() => void patch(r.id, { reminderDone: false })} className="hover:underline">Undo</button>
                        </>
                      ) : (
                        <>
                          <span className={`rounded-full px-2 py-px text-[11px] font-medium ${DUE_STYLE[state ?? "upcoming"]}`}>
                            {DUE_TEXT[state ?? "upcoming"]} {r.nextDueDate}
                          </span>
                          <button type="button" onClick={() => void patch(r.id, { reminderDone: true })} className="text-emerald-700 dark:text-emerald-300 hover:underline">Mark done</button>
                        </>
                      )
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setMessage(null); setEditing(r); }} className={pill}>Edit</button>
                    <button
                      type="button"
                      onClick={() => setDeleting(r)}
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
        <MedicalForm
          target={{ kind: "bird", birdId, birdLabel }}
          record={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); setMessage(msg ?? null); router.refresh(); }}
        />
      ) : null}

      {deleting ? (
        <Modal title="Delete medical record?" subtitle={`${recordHeading(deleting)}, ${deleting.date}`} onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
            {deleting.batchSize && deleting.batchSize > 1
              ? `This record was logged for ${deleting.batchSize} birds at once.`
              : "This can't be undone."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDeleting(null)} className={pill}>Cancel</button>
            {deleting.batchSize && deleting.batchSize > 1 ? (
              <button type="button" onClick={() => void remove(deleting, true)} className="text-xs px-3 py-1.5 rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition">
                Delete for all {deleting.batchSize} birds
              </button>
            ) : null}
            <button type="button" onClick={() => void remove(deleting, false)} className="text-xs px-3 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition">
              {deleting.batchSize && deleting.batchSize > 1 ? "Delete for this bird only" : "Delete"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
