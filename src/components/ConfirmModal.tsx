"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-4">
        <h3 className="text-lg font-semibold text-slate-50 mb-2">{title}</h3>
        <p className="text-sm text-slate-300 mb-4">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-full border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-full bg-red-600 hover:bg-red-500 text-white transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
