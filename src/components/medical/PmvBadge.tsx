import type { PmvStatus } from "@/lib/medical";

const STYLES: Record<PmvStatus["state"], string> = {
  valid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "due-soon": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  none: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const TEXT: Record<PmvStatus["state"], string> = {
  valid: "PMV ✓",
  "due-soon": "PMV due soon",
  expired: "PMV overdue",
  none: "No PMV",
};

// Compact PMV vaccination status pill for lists and headers.
export default function PmvBadge({ status }: { status: PmvStatus }) {
  const title =
    status.state === "none"
      ? "No PMV vaccination recorded"
      : `PMV given ${status.lastGiven}, valid until ${status.validUntil}`;
  return (
    <span title={title} className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[10px] font-medium ${STYLES[status.state]}`}>
      {TEXT[status.state]}
    </span>
  );
}
