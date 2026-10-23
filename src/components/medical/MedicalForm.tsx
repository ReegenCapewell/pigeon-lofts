"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { addMonths, formatDob, parseDay } from "@/lib/dateOfBirth";
import {
  CONDITIONS,
  CONDITION_SCORES,
  MEDICAL_TYPE_LABELS,
  METHODS,
  OUTCOMES,
  PMV_DEFAULT_MONTHS,
  VACCINES,
  type MedicalRecordDTO,
  type MedicalType,
} from "@/lib/medical";

const inputClass =
  "w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 transition text-sm";
const labelClass = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5";

export type BulkBird = { id: string; ring: string; name: string | null; loftId: string | null; loftName: string | null };

type Target =
  | { kind: "bird"; birdId: string; birdLabel: string }
  | { kind: "bulk"; lofts: { id: string; name: string }[]; birds: BulkBird[] };

type Values = Record<string, string>;

function initial(r: MedicalRecordDTO | null): Values {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return {
    type: r?.type ?? "VACCINATION",
    date: s(r?.date),
    endDate: s(r?.endDate),
    nextDueDate: s(r?.nextDueDate),
    category: s(r?.category),
    title: s(r?.title),
    product: s(r?.product),
    batchNumber: s(r?.batchNumber),
    dose: s(r?.dose),
    method: s(r?.method),
    vet: s(r?.vet),
    outcome: s(r?.outcome),
    weight: s(r?.weightGrams),
    condition: s(r?.condition),
    notes: s(r?.notes),
  };
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: Record<string, string>; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{placeholder}</option>
      {Object.entries(options).map(([k, label]) => (
        <option key={k} value={k}>{label}</option>
      ))}
    </select>
  );
}

export default function MedicalForm({
  target,
  record,
  onClose,
  onSaved,
}: {
  target: Target;
  record: MedicalRecordDTO | null; // editing one bird's copy, or null to add
  onClose: () => void;
  onSaved: (message?: string) => void;
}) {
  const [v, setV] = useState<Values>(() => initial(record));
  const [dueTouched, setDueTouched] = useState(!!record);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk targeting
  const bulk = target.kind === "bulk" ? target : null;
  const [targetMode, setTargetMode] = useState<"loft" | "birds">("loft");
  const [loftId, setLoftId] = useState(bulk?.lofts[0]?.id ?? "");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const type = v.type as MedicalType;
  const setField = (k: string, value: string) => {
    setV((prev) => {
      const next = { ...prev, [k]: value };
      // Suggest the PMV booster date until the user sets one themselves.
      if (!dueTouched && next.type === "VACCINATION" && next.category === "PMV" && (k === "date" || k === "category")) {
        const d = parseDay(next.date, { label: "Date", allowFuture: true });
        next.nextDueDate = d.error === null ? formatDob(addMonths(d.date, PMV_DEFAULT_MONTHS)) : prev.nextDueDate;
      }
      return next;
    });
  };
  const bind = (k: string) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setField(k, e.target.value),
  });

  const loftBirdCount = bulk ? bulk.birds.filter((b) => b.loftId === loftId).length : 0;
  const filteredBirds = useMemo(() => {
    if (!bulk) return [];
    const q = search.trim().toLowerCase();
    return bulk.birds.filter((b) => !q || b.ring.toLowerCase().includes(q) || (b.name ?? "").toLowerCase().includes(q));
  }, [bulk, search]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let targetBody: Record<string, unknown> = {};
    if (target.kind === "bird") targetBody = { birdIds: [target.birdId] };
    else if (targetMode === "loft") {
      if (!loftId) return setError("Choose a loft.");
      if (!loftBirdCount) return setError("That loft has no birds.");
      targetBody = { loftId };
    } else {
      if (!picked.size) return setError("Tick at least one bird.");
      targetBody = { birdIds: [...picked] };
    }

    setSaving(true);
    try {
      const res = await fetch(record ? `/api/medical/${record.id}` : "/api/medical", {
        method: record ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record ? v : { ...v, ...targetBody }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; created?: number; skipped?: string[] } | null;
      if (!res.ok) return setError(data?.error || "Couldn't save the record. Please try again.");
      let message: string | undefined;
      if (data?.created && data.created > 1) message = `Logged for ${data.created} birds.`;
      if (data?.skipped?.length) {
        message = `${message ?? "Logged."} Skipped ${data.skipped.length} bird${data.skipped.length > 1 ? "s" : ""} born after that date (${data.skipped.slice(0, 5).join(", ")}${data.skipped.length > 5 ? "…" : ""}).`;
      }
      onSaved(message);
    } catch {
      setError("Couldn't save the record. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const dateLabel = type === "TREATMENT" ? "Start date *" : type === "VACCINATION" ? "Date given *" : "Date *";

  return (
    <Modal
      title={record ? "Edit medical record" : "Add medical record"}
      subtitle={target.kind === "bird" ? target.birdLabel : record ? undefined : "Log it for a whole loft, several birds, or one bird."}
      onClose={() => !saving && onClose()}
      size="xl"
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Type */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900">
          {(Object.keys(MEDICAL_TYPE_LABELS) as MedicalType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setField("type", t); setError(null); }}
              className={`text-xs font-medium px-2 py-2 rounded-xl transition ${
                type === t
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {MEDICAL_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Who it's for (bulk only) */}
        {bulk && !record ? (
          <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200">
                <input type="radio" checked={targetMode === "loft"} onChange={() => setTargetMode("loft")} className="accent-emerald-500" />
                Whole loft
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200">
                <input type="radio" checked={targetMode === "birds"} onChange={() => setTargetMode("birds")} className="accent-emerald-500" />
                Choose birds
              </label>
            </div>
            {targetMode === "loft" ? (
              bulk.lofts.length ? (
                <div>
                  <select value={loftId} onChange={(e) => setLoftId(e.target.value)} className={inputClass}>
                    {bulk.lofts.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                    {loftBirdCount} bird{loftBirdCount === 1 ? "" : "s"} in this loft. Each gets its own copy of the record.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">You have no lofts yet. Choose birds instead.</p>
              )
            ) : (
              <div>
                <div className="flex gap-2 mb-2">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass} placeholder="Search ring or name…" />
                  <button
                    type="button"
                    onClick={() => setPicked(new Set(filteredBirds.length && filteredBirds.every((b) => picked.has(b.id)) ? [] : filteredBirds.map((b) => b.id)))}
                    className="shrink-0 text-xs px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 transition"
                  >
                    {filteredBirds.length && filteredBirds.every((b) => picked.has(b.id)) ? "Clear" : "Select all"}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBirds.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No birds match.</p>
                  ) : (
                    filteredBirds.map((b) => (
                      <label key={b.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900">
                        <input
                          type="checkbox"
                          checked={picked.has(b.id)}
                          onChange={(e) => {
                            const next = new Set(picked);
                            if (e.target.checked) next.add(b.id);
                            else next.delete(b.id);
                            setPicked(next);
                          }}
                          className="h-4 w-4 accent-emerald-500"
                        />
                        <span className="text-slate-800 dark:text-slate-100">
                          {b.ring}
                          {b.name ? <span className="text-slate-500 dark:text-slate-400"> – {b.name}</span> : null}
                        </span>
                        <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">{b.loftName ?? "Unassigned"}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">{picked.size} selected</p>
              </div>
            )}
          </section>
        ) : null}

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {type === "VACCINATION" ? (
            <div>
              <label className={labelClass}>Vaccine *</label>
              <Select value={v.category} onChange={(x) => setField("category", x)} options={VACCINES} placeholder="Choose…" />
            </div>
          ) : null}
          {type === "TREATMENT" ? (
            <div>
              <label className={labelClass}>Treatment for *</label>
              <Select value={v.category} onChange={(x) => setField("category", x)} options={CONDITIONS} placeholder="Choose…" />
            </div>
          ) : null}
          {(type === "VACCINATION" || type === "TREATMENT") && v.category === "OTHER" ? (
            <div>
              <label className={labelClass}>{type === "VACCINATION" ? "Vaccine name *" : "What for *"}</label>
              <input {...bind("title")} className={inputClass} maxLength={120} />
            </div>
          ) : null}
          {type === "ILLNESS" ? (
            <div className="sm:col-span-2">
              <label className={labelClass}>Symptoms / diagnosis *</label>
              <input {...bind("title")} className={inputClass} placeholder="e.g. Lethargic, green droppings" maxLength={120} />
            </div>
          ) : null}

          <div>
            <label className={labelClass}>{dateLabel}</label>
            <input {...bind("date")} className={inputClass} placeholder="dd/mm/yyyy" maxLength={10} />
          </div>
          {type === "TREATMENT" ? (
            <div>
              <label className={labelClass}>End date</label>
              <input {...bind("endDate")} className={inputClass} placeholder="dd/mm/yyyy" maxLength={10} />
            </div>
          ) : null}

          {type !== "HEALTH_CHECK" ? (
            <div>
              <label className={labelClass}>{type === "ILLNESS" ? "Medicine given" : type === "VACCINATION" ? "Product" : "Medicine"}</label>
              <input {...bind("product")} className={inputClass} placeholder={type === "VACCINATION" ? "e.g. Colombovac PMV" : "e.g. product name"} maxLength={120} />
            </div>
          ) : null}
          {type === "VACCINATION" ? (
            <div>
              <label className={labelClass}>Batch number</label>
              <input {...bind("batchNumber")} className={inputClass} maxLength={60} />
            </div>
          ) : null}
          {type === "VACCINATION" || type === "TREATMENT" ? (
            <>
              <div>
                <label className={labelClass}>Dose</label>
                <input {...bind("dose")} className={inputClass} placeholder="as directed on the product" maxLength={120} />
              </div>
              <div>
                <label className={labelClass}>How given</label>
                <Select value={v.method} onChange={(x) => setField("method", x)} options={METHODS} placeholder="Not set" />
              </div>
            </>
          ) : null}
          {type !== "HEALTH_CHECK" ? (
            <div>
              <label className={labelClass}>Vet / clinic</label>
              <input {...bind("vet")} className={inputClass} maxLength={120} />
            </div>
          ) : null}
          {type === "ILLNESS" ? (
            <div>
              <label className={labelClass}>Outcome</label>
              <Select value={v.outcome} onChange={(x) => setField("outcome", x)} options={OUTCOMES} placeholder="Not set" />
            </div>
          ) : null}
          {type === "HEALTH_CHECK" ? (
            <>
              <div>
                <label className={labelClass}>Weight (grams)</label>
                <input {...bind("weight")} className={inputClass} placeholder="e.g. 480" inputMode="numeric" />
              </div>
              <div>
                <label className={labelClass}>Condition</label>
                <Select value={v.condition} onChange={(x) => setField("condition", x)} options={CONDITION_SCORES} placeholder="Not set" />
              </div>
            </>
          ) : null}

          <div>
            <label className={labelClass}>Next due / follow-up</label>
            <input
              value={v.nextDueDate}
              onChange={(e) => { setDueTouched(true); setField("nextDueDate", e.target.value); }}
              className={inputClass}
              placeholder="dd/mm/yyyy (optional)"
              maxLength={10}
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              {type === "VACCINATION" && v.category === "PMV" && !dueTouched
                ? `Suggested: ${PMV_DEFAULT_MONTHS} months after the date given. Check the product's guidance.`
                : "Shows as a reminder when it's due."}
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea {...bind("notes")} className={`${inputClass} min-h-[4.5rem]`} maxLength={1000} />
        </div>

        {record?.batchId && (record.batchSize ?? 0) > 1 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            This record was logged for {record.batchSize} birds. Changes here only apply to this bird.
          </p>
        ) : null}

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
            {saving ? "Saving…" : record ? "Save" : "Add record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
