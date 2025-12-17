"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";

export default function DeleteBirdButton({
  birdId,
  birdLabel,
}: {
  birdId: string;
  birdLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/birds?id=${encodeURIComponent(birdId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to delete bird");
      }

      setOpen(false);
      router.replace("/birds");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete bird");
    } finally {
      setSaving(false);
    }
  }

  const base =
    birdLabel
      ? `Delete ${birdLabel}? This action cannot be undone.`
      : "This action cannot be undone.";

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
        title="Delete bird?"
        message={base + (error ? `\n\n${error}` : "")}
        confirmLabel={saving ? "Deleting…" : "Delete bird"}
        onCancel={() => {
          if (!saving) setOpen(false);
        }}
        onConfirm={onConfirm}
      />
    </>
  );
}
