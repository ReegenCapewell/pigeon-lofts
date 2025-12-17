"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

export default function DeleteLoftButton({
  loftId,
  loftLabel,
}: {
  loftId: string;
  loftLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/lofts?id=${encodeURIComponent(loftId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to delete loft");
      }

      setOpen(false);
      // If you're deleting from within a loft dashboard, send back to /lofts
      router.replace("/lofts");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete loft");
    } finally {
      setSaving(false);
    }
  }

  const baseMessage = loftLabel
    ? `Delete ${loftLabel}? Birds in this loft will become unassigned. This action cannot be undone.`
    : "Birds in this loft will become unassigned. This action cannot be undone.";

  const message = error ? `${baseMessage}\n\n${error}` : baseMessage;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="text-sm px-4 py-2 rounded-full border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-400 transition"
      >
        Delete
      </button>

      <ConfirmModal
        open={open}
        title="Delete loft?"
        message={message}
        confirmLabel={saving ? "Deleting…" : "Delete loft"}
        onCancel={() => {
          if (!saving) {
            setOpen(false);
            setError(null);
          }
        }}
        onConfirm={onConfirm}
      />
    </>
  );
}
