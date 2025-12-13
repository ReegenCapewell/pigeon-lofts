"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";

export default function DeleteLoftButton({ loftId }: { loftId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function onDelete() {
    const res = await fetch(`/api/lofts?id=${encodeURIComponent(loftId)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to delete loft.");
      return;
    }

    setOpen(false);
    router.push("/lofts");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm px-4 py-2 rounded-full border border-red-900/50 text-red-300 hover:bg-red-950/40 transition"
      >
        Delete loft
      </button>

      <ConfirmModal
        open={open}
        title="Delete loft?"
        message="Birds in this loft will become unassigned. This action cannot be undone."
        confirmLabel="Delete loft"
        onCancel={() => setOpen(false)}
        onConfirm={onDelete}
      />
    </>
  );
}
