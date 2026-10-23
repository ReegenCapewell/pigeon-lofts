"use client";

// Centered dialog with a dimmed backdrop. `size` widens it for longer forms.
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const width = size === "xl" ? "max-w-2xl" : size === "lg" ? "max-w-lg" : "max-w-md";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${width} max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 shadow-2xl shadow-black/10 dark:shadow-black/50`}
      >
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{subtitle}</p> : <div className="mb-4" />}
        {children}
      </div>
    </div>
  );
}
